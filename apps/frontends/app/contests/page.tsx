"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { contestApi } from "../../lib/api";

// ---- Types -----------------------------------------------------------

interface Contest {
  id: string;
  name: string;
  description?: string;
  startTime?: string; // ISO date
  endTime?: string; // ISO date
  participantCount?: number;
  isOwner?: boolean; // assumed: server tells us if the current user created this contest
}

type ContestStatus = "upcoming" | "live" | "ended" | "unknown";
type Tab = "all" | "joined";

// ---- Helpers -----------------------------------------------------------

function getStatus(contest: Contest): ContestStatus {
  if (!contest.startTime || !contest.endTime) return "unknown";
  const now = Date.now();
  const start = new Date(contest.startTime).getTime();
  const end = new Date(contest.endTime).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return "unknown";
  if (now < start) return "upcoming";
  if (now > end) return "ended";
  return "live";
}

function formatDate(iso?: string) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function useCountdown(targetIso?: string) {
  const [label, setLabel] = useState("--:--:--");

  useEffect(() => {
    if (!targetIso) return;
    const target = new Date(targetIso).getTime();
    if (Number.isNaN(target)) return;

    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) {
        setLabel("00:00:00");
        return;
      }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1000);
      setLabel(
        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(
          s
        ).padStart(2, "0")}`
      );
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetIso]);

  return label;
}

const STATUS_META: Record<ContestStatus, { label: string; dot: string }> = {
  upcoming: { label: "Upcoming", dot: "var(--medium)" },
  live: { label: "Live", dot: "var(--easy)" },
  ended: { label: "Ended", dot: "var(--text-dim)" },
  unknown: { label: "Scheduled", dot: "var(--text-dim)" },
};

// ---- Page -----------------------------------------------------------

function ContestsListPage() {
  const [tab, setTab] = useState<Tab>("all");
  const [contests, setContests] = useState<Contest[]>([]);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", startTime: "", endTime: "" });

  const [pendingId, setPendingId] = useState<string | null>(null);

  // Keep track of joined contest ids regardless of which tab is active,
  // so the "Join / Leave" button is correct everywhere.
  const refreshJoined = useCallback(async () => {
    try {
      const data = await contestApi.getJoinedContests();
      const list: Contest[] = Array.isArray(data?.contests) ? data.contests : [];
      setJoinedIds(new Set(list.map((c) => c.id)));
      return list;
    } catch (err) {
      console.error(err);
      return [];
    }
  }, []);

  const fetchContests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === "joined") {
        const list = await refreshJoined();
        setContests(list);
      } else {
        const [data] = await Promise.all([contestApi.getContests(), refreshJoined()]);
        setContests(Array.isArray(data?.contests) ? data.contests : []);
      }
    } catch (err) {
      console.error(err);
      setError("Couldn't load contests. Try refreshing the page.");
    } finally {
      setLoading(false);
    }
  }, [tab, refreshJoined]);

  useEffect(() => {
    fetchContests();
  }, [fetchContests]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setCreateError("Give the contest a name.");
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      await contestApi.createContest({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        startTime: form.startTime ? new Date(form.startTime).toISOString() : undefined,
        endTime: form.endTime ? new Date(form.endTime).toISOString() : undefined,
      });
      setShowCreate(false);
      setForm({ name: "", description: "", startTime: "", endTime: "" });
      await fetchContests();
    } catch (err) {
      console.error(err);
      setCreateError("Couldn't create the contest. Check the details and try again.");
    } finally {
      setCreating(false);
    }
  }

  async function handleJoin(contest: Contest) {
    setPendingId(contest.id);
    try {
      await contestApi.joinContest({ contestId: contest.id });
      setJoinedIds((prev) => new Set(prev).add(contest.id));
    } catch (err) {
      console.error(err);
      window.alert("Couldn't join this contest. Try again in a moment.");
    } finally {
      setPendingId(null);
    }
  }

  async function handleLeave(contest: Contest) {
    if (!window.confirm(`Leave "${contest.name}"?`)) return;
    setPendingId(contest.id);
    try {
      await contestApi.leaveContest({ contestId: contest.id });
      setJoinedIds((prev) => {
        const next = new Set(prev);
        next.delete(contest.id);
        return next;
      });
      if (tab === "joined") {
        setContests((prev) => prev.filter((c) => c.id !== contest.id));
      }
    } catch (err) {
      console.error(err);
      window.alert("Couldn't leave this contest. Try again in a moment.");
    } finally {
      setPendingId(null);
    }
  }

  async function handleDelete(contest: Contest) {
    if (!window.confirm(`Delete "${contest.name}"? This can't be undone.`)) return;
    setPendingId(contest.id);
    try {
      await contestApi.deleteContest({ contestId: contest.id });
      setContests((prev) => prev.filter((c) => c.id !== contest.id));
    } catch (err) {
      console.error(err);
      window.alert("Couldn't delete this contest. Try again in a moment.");
    } finally {
      setPendingId(null);
    }
  }

  const emptyMessage =
    tab === "joined" ? "You haven't joined any contests yet." : "No contests yet.";

  return (
    <div className="page">
      <header className="topbar">
        <div>
          <p className="eyebrow">Arena</p>
          <h1>Contests</h1>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          New contest
        </button>
      </header>

      <div className="tabs">
        <button
          className={`tab ${tab === "all" ? "tab-active" : ""}`}
          onClick={() => setTab("all")}
        >
          All contests
        </button>
        <button
          className={`tab ${tab === "joined" ? "tab-active" : ""}`}
          onClick={() => setTab("joined")}
        >
          My contests
        </button>
      </div>

      {loading && (
        <div className="grid">
          {[0, 1, 2].map((i) => (
            <div className="card skeleton" key={i} aria-hidden="true">
              <div className="sk-line sk-title" />
              <div className="sk-line" />
              <div className="sk-line sk-short" />
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="state-block">
          <p>{error}</p>
          <button className="btn btn-ghost" onClick={fetchContests}>
            Try again
          </button>
        </div>
      )}

      {!loading && !error && contests.length === 0 && (
        <div className="state-block">
          <p>{emptyMessage}</p>
          {tab === "all" && (
            <button className="btn btn-ghost" onClick={() => setShowCreate(true)}>
              Start the first one
            </button>
          )}
        </div>
      )}

      {!loading && !error && contests.length > 0 && (
        <div className="grid">
          {contests.map((contest) => (
            <ContestCard
              key={contest.id}
              contest={contest}
              joined={joinedIds.has(contest.id)}
              pending={pendingId === contest.id}
              onJoin={() => handleJoin(contest)}
              onLeave={() => handleLeave(contest)}
              onDelete={contest.isOwner ? () => handleDelete(contest) : undefined}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <div className="overlay" onClick={() => !creating && setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>New contest</h2>
            <form onSubmit={handleCreate}>
              <label className="field">
                <span>Name</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Weekly Sprint #12"
                  autoFocus
                />
              </label>
              <label className="field">
                <span>Description</span>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What are people competing on?"
                  rows={3}
                />
              </label>
              <div className="field-row">
                <label className="field">
                  <span>Starts</span>
                  <input
                    type="datetime-local"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  />
                </label>
                <label className="field">
                  <span>Ends</span>
                  <input
                    type="datetime-local"
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  />
                </label>
              </div>

              {createError && <p className="error-text">{createError}</p>}

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowCreate(false)}
                  disabled={creating}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? "Creating…" : "Create contest"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .page {
          font-family: var(--font-body);
          background: var(--bg-base);
          color: var(--text-body);
          min-height: 100vh;
          padding: 48px 24px 80px;
        }

        .topbar {
          max-width: 960px;
          margin: 0 auto 28px;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 16px;
        }

        .eyebrow {
          margin: 0 0 6px;
          font-size: 12px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--purple-3);
          font-weight: 600;
        }

        h1 {
          margin: 0;
          font-family: var(--font-heading);
          font-size: 34px;
          font-weight: 600;
          letter-spacing: -0.01em;
          color: var(--text-heading);
        }

        .tabs {
          max-width: 960px;
          margin: 0 auto 32px;
          display: flex;
          gap: 4px;
          background: var(--bg-surface);
          border: 1px solid var(--border-card);
          border-radius: var(--radius-pill);
          padding: 4px;
          width: fit-content;
        }
        .tab {
          border: none;
          background: transparent;
          color: var(--text-muted);
          font-family: var(--font-body);
          font-size: 13px;
          font-weight: 600;
          padding: 8px 18px;
          border-radius: var(--radius-pill);
          cursor: pointer;
          transition: color 0.15s ease, background 0.15s ease;
        }
        .tab-active {
          background: linear-gradient(135deg, var(--purple-1), var(--purple-2));
          color: #fff;
        }

        .btn {
          border: 1px solid var(--border-card);
          background: var(--bg-elevated);
          color: var(--text-heading);
          padding: 10px 18px;
          border-radius: var(--radius-md);
          font-size: 14px;
          font-weight: 600;
          font-family: var(--font-body);
          cursor: pointer;
          transition: transform 0.1s ease, opacity 0.15s ease, box-shadow 0.15s ease;
        }
        .btn:hover {
          opacity: 0.9;
        }
        .btn:active {
          transform: scale(0.98);
        }
        .btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .btn-primary {
          background: linear-gradient(135deg, var(--purple-1), var(--purple-2));
          border-color: transparent;
          color: #fff;
          box-shadow: var(--shadow-btn);
        }
        .btn-ghost {
          background: transparent;
          border-color: var(--border-soft);
          color: var(--text-body);
        }

        .grid {
          max-width: 960px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
        }

        .state-block {
          max-width: 960px;
          margin: 0 auto;
          text-align: center;
          padding: 60px 20px;
          color: var(--text-muted);
        }
        .state-block p {
          margin-bottom: 16px;
        }

        .card {
          background: var(--bg-card);
          border: 1px solid var(--border-card);
          border-radius: var(--radius-lg);
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .skeleton {
          gap: 10px;
        }
        .sk-line {
          height: 12px;
          border-radius: 4px;
          background: linear-gradient(90deg, var(--bg-elevated) 25%, var(--bg-surface) 37%, var(--bg-elevated) 63%);
          background-size: 400% 100%;
          animation: shimmer 1.4s ease infinite;
        }
        .sk-title {
          height: 18px;
          width: 60%;
        }
        .sk-short {
          width: 40%;
        }
        @keyframes shimmer {
          0% { background-position: 100% 50%; }
          100% { background-position: 0 50%; }
        }

        .error-text {
          color: var(--hard);
          font-size: 13px;
          margin: 4px 0 0;
        }

        .overlay {
          position: fixed;
          inset: 0;
          background: rgba(11, 11, 20, 0.72);
          backdrop-filter: blur(2px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          z-index: 50;
        }

        .modal {
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-panel);
          padding: 28px;
          width: 100%;
          max-width: 440px;
          max-height: 85vh;
          overflow-y: auto;
        }
        .modal h2 {
          margin: 0 0 16px;
          font-family: var(--font-heading);
          font-size: 22px;
          color: var(--text-heading);
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 14px;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-heading);
        }
        .field-row {
          display: flex;
          gap: 12px;
        }
        .field-row .field {
          flex: 1;
        }
        input,
        textarea {
          font-family: inherit;
          font-size: 14px;
          font-weight: 400;
          background: var(--bg-input);
          color: var(--text-heading);
          border: 1px solid var(--border-card);
          border-radius: var(--radius-sm);
          padding: 9px 11px;
          resize: vertical;
        }
        input::placeholder,
        textarea::placeholder {
          color: var(--text-dim);
        }
        input:focus,
        textarea:focus {
          outline: 2px solid var(--border-focus);
          outline-offset: 1px;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 18px;
        }

        @media (prefers-reduced-motion: reduce) {
          .sk-line {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}

// ---- Card -----------------------------------------------------------

function ContestCard({
  contest,
  joined,
  pending,
  onJoin,
  onLeave,
  onDelete,
}: {
  contest: Contest;
  joined: boolean;
  pending: boolean;
  onJoin: () => void;
  onLeave: () => void;
  onDelete?: () => void;
}) {
  const status = getStatus(contest);
  const meta = STATUS_META[status];
  const countdown = useCountdown(status === "upcoming" ? contest.startTime : contest.endTime);

  return (
    <div className="ccard">
      <div className="ccard-top">
        <span className="status">
          <span className="dot" />
          {meta.label}
        </span>
        {(status === "upcoming" || status === "live") && (
          <span className="countdown mono">{countdown}</span>
        )}
      </div>

      <Link href={`/contests/${contest.id}`} className="title-link">
        <h2>{contest.name}</h2>
      </Link>
      {contest.description && <p className="desc">{contest.description}</p>}

      <div className="ccard-meta">
        {formatDate(contest.startTime) && (
          <span>{formatDate(contest.startTime)} → {formatDate(contest.endTime) || "—"}</span>
        )}
        {typeof contest.participantCount === "number" && (
          <span>{contest.participantCount} joined</span>
        )}
      </div>

      <div className="ccard-actions">
        <Link href={`/contests/${contest.id}`} className="link-btn">
          View details
        </Link>
        <div className="ccard-buttons">
          {onDelete && (
            <button className="btn btn-ghost btn-sm btn-danger" onClick={onDelete} disabled={pending}>
              Delete
            </button>
          )}
          {joined ? (
            <button className="btn btn-ghost btn-sm" onClick={onLeave} disabled={pending}>
              {pending ? "…" : "Leave"}
            </button>
          ) : (
            <button
              className="btn btn-primary btn-sm"
              onClick={onJoin}
              disabled={pending || status === "ended"}
            >
              {pending ? "Joining…" : status === "ended" ? "Ended" : "Join"}
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        .ccard {
          background: var(--bg-card);
          border: 1px solid var(--border-card);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-card);
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .ccard:hover {
          border-color: var(--border);
          box-shadow: var(--shadow-card), var(--shadow-glow);
        }
        .ccard-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .status {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: ${meta.dot};
          box-shadow: 0 0 6px ${meta.dot};
        }
        .countdown {
          font-size: 13px;
          color: var(--text-muted);
        }
        .mono {
          font-family: var(--font-mono);
        }
        .title-link {
          text-decoration: none;
        }
        h2 {
          margin: 0;
          font-family: var(--font-heading);
          font-size: 19px;
          font-weight: 600;
          color: var(--text-heading);
        }
        .title-link:hover h2 {
          color: var(--purple-3);
        }
        .desc {
          margin: 0;
          font-size: 14px;
          color: var(--text-body);
          line-height: 1.45;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .ccard-meta {
          display: flex;
          flex-direction: column;
          gap: 2px;
          font-size: 12px;
          color: var(--text-muted);
        }
        .ccard-actions {
          margin-top: 6px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }
        .ccard-buttons {
          display: flex;
          gap: 8px;
        }
        .link-btn {
          font-size: 13px;
          font-weight: 600;
          color: var(--purple-3);
          text-decoration: underline;
        }
        .btn {
          border: 1px solid var(--border-card);
          background: var(--bg-elevated);
          color: var(--text-heading);
          border-radius: var(--radius-md);
          font-family: var(--font-body);
          font-weight: 600;
          cursor: pointer;
        }
        .btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .btn-primary {
          background: linear-gradient(135deg, var(--purple-1), var(--purple-2));
          border-color: transparent;
          color: #fff;
        }
        .btn-ghost {
          background: transparent;
        }
        .btn-danger {
          color: var(--hard);
          border-color: rgba(239, 68, 68, 0.3);
        }
        .btn-sm {
          padding: 7px 14px;
          font-size: 13px;
        }
      `}</style>
    </div>
  );
}

export default ContestsListPage;
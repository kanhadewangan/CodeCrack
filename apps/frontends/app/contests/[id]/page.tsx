"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { contestApi } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import {
  createContestSocket,
  type ContestEndedPayload,
  type ContestStartedPayload,
  type LeaderboardPayload,
  type LeaderboardRow,
} from "../../../lib/contestSocket";

// ---- Types -----------------------------------------------------------

interface Contest {
  id: string;
  name: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  actualStartTime?: string;
  actualEndTime?: string;
  status?: "DRAFT" | "SCHEDULED" | "RUNNING" | "ENDED" | "CANCELLED";
  participantCount?: number;
  isOwner?: boolean;
  joined?: boolean;
}

interface Problem {
  id: string;
  title: string;
  difficulty?: "EASY" | "MEDIUM" | "HARD" | "easy" | "medium" | "hard";
  points?: number;
}

interface Participant {
  id: string;
  userId?: string;
  name?: string;
  username?: string;
  users?: {
    email?: string;
  };
  score?: number;
}

type ContestStatus = "upcoming" | "live" | "ended" | "unknown";

// ---- Helpers -----------------------------------------------------------

function getStatus(contest?: Contest | null): ContestStatus {
  if (contest?.status === "RUNNING") return "live";
  if (contest?.status === "ENDED" || contest?.status === "CANCELLED") return "ended";
  if (!contest?.startTime || !contest?.endTime) return "unknown";
  const now = Date.now();
  const start = new Date(contest.actualStartTime ?? contest.startTime).getTime();
  const end = new Date(contest.actualEndTime ?? contest.endTime).getTime();
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

const STATUS_META: Record<ContestStatus, { label: string; dot: string }> = {
  upcoming: { label: "Upcoming", dot: "var(--medium)" },
  live: { label: "Live", dot: "var(--easy)" },
  ended: { label: "Ended", dot: "var(--text-dim)" },
  unknown: { label: "Scheduled", dot: "var(--text-dim)" },
};

const DIFFICULTY_COLOR: Record<string, string> = {
  easy: "var(--easy)",
  medium: "var(--medium)",
  hard: "var(--hard)",
};
const DIFFICULTY_BG: Record<string, string> = {
  easy: "var(--easy-bg)",
  medium: "var(--medium-bg)",
  hard: "var(--hard-bg)",
};

// ---- Page -----------------------------------------------------------

function ContestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const contestId = String(params?.id ?? "");
  const { user } = useAuth();

  const [contest, setContest] = useState<Contest | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [socketState, setSocketState] = useState<"offline" | "connecting" | "live">("offline");
  const [lastLeaderboardUpdate, setLastLeaderboardUpdate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [showAddProblem, setShowAddProblem] = useState(false);
  const [problemForm, setProblemForm] = useState({ problemId: "", points: "" });
  const [addError, setAddError] = useState<string | null>(null);
  const [addingProblem, setAddingProblem] = useState(false);
  const [removingProblemId, setRemovingProblemId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!contestId) return;
    setLoading(true);
    setError(null);
    try {
      const [details, problemsData, participantsData, leaderboardData] = await Promise.all([
        contestApi.getContestDetails(contestId),
        contestApi.getContestProblems(contestId),
        contestApi.getContestParticipants(contestId),
        contestApi.getContestLeaderboard(contestId).catch(() => ({ leaderboard: [] })),
      ]);
      setContest(details?.contest ?? details ?? null);
      if (leaderboardData?.leaderboard) setLeaderboard(leaderboardData.leaderboard);
      const mappedProblems = Array.isArray(problemsData?.contestProblems) ? problemsData.contestProblems.map((cp: any) => cp.problems).filter(Boolean) : [];
      setProblems(mappedProblems);
      const parts = Array.isArray(participantsData?.participants) ? participantsData.participants : [];
      setParticipants(parts);
      
      const isJoined = Boolean(user?.id && parts.some((p: any) => p.userId === user.id));
      setContest({ ...(details?.contest ?? details ?? null), joined: isJoined });
    } catch (err) {
      console.error(err);
      setError("Couldn't load this contest.");
    } finally {
      setLoading(false);
    }
  }, [contestId, user?.id]);

  useEffect(() => {
    load();
  }, [load, user]);

  useEffect(() => {
    if (!contestId || !contest?.joined || typeof window === "undefined") {
      setSocketState("offline");
      return;
    }

    const token = localStorage.getItem("oj_token");
    if (!token) {
      setSocketState("offline");
      return;
    }

    setSocketState("connecting");
    const socket = createContestSocket(token);

    const syncLeaderboard = () => {
      socket.emit("leaderboard:sync", { contestId, topN: 50 }, (payload: LeaderboardPayload) => {
        if (payload?.rankings) {
          setLeaderboard(payload.rankings);
          setLastLeaderboardUpdate(payload.updatedAt);
        }
      });
    };

    socket.on("connect", () => {
      setSocketState("live");
      socket.emit("join_contest", { contestId }, () => syncLeaderboard());
    });

    socket.on("disconnect", () => {
      setSocketState("connecting");
    });

    socket.io.on("reconnect", syncLeaderboard);

    socket.on("leaderboard:update", (payload: LeaderboardPayload) => {
      if (payload.contestId !== contestId) return;
      setLeaderboard(payload.rankings);
      setLastLeaderboardUpdate(payload.updatedAt);
    });

    socket.on("contest:started", (payload: ContestStartedPayload) => {
      if (payload.contestId !== contestId) return;
      setContest((current) =>
        current
          ? {
              ...current,
              status: "RUNNING",
              actualStartTime: payload.actualStartTime,
              actualEndTime: payload.actualEndTime,
            }
          : current,
      );
      syncLeaderboard();
    });

    socket.on("contest:ended", (payload: ContestEndedPayload) => {
      if (payload.contestId !== contestId) return;
      setContest((current) =>
        current
          ? {
              ...current,
              status: "ENDED",
              actualEndTime: payload.endedAt,
            }
          : current,
      );
      setLeaderboard(payload.finalRankings);
      setLastLeaderboardUpdate(payload.endedAt);
    });

    socket.on("contest:error", (payload: { message?: string }) => {
      console.error("Contest socket error:", payload);
      setSocketState("offline");
    });

    return () => {
      socket.emit("leave_contest", { contestId });
      socket.disconnect();
      setSocketState("offline");
    };
  }, [contestId, contest?.joined]);

  async function handleJoin() {
    if (!contest) return;
    setBusy(true);
    try {
      await contestApi.joinContest({ contestId: contest.id });
      setContest({ ...contest, joined: true });
      load(); // refresh participants
    } catch (err) {
      console.error(err);
      window.alert("Couldn't join this contest. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  async function handleLeave() {
    if (!contest) return;
    if (!window.confirm(`Leave "${contest.name}"?`)) return;
    setBusy(true);
    try {
      await contestApi.leaveContest({ contestId: contest.id, userId: user?.id });
      setContest({ ...contest, joined: false });
      load(); // refresh participants
    } catch (err) {
      console.error(err);
      window.alert("Couldn't leave this contest. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!contest) return;
    if (!window.confirm(`Delete "${contest.name}"? This can't be undone.`)) return;
    setBusy(true);
    try {
      await contestApi.deleteContest({ contestId: contest.id });
      router.push("/contests");
    } catch (err) {
      console.error(err);
      window.alert("Couldn't delete this contest. Try again in a moment.");
      setBusy(false);
    }
  }

  async function handleStart() {
    if (!contest) return;
    setBusy(true);
    try {
      await contestApi.startContest(contest.id);
      await load();
    } catch (err) {
      console.error(err);
      window.alert("Couldn't start this contest.");
    } finally {
      setBusy(false);
    }
  }

  async function handleAddProblem(e: React.FormEvent) {
    e.preventDefault();
    if (!problemForm.problemId.trim()) {
      setAddError("Enter a problem ID.");
      return;
    }
    setAddingProblem(true);
    setAddError(null);
    try {
      await contestApi.addProblemToContest({
        contestId,
        problemId: problemForm.problemId.trim(),
        points: problemForm.points ? Number(problemForm.points) : undefined,
      });
      setShowAddProblem(false);
      setProblemForm({ problemId: "", points: "" });
      const problemsData = await contestApi.getContestProblems(contestId);
      const mappedProblems = Array.isArray(problemsData?.contestProblems) ? problemsData.contestProblems.map((cp: any) => cp.problems).filter(Boolean) : [];
      setProblems(mappedProblems);
    } catch (err) {
      console.error(err);
      setAddError("Couldn't add that problem. Check the ID and try again.");
    } finally {
      setAddingProblem(false);
    }
  }

  async function handleRemoveProblem(problem: Problem) {
    if (!window.confirm(`Remove "${problem.title}" from this contest?`)) return;
    setRemovingProblemId(problem.id);
    try {
      await contestApi.removeProblemFromContest({ contestId, problemId: problem.id });
      setProblems((prev) => prev.filter((p) => p.id !== problem.id));
    } catch (err) {
      console.error(err);
      window.alert("Couldn't remove that problem. Try again in a moment.");
    } finally {
      setRemovingProblemId(null);
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="state-block">Loading contest…</div>
        <style jsx>{pageStyles}</style>
      </div>
    );
  }

  if (error || !contest) {
    return (
      <div className="page">
        <div className="state-block">
          <p>{error || "Contest not found."}</p>
          <button className="btn btn-ghost" onClick={load}>
            Try again
          </button>
        </div>
        <style jsx>{pageStyles}</style>
      </div>
    );
  }

  const status = getStatus(contest);
  const meta = STATUS_META[status];
  const formattedUpdate = formatDate(lastLeaderboardUpdate ?? undefined);

  return (
    <div className="page">
      <button className="back-link" onClick={() => router.push("/contests")}>
        ← All contests
      </button>

      <header className="hero">
        <div className="hero-top">
          <span className="status">
            <span className="dot" />
            {meta.label}
          </span>
          {contest.isOwner && (
            <div className="admin-actions">
              <button className="btn btn-ghost btn-sm" onClick={handleStart} disabled={busy || status === "live" || status === "ended"}>
                Start contest
              </button>
              <button className="btn btn-ghost btn-sm btn-danger" onClick={handleDelete} disabled={busy || status === "live"}>
                Delete contest
              </button>
            </div>
          )}
        </div>

        <h1>{contest.name}</h1>
        {contest.description && <p className="description">{contest.description}</p>}

        <div className="hero-meta">
          {formatDate(contest.startTime) && (
            <span>
              {formatDate(contest.actualStartTime ?? contest.startTime)} → {formatDate(contest.actualEndTime ?? contest.endTime) || "—"}
            </span>
          )}
          {typeof contest.participantCount === "number" && (
            <span>{contest.participantCount} participants</span>
          )}
        </div>

        <div className="hero-actions">
          {contest.joined ? (
            <button className="btn btn-ghost" onClick={handleLeave} disabled={busy}>
              Leave contest
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={handleJoin}
              disabled={busy || status === "ended"}
            >
              {status === "ended" ? "Contest ended" : "Join contest"}
            </button>
          )}
        </div>
      </header>

      <section className="section">
        <div className="section-head">
          <h2>Problems</h2>
          {contest.isOwner && status !== "live" && status !== "ended" && (
            <button className="btn btn-ghost btn-sm" onClick={() => setShowAddProblem(true)}>
              Add problem
            </button>
          )}
        </div>

        {problems.length === 0 && <p className="muted">No problems added yet.</p>}

        {problems.length > 0 && (
          <ul className="problem-list">
            {problems.map((problem) => (
              <li key={problem.id}>
                <div className="problem-info">
                  <span className="problem-title">{problem.title}</span>
                  {problem.difficulty && (
                    <span
                      className="difficulty-pill"
                      style={{
                        color: DIFFICULTY_COLOR[problem.difficulty.toLowerCase()],
                        background: DIFFICULTY_BG[problem.difficulty.toLowerCase()],
                      }}
                    >
                      {problem.difficulty}
                    </span>
                  )}
                </div>
                <div className="problem-actions">
                  {typeof problem.points === "number" && (
                    <span className="mono points">{problem.points} pts</span>
                  )}
                  {contest.joined && status === "live" && (
                    <Link className="link-btn" href={`/problems/${problem.id}?contestId=${contest.id}`}>
                      Solve
                    </Link>
                  )}
                  {contest.isOwner && status !== "live" && status !== "ended" && (
                    <button
                      className="link-btn danger"
                      onClick={() => handleRemoveProblem(problem)}
                      disabled={removingProblemId === problem.id}
                    >
                      {removingProblemId === problem.id ? "Removing…" : "Remove"}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Leaderboard</h2>
          <span className={`socket-pill socket-${socketState}`}>
            {socketState === "live" ? "Live" : socketState === "connecting" ? "Connecting" : "Offline"}
          </span>
        </div>
        {formattedUpdate && <p className="leaderboard-meta">Updated {formattedUpdate}</p>}
        {leaderboard.length === 0 ? (
          <p className="muted">No leaderboard data available.</p>
        ) : (
          <ul className="participant-list">
            {leaderboard.map((lb) => (
              <li key={lb.userId}>
                <span>
                  <strong>#{lb.rank}</strong> &nbsp;
                  {lb.username || lb.userId}
                </span>
                <span className="mono points">{lb.score} pts · {lb.penalty} pen</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Participants</h2>
        </div>
        {participants.length === 0 && <p className="muted">No one has joined yet.</p>}
        {participants.length > 0 && (
          <ul className="participant-list">
            {participants.map((p) => (
              <li key={p.id}>
                <span>{p.username || p.name || p.users?.email || p.userId || p.id}</span>
                {typeof p.score === "number" && <span className="mono">{p.score}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {showAddProblem && (
        <div className="overlay" onClick={() => !addingProblem && setShowAddProblem(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add a problem</h2>
            <form onSubmit={handleAddProblem}>
              <label className="field">
                <span>Problem ID</span>
                <input
                  value={problemForm.problemId}
                  onChange={(e) => setProblemForm({ ...problemForm, problemId: e.target.value })}
                  placeholder="e.g. two-sum"
                  autoFocus
                />
              </label>
              <label className="field">
                <span>Points (optional)</span>
                <input
                  type="number"
                  value={problemForm.points}
                  onChange={(e) => setProblemForm({ ...problemForm, points: e.target.value })}
                  placeholder="100"
                />
              </label>

              {addError && <p className="error-text">{addError}</p>}

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowAddProblem(false)}
                  disabled={addingProblem}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={addingProblem}>
                  {addingProblem ? "Adding…" : "Add problem"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        ${pageStyles}

        .dot {
          background: ${meta.dot};
          box-shadow: 0 0 6px ${meta.dot};
        }
      `}</style>
    </div>
  );
}

const pageStyles = `
  .page {
    font-family: var(--font-body);
    background: var(--bg-base);
    color: var(--text-body);
    min-height: 100vh;
    padding: 40px 24px 80px;
  }

  .back-link {
    display: block;
    max-width: 720px;
    margin: 0 auto 20px;
    background: none;
    border: none;
    color: var(--text-muted);
    font-family: var(--font-body);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    padding: 0;
  }
  .back-link:hover {
    color: var(--purple-3);
  }

  .state-block {
    max-width: 720px;
    margin: 80px auto 0;
    text-align: center;
    color: var(--text-muted);
  }
  .state-block p {
    margin-bottom: 16px;
  }

  .hero {
    max-width: 720px;
    margin: 0 auto 32px;
    background: var(--bg-card);
    border: 1px solid var(--border-card);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-card);
    padding: 28px;
  }
  .hero-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
  }
  .admin-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: flex-end;
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
  }
  h1 {
    margin: 0 0 8px;
    font-family: var(--font-heading);
    font-size: 30px;
    font-weight: 600;
    color: var(--text-heading);
  }
  .description {
    margin: 0 0 16px;
    font-size: 15px;
    line-height: 1.55;
    color: var(--text-body);
  }
  .hero-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    font-size: 13px;
    color: var(--text-muted);
    margin-bottom: 20px;
  }
  .hero-actions {
    display: flex;
    gap: 10px;
  }

  .section {
    max-width: 720px;
    margin: 0 auto 24px;
    background: var(--bg-card);
    border: 1px solid var(--border-card);
    border-radius: var(--radius-lg);
    padding: 24px;
  }
  .section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
  }
  .section h2 {
    margin: 0;
    font-family: var(--font-heading);
    font-size: 18px;
    font-weight: 600;
    color: var(--text-heading);
  }
  .muted {
    color: var(--text-muted);
    font-size: 14px;
    margin: 0;
  }
  .mono {
    font-family: var(--font-mono);
  }

  .problem-list,
  .participant-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .problem-list li,
  .participant-list li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px;
    background: var(--bg-surface);
    border: 1px solid var(--border-card);
    border-radius: var(--radius-md);
    font-size: 14px;
  }
  .leaderboard-meta {
    color: var(--text-muted);
    font-size: 12px;
    margin: -6px 0 12px;
  }
  .socket-pill {
    border: 1px solid var(--border-soft);
    border-radius: var(--radius-pill);
    color: var(--text-muted);
    font-size: 11px;
    font-weight: 700;
    padding: 4px 9px;
    text-transform: uppercase;
  }
  .socket-live {
    color: var(--easy);
    border-color: rgba(34, 197, 94, 0.28);
  }
  .socket-connecting {
    color: var(--medium);
    border-color: rgba(245, 158, 11, 0.28);
  }
  .problem-info {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .problem-title {
    color: var(--text-heading);
    font-weight: 500;
  }
  .difficulty-pill {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 3px 9px;
    border-radius: var(--radius-pill);
  }
  .problem-actions {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .points {
    color: var(--text-muted);
    font-size: 13px;
  }
  .link-btn {
    background: none;
    border: none;
    padding: 0;
    font-size: 13px;
    font-weight: 600;
    color: var(--purple-3);
    cursor: pointer;
    text-decoration: underline;
  }
  .link-btn.danger {
    color: var(--hard);
  }
  .link-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
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
    transition: transform 0.1s ease, opacity 0.15s ease;
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
  .btn-danger {
    color: var(--hard);
    border-color: rgba(239, 68, 68, 0.3);
  }
  .btn-sm {
    padding: 7px 14px;
    font-size: 13px;
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
    max-width: 420px;
  }
  .modal h2 {
    margin: 0 0 16px;
    font-family: var(--font-heading);
    font-size: 20px;
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
  input {
    font-family: inherit;
    font-size: 14px;
    font-weight: 400;
    background: var(--bg-input);
    color: var(--text-heading);
    border: 1px solid var(--border-card);
    border-radius: var(--radius-sm);
    padding: 9px 11px;
  }
  input::placeholder {
    color: var(--text-dim);
  }
  input:focus {
    outline: 2px solid var(--border-focus);
    outline-offset: 1px;
  }
  .error-text {
    color: var(--hard);
    font-size: 13px;
    margin: 4px 0 0;
  }
  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 18px;
  }
`;

export default ContestDetailPage;

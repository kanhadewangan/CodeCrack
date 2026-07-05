"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { problemsApi, submissionsApi } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import RequireAuth from "../../components/RequireAuth";

interface Problem {
  id: string;
  title: string;
  slug: string;
  description: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  tags: string[];
}

export default function ProblemsPage() {
  const { user } = useAuth();
  const [problems, setProblems] = useState<Problem[]>([]);
  const [solvedProblemIds, setSolvedProblemIds] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const data = await problemsApi.list();
        setProblems(data);
        if (user) {
          try {
            const userSubmissions = await submissionsApi.list();
            const solvedIds = new Set<string>(
              userSubmissions
                .filter((sub: any) => sub.status === "ACCEPTED")
                .map((sub: any) => sub.problemId)
            );
            setSolvedProblemIds(solvedIds);
          } catch (err) {
            console.error("Could not fetch user submission list", err);
          }
        }
      } catch (err: any) {
        setError(err.message || "Failed to fetch problems.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  const filteredProblems = problems.filter((prob) => {
    const matchesSearch =
      prob.title.toLowerCase().includes(search.toLowerCase()) ||
      prob.tags.some((tag) =>
        tag.toLowerCase().includes(search.toLowerCase())
      );
    const matchesDifficulty =
      difficultyFilter === "" || prob.difficulty === difficultyFilter;
    return matchesSearch && matchesDifficulty;
  });

  const easyCount = problems.filter((p) => p.difficulty === "EASY").length;
  const mediumCount = problems.filter((p) => p.difficulty === "MEDIUM").length;
  const hardCount = problems.filter((p) => p.difficulty === "HARD").length;

 if (loading) {
  return (
    <RequireAuth>
      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "2rem" }}>
        {/* Search + filter bar skeleton */}
        <div
          style={{
            display: "flex",
            gap: "1rem",
            alignItems: "center",
            marginBottom: "1.5rem",
          }}
        >
          <div
            className="skeleton-block"
            style={{ flex: 1, height: "44px", borderRadius: "10px" }}
          />
          <div
            className="skeleton-block"
            style={{ width: "260px", height: "44px", borderRadius: "10px" }}
          />
        </div>

        {/* Table skeleton */}
        <div
          style={{
            background: "var(--bg-card, #14121c)",
            border: "1px solid var(--border-card)",
            borderRadius: "var(--radius-xl, 16px)",
            overflow: "hidden",
          }}
        >
          {/* Header row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "80px 1fr 120px 260px 100px",
              padding: "1rem 1.5rem",
              borderBottom: "1px solid var(--border-card)",
            }}
          >
            {["STATUS", "TITLE", "DIFFICULTY", "TOPICS", "ACTION"].map((label) => (
              <span
                key={label}
                style={{
                  fontSize: "0.7rem",
                  letterSpacing: "0.08em",
                  color: "var(--text-dim, #6b6b7a)",
                }}
              >
                {label}
              </span>
            ))}
          </div>

          {/* Skeleton rows */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "80px 1fr 120px 260px 100px",
                alignItems: "center",
                padding: "1.1rem 1.5rem",
                borderBottom:
                  i < 7 ? "1px solid var(--border-card)" : "none",
              }}
            >
              {/* status circle */}
              <div
                className="skeleton-block"
                style={{ width: "18px", height: "18px", borderRadius: "50%" }}
              />

              {/* title */}
              <div
                className="skeleton-block"
                style={{
                  width: `${55 + ((i * 13) % 30)}%`,
                  height: "14px",
                  borderRadius: "4px",
                }}
              />

              {/* difficulty pill */}
              <div
                className="skeleton-block"
                style={{ width: "64px", height: "22px", borderRadius: "999px" }}
              />

              {/* topic tags */}
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <div className="skeleton-block" style={{ width: "50px", height: "22px", borderRadius: "6px" }} />
                <div className="skeleton-block" style={{ width: "70px", height: "22px", borderRadius: "6px" }} />
                {i % 2 === 0 && (
                  <div className="skeleton-block" style={{ width: "60px", height: "22px", borderRadius: "6px" }} />
                )}
              </div>

              {/* action button */}
              <div
                className="skeleton-block"
                style={{ width: "70px", height: "32px", borderRadius: "999px", justifySelf: "start" }}
              />
            </div>
          ))}
        </div>

        {/* footer count skeleton */}
        <div
          className="skeleton-block"
          style={{
            width: "140px",
            height: "14px",
            borderRadius: "4px",
            margin: "1.5rem auto 0",
          }}
        />
      </div>
    </RequireAuth>
  );
}

  return (
    <RequireAuth>
      <div
        className="animate-fade-in"
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "2rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.75rem",
        }}
      >
        {/* Header */}
        <div>
          <h1
            style={{
              fontSize: "2rem",
              fontWeight: "800",
              color: "var(--text-heading)",
              marginBottom: "0.3rem",
            }}
          >
            Problems
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
            Solve algorithm challenges to raise your points and climb the global
            leaderboard.
          </p>
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          {[
            { label: "Easy", count: easyCount, color: "var(--easy)", bg: "var(--easy-bg)", border: "rgba(34,197,94,0.2)" },
            { label: "Medium", count: mediumCount, color: "var(--medium)", bg: "var(--medium-bg)", border: "rgba(234,179,8,0.2)" },
            { label: "Hard", count: hardCount, color: "var(--hard)", bg: "var(--hard-bg)", border: "rgba(239,68,68,0.2)" },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.45rem 0.9rem",
                borderRadius: "var(--radius-md)",
                background: stat.bg,
                border: `1px solid ${stat.border}`,
              }}
            >
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: "700",
                  color: stat.color,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                {stat.label}
              </span>
              <span
                style={{
                  fontSize: "0.85rem",
                  fontWeight: "700",
                  color: stat.color,
                }}
              >
                {stat.count}
              </span>
            </div>
          ))}
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.82rem",
              color: "var(--text-muted)",
            }}
          >
            {solvedProblemIds.size > 0 && (
              <span>
                ✓{" "}
                <span
                  style={{
                    color: "var(--easy)",
                    fontWeight: "600",
                  }}
                >
                  {solvedProblemIds.size}
                </span>{" "}
                solved
              </span>
            )}
          </div>
        </div>

        {error ? (
          <div
            style={{
              background: "var(--hard-bg)",
              border: "1px solid rgba(239,68,68,0.2)",
              color: "var(--hard)",
              padding: "1rem 1.5rem",
              borderRadius: "var(--radius-md)",
            }}
          >
            {error}
          </div>
        ) : (
          <>
            {/* Filters */}
            <div
              style={{
                display: "flex",
                gap: "1rem",
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              {/* Search */}
              <div
                className="search-input-wrap"
                style={{ flex: 1, maxWidth: "420px" }}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 20 20"
                  fill="none"
                  style={{ color: "var(--text-dim)", flexShrink: 0 }}
                >
                  <path
                    d="M9 17A8 8 0 1 0 9 1a8 8 0 0 0 0 16zm0 0l4.35 4.35"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                <input
                  placeholder="Search by title or topic..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {/* Difficulty filter */}
              <div
                style={{
                  display: "flex",
                  gap: "0.35rem",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-card)",
                  borderRadius: "var(--radius-md)",
                  padding: "0.2rem",
                }}
              >
                {[
                  { value: "", label: "All" },
                  { value: "EASY", label: "Easy" },
                  { value: "MEDIUM", label: "Medium" },
                  { value: "HARD", label: "Hard" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setDifficultyFilter(opt.value)}
                    style={{
                      background:
                        difficultyFilter === opt.value
                          ? "rgba(157,92,246,0.15)"
                          : "none",
                      border:
                        difficultyFilter === opt.value
                          ? "1px solid rgba(157,92,246,0.3)"
                          : "1px solid transparent",
                      color:
                        difficultyFilter === opt.value
                          ? "var(--purple-3)"
                          : "var(--text-muted)",
                      padding: "0.3rem 0.75rem",
                      borderRadius: "8px",
                      fontSize: "0.82rem",
                      fontWeight: difficultyFilter === opt.value ? "600" : "500",
                      cursor: "pointer",
                      transition: "all 0.15s",
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-card)",
                borderRadius: "var(--radius-lg)",
                overflow: "hidden",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  textAlign: "left",
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom: "1px solid var(--border-soft)",
                      background: "rgba(255,255,255,0.01)",
                    }}
                  >
                    {[
                      { label: "Status", width: "70px", align: "center" },
                      { label: "Title", width: undefined, align: "left" },
                      { label: "Difficulty", width: "110px", align: "left" },
                      { label: "Topics", width: undefined, align: "left" },
                      { label: "Action", width: "110px", align: "center" },
                    ].map((col) => (
                      <th
                        key={col.label}
                        style={{
                          padding: "0.85rem 1.1rem",
                          fontSize: "0.72rem",
                          fontWeight: "600",
                          color: "var(--text-muted)",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          width: col.width,
                          textAlign: col.align as any,
                        }}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredProblems.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        style={{
                          padding: "3rem",
                          textAlign: "center",
                          color: "var(--text-muted)",
                          fontSize: "0.9rem",
                        }}
                      >
                        No problems match the filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredProblems.map((prob, idx) => {
                      const isSolved = solvedProblemIds.has(prob.id);
                      return (
                        <tr
                          key={prob.id}
                          className="table-row-hover"
                          style={{
                            borderBottom:
                              idx < filteredProblems.length - 1
                                ? "1px solid rgba(255,255,255,0.03)"
                                : "none",
                            transition: "background 0.15s",
                          }}
                        >
                          {/* Status */}
                          <td
                            style={{
                              padding: "1rem 1.1rem",
                              textAlign: "center",
                            }}
                          >
                            {isSolved ? (
                              <span
                                style={{
                                  color: "var(--easy)",
                                  fontSize: "0.95rem",
                                }}
                              >
                                ✓
                              </span>
                            ) : (
                              <span
                                style={{
                                  color: "rgba(255,255,255,0.1)",
                                  fontSize: "0.85rem",
                                }}
                              >
                                ○
                              </span>
                            )}
                          </td>

                          {/* Title */}
                          <td style={{ padding: "1rem 1.1rem" }}>
                            <Link
                              href={`/problems/${prob.id}`}
                              style={{
                                fontWeight: "600",
                                fontSize: "0.9rem",
                                color: isSolved
                                  ? "var(--text-muted)"
                                  : "var(--text-heading)",
                                transition: "color 0.15s",
                                textDecoration: "none",
                              }}
                            >
                              {prob.title}
                            </Link>
                          </td>

                          {/* Difficulty */}
                          <td style={{ padding: "1rem 1.1rem" }}>
                            <span
                              className={`badge badge-${prob.difficulty.toLowerCase()}`}
                            >
                              {prob.difficulty.charAt(0) +
                                prob.difficulty.slice(1).toLowerCase()}
                            </span>
                          </td>

                          {/* Tags */}
                          <td style={{ padding: "1rem 1.1rem" }}>
                            <div
                              style={{
                                display: "flex",
                                gap: "0.35rem",
                                flexWrap: "wrap",
                              }}
                            >
                              {prob.tags.slice(0, 3).map((tag) => (
                                <span
                                  key={tag}
                                  style={{
                                    fontSize: "0.68rem",
                                    padding: "0.15rem 0.45rem",
                                    borderRadius: "4px",
                                    background: "rgba(255,255,255,0.04)",
                                    border:
                                      "1px solid rgba(255,255,255,0.06)",
                                    color: "var(--text-muted)",
                                  }}
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </td>

                          {/* Action */}
                          <td
                            style={{
                              padding: "1rem 1.1rem",
                              textAlign: "center",
                            }}
                          >
                            <Link
                              href={`/problems/${prob.id}`}
                              className={`btn ${isSolved ? "btn-ghost" : "btn-primary"}`}
                              style={{
                                padding: "0.32rem 0.85rem",
                                fontSize: "0.78rem",
                              }}
                            >
                              {isSolved ? "Retry" : "Solve"}
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer count */}
            <p
              style={{
                fontSize: "0.78rem",
                color: "var(--text-dim)",
                textAlign: "center",
              }}
            >
              Showing {filteredProblems.length} of {problems.length} problems
            </p>
          </>
        )}
      </div>
    </RequireAuth>
  );
}

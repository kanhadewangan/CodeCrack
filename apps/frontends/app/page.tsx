"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { problemsApi, streaksApi, submissionsApi } from "../lib/api";

interface Problem {
  id: string;
  title: string;
  slug: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  tags: string[];
}

interface Submission {
  id: string;
  problemId: string;
  code: string;
  language: string;
  status: string;
  problems?: {
    title: string;
    difficulty: string;
  };
}

type ContributionMap = Record<string, number>;

function formatDateKeyLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDateKeyUTC(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function normalizeContributionMap(payload: any): ContributionMap {
  if (!payload) return {};

  const source = payload.contributions && typeof payload.contributions === "object"
    ? payload.contributions
    : payload;

  if (Array.isArray(source)) {
    return source.reduce((acc: ContributionMap, item: any) => {
      const key = typeof item?.date === "string" ? item.date.slice(0, 10) : null;
      const value = Number(item?.count || 0);
      if (key) acc[key] = Number.isFinite(value) ? value : 0;
      return acc;
    }, {});
  }

  if (typeof source !== "object") return {};

  return Object.entries(source).reduce((acc: ContributionMap, [key, value]) => {
    const safeKey = key.slice(0, 10);
    const safeValue = Number(value || 0);
    acc[safeKey] = Number.isFinite(safeValue) ? safeValue : 0;
    return acc;
  }, {});
}

export default function Home() {
  const { user } = useAuth();
  const [featuredProblems, setFeaturedProblems] = useState<Problem[]>([]);
  const [recentSubmissions, setRecentSubmissions] = useState<Submission[]>([]);
  const [streakCount, setStreakCount] = useState(0);
  const [contributions, setContributions] = useState<ContributionMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const probs = await problemsApi.list();
        // Take a few featured problems
        setFeaturedProblems(probs.slice(0, 4));

        if (user) {
          try {
            const [subsResult, streakResult, contributionResult] = await Promise.allSettled([
              submissionsApi.list(),
              streaksApi.get(),
              streaksApi.getContributions(),
            ]);

            if (streakResult.status === "fulfilled") {
              setStreakCount(streakResult.value?.streaks || 0);
            } else {
              setStreakCount(0);
            }

            if (contributionResult.status === "fulfilled") {
              setContributions(normalizeContributionMap(contributionResult.value));
            } else {
              setContributions({});
            }

            const subs = subsResult.status === "fulfilled" ? subsResult.value : [];
            // Fetch problem relations manually if needed, but since we retrieve user submissions:
            // submissions endpoint maps: id, problemId, code, language, status.
            // Let's resolve the problem titles using the fetched problems list.
            const enhancedSubs = subs.slice(0, 5).map((sub: any) => {
              const matchingProblem = probs.find((p:any) => p.id === sub.problemId);
              return {
                ...sub,
                problems: matchingProblem ? {
                  title: matchingProblem.title,
                  difficulty: matchingProblem.difficulty
                } : undefined
              };
            });
            setRecentSubmissions(enhancedSubs);
          } catch (err) {
            console.error("Could not load submissions for dashboard", err);
            setStreakCount(0);
            setContributions({});
          }
        } else {
          setStreakCount(0);
          setContributions({});
        }
      } catch (err) {
        console.error("Failed to load dashboard bank problems", err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [user]);

  // Statistics summaries
  const solvedCount = user?.userStat?.[0]?.problemsSolved || 0;
  const ratingVal = user?.userStat?.[0]?.rating || 200;
  const totalAttempts = user?.userStat?.[0]?.totalSubmissions || 0;
  const accuracy = totalAttempts > 0 ? Math.round((solvedCount / totalAttempts) * 100) : 0;
  const totalContributions = Object.values(contributions).reduce((sum, count) => sum + count, 0);

  const endDate = new Date();
  endDate.setHours(0, 0, 0, 0);

  const rangeStart = new Date(endDate);
  rangeStart.setDate(endDate.getDate() - 364);

  const gridStart = new Date(rangeStart);
  gridStart.setDate(rangeStart.getDate() - rangeStart.getDay());

  const oneDayMs = 24 * 60 * 60 * 1000;
  const totalGridDays = Math.floor((endDate.getTime() - gridStart.getTime()) / oneDayMs) + 1;
  const totalWeeks = Math.ceil(totalGridDays / 7);

  const weeks = Array.from({ length: totalWeeks }, (_, weekIndex) =>
    Array.from({ length: 7 }, (_, dayOfWeek) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + weekIndex * 7 + dayOfWeek);
      const localKey = formatDateKeyLocal(date);
      const utcKey = formatDateKeyUTC(date);
      const inRange = date >= rangeStart && date <= endDate;
      const count = inRange ? (contributions[utcKey] ?? contributions[localKey] ?? 0) : 0;
      return {
        date,
        key: contributions[utcKey] !== undefined ? utcKey : localKey,
        count,
        inRange,
      };
    })
  );

  const monthLabels = weeks
    .map((week, index) => {
      const firstInRange = week.find((day) => day.inRange);
      if (!firstInRange) return null;

      const hasMonthStart = week.some((day) => day.inRange && day.date.getDate() === 1);
      if (index !== 0 && !hasMonthStart) return null;

      return {
        index,
        label: firstInRange.date.toLocaleString("en-US", { month: "short" }),
      };
    })
    .filter(Boolean) as Array<{ index: number; label: string }>;

  const getContributionColor = (count: number) => {
    if (count === 0) return "#1a2035";
    if (count <= 1) return "#1f8f4e";
    if (count <= 3) return "#26a641";
    if (count <= 6) return "#39d353";
    return "#56f27b";
  };

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
      {/* Welcome Banner */}
      <div className="glass-panel" style={{
        padding: "3rem",
        borderRadius: "16px",
        background: "linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)",
        border: "1px solid rgba(99, 102, 241, 0.15)",
        textAlign: "center"
      }}>
        <h1 style={{
          fontSize: "2.75rem",
          fontWeight: "800",
          background: "linear-gradient(135deg, #a78bfa, #818cf8)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          marginBottom: "1rem"
        }}>
          {user ? `Welcome Back, ${user.email.split("@")[0]}!` : "Empower Your Code Journey"}
        </h1>
        <p style={{
          color: "var(--text-muted)",
          fontSize: "1.1rem",
          maxWidth: "700px",
          margin: "0 auto 2rem auto",
          lineHeight: "1.6"
        }}>
          CodeJudge is a premium compilation and algorithm test suite. Try standard algorithms, test solutions inside sandboxed dockers, and compete on the global leaderboard.
        </p>
        {!user && (
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
            <Link href="/register" className="btn btn-primary">
              Register Now
            </Link>
            <Link href="/problems" className="btn btn-secondary">
              Browse Challenges
            </Link>
          </div>
        )}
      </div>

      {user && (
        /* Stat Cards for Authenticated Users */
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1.5rem"
        }}>
          <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: "600", textTransform: "uppercase" }}>
              Global Rating
            </span>
            <span style={{ fontSize: "2.25rem", fontWeight: "800", color: "var(--primary)" }}>
              {ratingVal} <span style={{ fontSize: "1rem", fontWeight: "normal", color: "var(--text-muted)" }}>pts</span>
            </span>
            <span style={{ fontSize: "0.75rem", color: "var(--secondary)" }}>
              ★ Coding Rank Champion
            </span>
          </div>

          <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: "600", textTransform: "uppercase" }}>
              Problems Solved
            </span>
            <span style={{ fontSize: "2.25rem", fontWeight: "800", color: "var(--secondary)" }}>
              {solvedCount}
            </span>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              challenges checked & approved
            </span>
          </div>

          <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: "600", textTransform: "uppercase" }}>
              Total Attempts
            </span>
            <span style={{ fontSize: "2.25rem", fontWeight: "800", color: "var(--medium)" }}>
              {totalAttempts}
            </span>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              solutions submitted to sandbox
            </span>
          </div>

          <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: "600", textTransform: "uppercase" }}>
              Submission Accuracy
            </span>
            <span style={{ fontSize: "2.25rem", fontWeight: "800", color: "#EC4899" }}>
              {accuracy}%
            </span>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              average success rate per run
            </span>
          </div>

          <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: "600", textTransform: "uppercase" }}>
              Current Streak
            </span>
            <span style={{ fontSize: "2.25rem", fontWeight: "800", color: "#F59E0B" }}>
              {streakCount} <span style={{ fontSize: "1rem", fontWeight: "normal", color: "var(--text-muted)" }}>days</span>
            </span>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              consecutive active coding days
            </span>
          </div>
        </div>
      )}

      {user && (
        <div
          className="glass-panel"
          style={{
            padding: "1.5rem",
            borderRadius: "14px",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", gap: "0.75rem", flexWrap: "wrap" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>
              {totalContributions} contributions in the last year
            </h2>
            <span style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
              Contribution settings ▾
            </span>
          </div>

          <div
            style={{
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "10px",
              padding: "0.9rem",
              overflowX: "auto",
            }}
          >
            <div style={{ minWidth: "820px" }}>
              <div style={{ display: "flex", alignItems: "center", marginBottom: "0.5rem" }}>
                <div style={{ width: "34px" }} />
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${totalWeeks}, 12px)`, gap: "3px" }}>
                  {Array.from({ length: totalWeeks }).map((_, idx) => {
                    const monthLabel = monthLabels.find((m) => m.index === idx)?.label;
                    return (
                      <div key={`month-${idx}`} style={{ fontSize: "0.7rem", color: "var(--text-muted)", minHeight: "14px" }}>
                        {monthLabel || ""}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.4rem" }}>
                <div style={{ width: "34px", display: "grid", gridTemplateRows: "repeat(7, 12px)", gap: "3px", fontSize: "0.72rem", color: "var(--text-muted)" }}>
                  <div />
                  <div style={{ display: "flex", alignItems: "center" }}>Mon</div>
                  <div />
                  <div style={{ display: "flex", alignItems: "center" }}>Wed</div>
                  <div />
                  <div style={{ display: "flex", alignItems: "center" }}>Fri</div>
                  <div />
                </div>

                <div style={{ display: "flex", gap: "3px" }}>
                  {weeks.map((week, weekIndex) => (
                    <div key={`week-${weekIndex}`} style={{ display: "grid", gridTemplateRows: "repeat(7, 12px)", gap: "3px" }}>
                      {week.map((day, dayIndex) => (
                      <div
                        key={`${day.key}-${weekIndex}-${dayIndex}`}
                        title={`${day.key}: ${day.count} contribution${day.count === 1 ? "" : "s"}`}
                        style={{
                          width: "12px",
                          height: "12px",
                          borderRadius: "2px",
                          backgroundColor: getContributionColor(day.count),
                          opacity: day.inRange ? 1 : 0.35,
                        }}
                      />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.8rem", gap: "0.75rem", flexWrap: "wrap" }}>
            <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
              Learn how we count contributions
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
              <span>Less</span>
              {[0, 1, 2, 3, 4].map((level) => (
                <div
                  key={`legend-${level}`}
                  style={{
                    width: "11px",
                    height: "11px",
                    borderRadius: "2px",
                    backgroundColor: getContributionColor(level === 0 ? 0 : level * 2),
                  }}
                />
              ))}
              <span>More</span>
            </div>
          </div>
        </div>
      )}

      {/* Main split sections */}
      <div style={{
        display: "grid",
        gridTemplateColumns: user ? "3fr 2fr" : "1fr",
        gap: "2rem",
        alignItems: "flex-start"
      }}>
        {/* Featured Challenges */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>Featured Challenges</h2>
            <Link href="/problems" style={{ color: "var(--primary)", fontSize: "0.85rem", fontWeight: "600" }}>
              View all ({featuredProblems.length}+) →
            </Link>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1.25rem"
          }}>
            {loading ? (
              <p style={{ color: "var(--text-muted)" }}>Loading problems list...</p>
            ) : featuredProblems.length === 0 ? (
              <p style={{ color: "var(--text-muted)" }}>No challenges uploaded yet. Be the first to create one!</p>
            ) : (
              featuredProblems.map((prob) => (
                <div key={prob.id} className="glass-card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: "180px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                      <h3 style={{ fontSize: "1.1rem", fontWeight: "bold", wordBreak: "break-word" }}>{prob.title}</h3>
                      <span className={`badge badge-${prob.difficulty.toLowerCase()}`} style={{ fontSize: "0.6rem" }}>
                        {prob.difficulty}
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap", margin: "0.25rem 0" }}>
                      {prob.tags.slice(0, 3).map((tag) => (
                        <span key={tag} style={{ fontSize: "0.65rem", padding: "0.15rem 0.4rem", background: "rgba(255,255,255,0.04)", color: "var(--text-muted)", borderRadius: "4px" }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <Link href={`/problems/${prob.id}`} className="btn btn-primary" style={{ padding: "0.45rem 1rem", fontSize: "0.8rem", textAlign: "center", width: "100%", marginTop: "1rem" }}>
                    Solve Challenge
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* User's Recent Activity (Submissions Log) */}
        {user && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>Your Recent Runs</h2>

            <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              {recentSubmissions.length === 0 ? (
                <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)", fontSize: "0.9rem" }}>
                  No submission attempts logged. Pick a challenge and submit code to verify!
                </div>
              ) : (
                recentSubmissions.map((sub) => {
                  let badgeClass = "badge-failed";
                  if (sub.status === "ACCEPTED") badgeClass = "badge-accepted";
                  if (sub.status === "PENDING" || sub.status === "RUNNING") badgeClass = "badge-pending";

                  return (
                    <div
                      key={sub.id}
                      style={{
                        paddingBottom: "0.75rem",
                        borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                    >
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                        <Link href={`/problems/${sub.problemId}`} style={{ fontWeight: "600", fontSize: "0.9rem", color: "#f3f4f6" }}>
                          {sub.problems?.title || "Unknown Problem"}
                        </Link>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          Lang: {sub.language.toUpperCase()}
                        </span>
                      </div>
                      <span className={`badge ${badgeClass}`} style={{ fontSize: "0.65rem", padding: "0.2rem 0.5rem" }}>
                        {sub.status}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

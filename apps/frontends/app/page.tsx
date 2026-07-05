"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  const source =
    payload.contributions && typeof payload.contributions === "object"
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
        setFeaturedProblems(probs.slice(0, 5));

        if (user) {
          try {
            const [subsResult, streakResult, contributionResult] =
              await Promise.allSettled([
                submissionsApi.list(),
                streaksApi.get(),
                streaksApi.getContributions(),
              ]);

            if (streakResult.status === "fulfilled") {
              setStreakCount(streakResult.value?.streak || 0);
            }
            if (contributionResult.status === "fulfilled") {
              setContributions(
                normalizeContributionMap(contributionResult.value)
              );
            }

            const subs =
              subsResult.status === "fulfilled" ? subsResult.value : [];
            const enhancedSubs = subs.slice(0, 5).map((sub: any) => {
              const matchingProblem = probs.find(
                (p: any) => p.id === sub.problemId
              );
              return {
                ...sub,
                problems: matchingProblem
                  ? {
                      title: matchingProblem.title,
                      difficulty: matchingProblem.difficulty,
                    }
                  : undefined,
              };
            });
            setRecentSubmissions(enhancedSubs);
          } catch (err) {
            console.error("Could not load dashboard user data", err);
          }
        }
        else {
         setLoading(false);
        }
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [user]);

  const solvedCount = user?.userStat?.[0]?.problemsSolved || 0;
  const ratingVal = user?.userStat?.[0]?.rating || 0;
  const totalAttempts = user?.userStat?.[0]?.totalSubmissions || 0;
  const accuracy =
    totalAttempts > 0 ? Math.round((solvedCount / totalAttempts) * 100) : 0;
  const totalContributions = Object.values(contributions).reduce(
    (sum, count) => sum + count,
    0
  );

  const endDate = new Date();
  endDate.setHours(0, 0, 0, 0);
  const rangeStart = new Date(endDate);
  rangeStart.setDate(endDate.getDate() - 364);
  const gridStart = new Date(rangeStart);
  gridStart.setDate(rangeStart.getDate() - rangeStart.getDay());

  const oneDayMs = 24 * 60 * 60 * 1000;
  const totalGridDays =
    Math.floor((endDate.getTime() - gridStart.getTime()) / oneDayMs) + 1;
  const totalWeeks = Math.ceil(totalGridDays / 7);

  const weeks = Array.from({ length: totalWeeks }, (_, weekIndex) =>
    Array.from({ length: 7 }, (_, dayOfWeek) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + weekIndex * 7 + dayOfWeek);
      const localKey = formatDateKeyLocal(date);
      const utcKey = formatDateKeyUTC(date);
      const inRange = date >= rangeStart && date <= endDate;
      const count = inRange
        ? (contributions[utcKey] ?? contributions[localKey] ?? 0)
        : 0;
      return {
        date,
        key:
          contributions[utcKey] !== undefined ? utcKey : localKey,
        count,
        inRange,
      };
    })
  );

  const monthLabels = weeks
    .map((week, index) => {
      const firstInRange = week.find((day) => day.inRange);
      if (!firstInRange) return null;
      const hasMonthStart = week.some(
        (day) => day.inRange && day.date.getDate() === 1
      );
      if (index !== 0 && !hasMonthStart) return null;
      return {
        index,
        label: firstInRange.date.toLocaleString("en-US", { month: "short" }),
      };
    })
    .filter(Boolean) as Array<{ index: number; label: string }>;

  const getHeatColor = (count: number) => {
    if (count === 0) return "rgba(255,255,255,0.04)";
    if (count <= 1) return "rgba(124,58,237,0.35)";
    if (count <= 3) return "rgba(124,58,237,0.55)";
    if (count <= 6) return "rgba(157,92,246,0.75)";
    return "rgba(192,132,252,0.9)";
  };


  const username = user?.email?.split("@")[0] || "";


  if(loading) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {/* Hero skeleton */}
      <section
        style={{
          minHeight: "88vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "4rem 2rem",
        }}
      >
        <div className="skeleton-block" style={{ width: "280px", height: "32px", borderRadius: "999px", marginBottom: "2.5rem" }} />

        <div className="skeleton-block" style={{ width: "min(700px, 80vw)", height: "3.2rem", borderRadius: "8px", marginBottom: "1rem" }} />
        <div className="skeleton-block" style={{ width: "min(500px, 60vw)", height: "3.2rem", borderRadius: "8px", marginBottom: "1.5rem" }} />

        <div className="skeleton-block" style={{ width: "min(560px, 85vw)", height: "1.2rem", borderRadius: "6px", marginBottom: "0.6rem" }} />
        <div className="skeleton-block" style={{ width: "min(460px, 70vw)", height: "1.2rem", borderRadius: "6px", marginBottom: "2.5rem" }} />

        <div style={{ display: "flex", gap: "1rem", marginBottom: "3rem" }}>
          <div className="skeleton-block" style={{ width: "170px", height: "48px", borderRadius: "var(--radius-md, 8px)" }} />
          <div className="skeleton-block" style={{ width: "150px", height: "48px", borderRadius: "var(--radius-md, 8px)" }} />
        </div>

        <div style={{ display: "flex", gap: "2rem", alignItems: "center" }}>
          <div className="skeleton-block" style={{ width: "140px", height: "16px", borderRadius: "4px" }} />
          <div className="skeleton-block" style={{ width: "180px", height: "16px", borderRadius: "4px" }} />
        </div>
      </section>

      {/* Features skeleton */}
      <section
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "4rem 2rem 6rem",
          width: "100%",
        }}
      >
        <div className="skeleton-block" style={{ width: "160px", height: "14px", borderRadius: "4px", marginBottom: "0.75rem" }} />
        <div className="skeleton-block" style={{ width: "min(480px, 70vw)", height: "2.4rem", borderRadius: "8px", marginBottom: "3rem" }} />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "1px",
            background: "var(--border-card)",
            border: "1px solid var(--border-card)",
            borderRadius: "var(--radius-xl)",
            overflow: "hidden",
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="feature-card" style={{ borderRadius: 0, border: "none" }}>
              <div className="skeleton-block" style={{ width: "32px", height: "32px", borderRadius: "8px", marginBottom: "0.75rem" }} />
              <div className="skeleton-block" style={{ width: "60%", height: "16px", borderRadius: "4px", marginBottom: "0.5rem" }} />
              <div className="skeleton-block" style={{ width: "90%", height: "14px", borderRadius: "4px", marginBottom: "0.35rem" }} />
              <div className="skeleton-block" style={{ width: "75%", height: "14px", borderRadius: "4px" }} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
 
 

  // Authenticated Dashboard
  return (
    <div
      style={{
        maxWidth: "1280px",
        margin: "0 auto",
        padding: "2rem",
        display: "flex",
        flexDirection: "column",
        gap: "2rem",
      }}
      className="animate-fade-in"
    >
      {/* Header row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <p
            style={{
              fontSize: "0.8rem",
              color: "var(--text-muted)",
              fontWeight: "500",
              marginBottom: "0.2rem",
            }}
          >
            Welcome back,
          </p>
          <h1
            style={{
              fontSize: "2.25rem",
              fontWeight: "800",
              color: "var(--text-heading)",
              lineHeight: 1.1,
            }}
          >
            {username}
          </h1>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          {/* Streak badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.6rem 1rem",
              borderRadius: "var(--radius-md)",
              background: "var(--bg-card)",
              border: "1px solid var(--border-card)",
            }}
          >
            <span style={{ fontSize: "1.1rem" }}>🔥</span>
            <div>
              <div
                style={{
                  fontSize: "0.9rem",
                  fontWeight: "700",
                  color: "#F97316",
                }}
              >
                
                {streakCount} day streak
              </div>
            </div>
          </div>

          {/* Daily goal */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.6rem 1rem",
              borderRadius: "var(--radius-md)",
              background: "var(--bg-card)",
              border: "1px solid var(--border-card)",
            }}
          >
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: `conic-gradient(var(--purple-2) ${Math.min(solvedCount / 5, 1) * 360}deg, rgba(255,255,255,0.06) 0deg)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.55rem",
                fontWeight: "700",
                color: "var(--purple-3)",
              }}
            >
              {Math.min(solvedCount, 5)}/5
            </div>
            <div>
              <div
                style={{
                  fontSize: "0.8rem",
                  fontWeight: "700",
                  color: "var(--text-heading)",
                }}
              >
                Daily goal
              </div>
              <div
                style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}
              >
                {Math.min(solvedCount, 5)}/5 solved
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
        }}
        className="stagger"
      >
        {[
          {
            label: "Problems solved",
            icon: "✓",
            value: solvedCount.toString(),
            delta: "+12",
            deltaType: "positive",
          },
          {
            label: "Current streak",
            icon: "🔥",
            value: `${streakCount} days`,
            delta: "PR",
            deltaType: "positive",
          },
          {
            label: "Global rank",
            icon: "🌐",
            value: `#${ratingVal > 0 ? (1000 - Math.floor(ratingVal / 10)) : "—"}`,
            delta: "-24",
            deltaType: "positive",
          },
          {
            label: "Acceptance",
            icon: "◎",
            value: `${accuracy}%`,
            delta: "+2.3%",
            deltaType: "positive",
          },
        ].map((stat, i) => (
          <div key={i} className="stat-card animate-fade-in">
            <div className="stat-card-label">
              <span>{stat.label}</span>
              <span style={{ fontSize: "0.9rem" }}>{stat.icon}</span>
            </div>
            <div className="stat-card-value">{stat.value}</div>
            <div className={`stat-card-delta ${stat.deltaType}`}>
              <span>↗</span>
              <span>{stat.delta}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Activity Heatmap */}
      <div className="glass-panel" style={{ padding: "1.5rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
            gap: "0.75rem",
            flexWrap: "wrap",
          }}
        >
          <div>
            <p className="section-label" style={{ marginBottom: "0.2rem" }}>
              Activity
            </p>
            <h3
              style={{
                fontSize: "1rem",
                fontWeight: "600",
                color: "var(--text-heading)",
              }}
            >
              {totalContributions} submissions in the last 6 months
            </h3>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
              fontSize: "0.72rem",
              color: "var(--text-muted)",
            }}
          >
            <span>Less</span>
            {[0, 1, 2, 3, 4].map((level) => (
              <div
                key={level}
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "2px",
                  background: getHeatColor(level === 0 ? 0 : level * 2),
                }}
              />
            ))}
            <span>More</span>
          </div>
        </div>

        <div
          style={{
            overflowX: "auto",
            paddingBottom: "0.25rem",
          }}
        >
          <div style={{ minWidth: "720px" }}>
            {/* Month labels row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "4px",
                paddingLeft: "30px",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${totalWeeks}, 11px)`,
                  gap: "2px",
                }}
              >
                {Array.from({ length: totalWeeks }).map((_, idx) => {
                  const label = monthLabels.find((m) => m.index === idx)?.label;
                  return (
                    <div
                      key={idx}
                      style={{
                        fontSize: "0.65rem",
                        color: "var(--text-muted)",
                        minHeight: "12px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {label || ""}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Grid */}
            <div style={{ display: "flex", gap: "0.3rem" }}>
              {/* Day labels */}
              <div
                style={{
                  width: "28px",
                  display: "grid",
                  gridTemplateRows: "repeat(7, 11px)",
                  gap: "2px",
                  fontSize: "0.65rem",
                  color: "var(--text-muted)",
                  flexShrink: 0,
                }}
              >
                {["", "Mon", "", "Wed", "", "Fri", ""].map((d, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      lineHeight: 1,
                    }}
                  >
                    {d}
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: "2px" }}>
                {weeks.map((week, wIdx) => (
                  <div
                    key={wIdx}
                    style={{
                      display: "grid",
                      gridTemplateRows: "repeat(7, 11px)",
                      gap: "2px",
                    }}
                  >
                    {week.map((day, dIdx) => (
                      <div
                        key={`${wIdx}-${dIdx}`}
                        title={`${day.key}: ${day.count} submission${day.count !== 1 ? "s" : ""}`}
                        style={{
                          width: "11px",
                          height: "11px",
                          borderRadius: "2px",
                          background: getHeatColor(day.count),
                          opacity: day.inRange ? 1 : 0.3,
                          cursor: "default",
                        }}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recommended + Recent Submissions */}
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "1.1rem",
          }}
        >
          <div>
            <p className="section-label" style={{ marginBottom: "0.2rem" }}>
              CONTINUE WHERE YOU LEFT OFF
            </p>
            <h2
              style={{
                fontSize: "1.5rem",
                fontWeight: "700",
                color: "var(--text-heading)",
              }}
            >
              Recommended for you
            </h2>
          </div>
          <Link
            href="/problems"
            style={{
              fontSize: "0.82rem",
              color: "var(--primary)",
              display: "flex",
              alignItems: "center",
              gap: "0.2rem",
              fontWeight: "600",
            }}
          >
            See all ↗
          </Link>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: "0.85rem",
          }}
        >
          {loading ? (
            <p style={{ color: "var(--text-muted)", gridColumn: "1/-1" }}>
              Loading...
            </p>
          ) : featuredProblems.length === 0 ? (
            <p style={{ color: "var(--text-muted)", gridColumn: "1/-1" }}>
              No problems yet. Add your first challenge!
            </p>
          ) : (
            featuredProblems.map((prob) => {
              const tagColor =
                prob.tags[1] ||
                (prob.difficulty === "EASY"
                  ? "Two Pointers"
                  : prob.difficulty === "MEDIUM"
                  ? "Trees"
                  : "DP");
              return (
                <Link
                  key={prob.id}
                  href={`/problems/${prob.id}`}
                  className="rec-card"
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      className={`badge badge-${prob.difficulty.toLowerCase()}`}
                      style={{ fontSize: "0.6rem" }}
                    >
                      {prob.difficulty}
                    </span>
                    <span
                      style={{
                        fontSize: "0.68rem",
                        color: "var(--text-dim)",
                      }}
                    >
                      {prob.tags[0] || tagColor}
                    </span>
                  </div>
                  <h3
                    style={{
                      fontSize: "0.9rem",
                      fontWeight: "600",
                      color: "var(--text-heading)",
                      lineHeight: 1.3,
                    }}
                  >
                    {prob.title}
                  </h3>
                  <div className="progress-bar" style={{ marginTop: "0.25rem" }}>
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: "0%",
                        background: "linear-gradient(90deg, var(--purple-1), var(--purple-3))",
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: "0.7rem",
                      color: "var(--text-dim)",
                    }}
                  >
                    Not started
                  </span>
                </Link>
              );
            })
          )}
        </div>
      </div>

      {/* Recent Submissions */}
      <div>
        <h2
          style={{
            fontSize: "1.25rem",
            fontWeight: "700",
            color: "var(--text-heading)",
            marginBottom: "1rem",
          }}
        >
          Recent submissions
        </h2>
        <div className="glass-panel" style={{ overflow: "hidden" }}>
          {recentSubmissions.length === 0 ? (
            <div
              style={{
                padding: "2rem",
                textAlign: "center",
                color: "var(--text-muted)",
                fontSize: "0.9rem",
              }}
            >
              No submissions yet. Pick a challenge and start solving!
            </div>
          ) : (
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
                  {["Problem", "Language", "Status"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "0.8rem 1.25rem",
                        fontSize: "0.72rem",
                        fontWeight: "600",
                        color: "var(--text-muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentSubmissions.map((sub) => {
                  let badgeClass = "badge-failed";
                  if (sub.status === "ACCEPTED") badgeClass = "badge-accepted";
                  if (
                    sub.status === "PENDING" ||
                    sub.status === "RUNNING"
                  )
                    badgeClass = "badge-pending";

                  return (
                    <tr
                      key={sub.id}
                      className="table-row-hover"
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.03)",
                        transition: "background 0.15s",
                      }}
                    >
                      <td style={{ padding: "0.9rem 1.25rem" }}>
                        <Link
                          href={`/problems/${sub.problemId}`}
                          style={{
                            fontWeight: "600",
                            fontSize: "0.9rem",
                            color: "var(--text-heading)",
                          }}
                        >
                          {sub.problems?.title || "Unknown Problem"}
                        </Link>
                      </td>
                      <td
                        style={{
                          padding: "0.9rem 1.25rem",
                          fontSize: "0.8rem",
                          color: "var(--text-muted)",
                          textTransform: "uppercase",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        {sub.language}
                      </td>
                      <td style={{ padding: "0.9rem 1.25rem" }}>
                        <span
                          className={`badge ${badgeClass}`}
                          style={{ fontSize: "0.65rem" }}
                        >
                          {sub.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

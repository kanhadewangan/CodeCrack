"use client";

import { useEffect, useState } from "react";
import { leaderboardApi } from "../../lib/api";
import RequireAuth from "../../components/RequireAuth";

interface LeaderboardItem {
  rank: number;
  userId: string;
  email: string;
  rating: number;
  problemsSolved: number;
  totalSubmissions: number;
}

const FILTER_TABS = ["Global", "Friends", "Weekly", "Monthly"];

export default function LeaderboardPage() {
  const [list, setList] = useState<LeaderboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("Global");

  useEffect(() => {
    async function loadLeaderboard() {
      try {
        const data = await leaderboardApi.get();
        setList(data);
      } catch (err: any) {
        setError(err.message || "Failed to load leaderboard.");
      } finally {
        setLoading(false);
      }
    }
    loadLeaderboard();
  }, []);

  const filteredList = list.filter((item) =>
    item.email.toLowerCase().includes(search.toLowerCase())
  );

  const top3 = filteredList.slice(0, 3);
  const rest = filteredList.slice(3);

  // Podium order: 2nd, 1st, 3rd
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);
  const podiumHeights = [top3[1] ? true : false, true, top3[2] ? true : false];

  const podiumConfig = [
    {
      rank: 2,
      avatarBg: "var(--bg-card)",
      avatarColor: "var(--text-heading)",
      ptsColor: "var(--purple-2)",
      height: "80px",
    },
    {
      rank: 1,
      avatarBg: "var(--text-heading)",
      avatarColor: "var(--bg-base)",
      ptsColor: "var(--purple-2)",
      height: "110px",
      crown: true,
    },
    {
      rank: 3,
      avatarBg: "var(--bg-card)",
      avatarColor: "var(--text-heading)",
      ptsColor: "var(--purple-2)",
      height: "60px",
    },
  ];

  if (loading) {
    return (
      <RequireAuth>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "60vh",
          }}
        >
          <div className="spinner" />
        </div>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth>
      <div
        className="animate-fade-in"
        style={{
          width: "100%",
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "2rem",
          display: "flex",
          flexDirection: "column",
          gap: "2rem",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div>
            <p className="section-label" style={{ marginBottom: "0.3rem" }}>
              RISE UP THE RANKS
            </p>
            <h1
              style={{
                fontSize: "2.25rem",
                fontWeight: "800",
                color: "var(--text-heading)",
              }}
            >
              Leaderboard
            </h1>
          </div>

          {/* Filter tabs */}
          <div
            style={{
              display: "flex",
              gap: "0.25rem",
              background: "var(--bg-card)",
              border: "1px solid var(--border-card)",
              borderRadius: "var(--radius-md)",
              padding: "0.25rem",
            }}
          >
            {FILTER_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveFilter(tab)}
                style={{
                  background:
                    activeFilter === tab
                      ? "var(--text-heading)"
                      : "none",
                  border: "none",
                  color:
                    activeFilter === tab
                      ? "var(--bg-base)"
                      : "var(--text-muted)",
                  padding: "0.38rem 1rem",
                  borderRadius: 0,
                  fontSize: "0.875rem",
                  fontWeight: activeFilter === tab ? "600" : "500",
                  cursor: "pointer",
                  transition: "all 0.18s",
                  fontFamily: "var(--font-body)",
                }}
              >
                {tab}
              </button>
            ))}
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
            {/* Podium */}
            {top3.length > 0 && (
              <div
                style={{
                  background: "var(--bg-card)",
                  border: "2px solid var(--border)",
                  borderRadius: "var(--radius-xl)",
                  padding: "2rem 2rem 0",
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "center",
                  gap: "1rem",
                  minHeight: "340px",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {podiumOrder.map((item, pIdx) => {
                  if (!item) return null;
                  const cfg = podiumConfig[pIdx];
                  if (!cfg) return null;
                  const isFirst = cfg.rank === 1;
                  return (
                    <div
                      key={item.userId}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "0.5rem",
                        flex: 1,
                        maxWidth: "200px",
                        zIndex: 1,
                      }}
                    >
                      {/* Crown for 1st */}
                      {cfg.crown && (
                        <span style={{ fontSize: "1.4rem", marginBottom: "0.1rem" }}>
                          👑
                        </span>
                      )}

                      {/* Avatar */}
                      <div
                        style={{
                          width: isFirst ? "80px" : "64px",
                          height: isFirst ? "80px" : "64px",
                          background: cfg.avatarBg,
                          border: "2px solid var(--border)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: isFirst ? "1.5rem" : "1.1rem",
                          fontWeight: "700",
                          color: cfg.avatarColor,
                          fontFamily: "var(--font-heading)",
                        }}
                      >
                        {(item.email[0] || "?").toUpperCase()}
                      </div>

                      {/* Name + handle */}
                      <div style={{ textAlign: "center" }}>
                        <div
                          style={{
                            fontSize: isFirst ? "0.95rem" : "0.85rem",
                            fontWeight: "700",
                            color: "var(--text-heading)",
                          }}
                        >
                          {item.email.split("@")[0]}
                        </div>
                        <div
                          style={{
                            fontSize: "0.72rem",
                            color: "var(--text-muted)",
                          }}
                        >
                          @{item.email.split("@")[0]}
                        </div>
                        <div
                          style={{
                            fontSize: "0.78rem",
                            fontWeight: "700",
                            color: cfg.ptsColor,
                            marginTop: "0.2rem",
                          }}
                        >
                          {item.rating.toLocaleString()} pts
                        </div>
                      </div>

                      {/* Rank block (podium pillar) */}
                      <div
                        style={{
                          width: "100%",
                          height: cfg.height,
                          background: isFirst ? "var(--purple-1)" : "var(--text-heading)",
                          borderRadius: "var(--radius-md) var(--radius-md) 0 0",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "2rem",
                          fontWeight: "700",
                          fontFamily: "var(--font-heading)",
                          color: "var(--bg-base)",
                          marginTop: "0.25rem",
                        }}
                      >
                        {cfg.rank}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Table section */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: "0.5rem",
              }}
            >
              <div className="search-input-wrap" style={{ maxWidth: "280px" }}>
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
                  placeholder="Search user..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div
              className="glass-panel"
              style={{ overflow: "hidden", border: "1px solid var(--border-card)" }}
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
                      background: "rgba(17,17,17,0.01)",
                    }}
                  >
                    {["Rank", "User", "Solved", "Country", "Score"].map(
                      (h, i) => (
                        <th
                          key={h}
                          style={{
                            padding: "0.9rem 1.25rem",
                            fontSize: "0.72rem",
                            fontWeight: "600",
                            color: "var(--text-muted)",
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                            textAlign:
                              i === 4 ? "right" : i === 2 ? "center" : "left",
                          }}
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rest.length === 0 && top3.length === 0 ? (
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
                        No programmers found. Join and solve problems to appear here!
                      </td>
                    </tr>
                  ) : rest.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        style={{
                          padding: "2rem",
                          textAlign: "center",
                          color: "var(--text-muted)",
                          fontSize: "0.85rem",
                        }}
                      >
                        Only the top 3 are visible. Climb higher to appear here!
                      </td>
                    </tr>
                  ) : (
                    rest.map((item) => (
                      <tr
                        key={item.userId}
                        className="table-row-hover"
                        style={{
                          borderBottom: "1px solid rgba(17,17,17,0.03)",
                          transition: "background 0.15s",
                        }}
                      >
                        <td
                          style={{
                            padding: "1rem 1.25rem",
                            fontWeight: "600",
                            color: "var(--text-muted)",
                            fontSize: "0.9rem",
                          }}
                        >
                          #{item.rank}
                        </td>
                        <td style={{ padding: "1rem 1.25rem" }}>
                          <div
                            style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}
                          >
                            <div
                              style={{
                                width: "30px",
                                height: "30px",
                                background: "var(--text-heading)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "0.75rem",
                                fontWeight: "700",
                                color: "var(--bg-base)",
                                flexShrink: 0,
                              }}
                            >
                              {(item.email[0] || "?").toUpperCase()}
                            </div>
                            <div>
                              <div
                                style={{
                                  fontWeight: "600",
                                  fontSize: "0.9rem",
                                  color: "var(--text-heading)",
                                }}
                              >
                                {item.email.split("@")[0]}
                              </div>
                              <div
                                style={{
                                  fontSize: "0.72rem",
                                  color: "var(--text-muted)",
                                }}
                              >
                                @{item.email.split("@")[0]}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td
                          style={{
                            padding: "1rem 1.25rem",
                            textAlign: "center",
                            fontWeight: "600",
                            fontSize: "0.9rem",
                            color: "var(--text-body)",
                          }}
                        >
                          {item.problemsSolved}
                        </td>
                        <td
                          style={{
                            padding: "1rem 1.25rem",
                            fontSize: "0.85rem",
                            color: "var(--text-muted)",
                            fontFamily: "var(--font-mono)",
                            letterSpacing: "0.04em",
                          }}
                        >
                          —
                        </td>
                        <td
                          style={{
                            padding: "1rem 1.25rem",
                            textAlign: "right",
                            fontWeight: "700",
                            fontSize: "0.95rem",
                            color: "var(--text-heading)",
                            fontFamily: "var(--font-heading)",
                          }}
                        >
                          {item.rating.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </RequireAuth>
  );
}

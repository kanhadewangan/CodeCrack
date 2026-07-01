"use client";

import { useEffect, useState } from "react";
import { leaderboardApi } from "../../lib/api";

interface LeaderboardItem {
  rank: number;
  userId: string;
  email: string;
  rating: number;
  problemsSolved: number;
  totalSubmissions: number;
}

export default function LeaderboardPage() {
  const [list, setList] = useState<LeaderboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadLeaderboard() {
      try {
        const data = await leaderboardApi.get();
        setList(data);
      } catch (err: any) {
        setError(err.message || "Failed to load leaderboard data.");
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
  const restOfList = filteredList.slice(3);

  // Helper colors for top 3
  const podiumStyles = [
    { border: "2px solid #fbbf24", bg: "rgba(251, 191, 36, 0.08)", icon: "🏆", label: "1st Place", color: "#fbbf24" },
    { border: "2px solid #9ca3af", bg: "rgba(156, 163, 175, 0.08)", icon: "🥈", label: "2nd Place", color: "#d1d5db" },
    { border: "2px solid #b45309", bg: "rgba(180, 83, 9, 0.08)", icon: "🥉", label: "3rd Place", color: "#d97706" }
  ];

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
        <p style={{ color: "var(--text-muted)", fontSize: "1.1rem" }}>Loading leaderboard...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      {/* Title section */}
      <div style={{ textAlign: "center" }}>
        <h1 style={{
          fontSize: "2.5rem",
          fontWeight: "800",
          background: "linear-gradient(135deg, var(--primary), var(--accent))",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          marginBottom: "0.5rem"
        }}>
          Code-Athletes Leaderboard
        </h1>
        <p style={{ color: "var(--text-muted)" }}>
          Top programmers ranked by their active problem solving points and rating.
        </p>
      </div>

      {error ? (
        <div style={{
          background: "rgba(239, 68, 68, 0.1)",
          border: "1px solid rgba(239, 68, 68, 0.2)",
          color: "var(--hard)",
          padding: "1rem",
          borderRadius: "8px",
          textAlign: "center"
        }}>
          {error}
        </div>
      ) : (
        <>
          {/* Podium layout for top 3 */}
          {top3.length > 0 && (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "1.5rem",
              marginTop: "1.5rem"
            }}>
              {top3.map((item, idx) => {
                const style = (podiumStyles[idx] || podiumStyles[2]) as { border: string; bg: string; icon: string; label: string; color: string };
                return (
                  <div
                    key={item.userId}
                    className="glass-panel"
                    style={{
                      border: style.border,
                      background: style.bg,
                      padding: "2rem",
                      textAlign: "center",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "0.5rem"
                    }}
                  >
                    <span style={{ fontSize: "2.5rem" }}>{style.icon}</span>
                    <span style={{ fontSize: "0.75rem", fontWeight: "700", textTransform: "uppercase", color: style.color }}>
                      {style.label}
                    </span>
                    <h3 style={{ fontSize: "1.25rem", fontWeight: "bold", wordBreak: "break-all" }}>
                      {item.email.split("@")[0]}
                    </h3>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
                      {item.email}
                    </p>
                    <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.05)", width: "100%", paddingTop: "0.75rem", marginTop: "0.5rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-around" }}>
                        <div>
                          <span style={{ display: "block", fontSize: "1.25rem", fontWeight: "bold", color: style.color }}>
                            {item.rating}
                          </span>
                          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Rating</span>
                        </div>
                        <div>
                          <span style={{ display: "block", fontSize: "1.25rem", fontWeight: "bold", color: "var(--easy)" }}>
                            {item.problemsSolved}
                          </span>
                          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Solved</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Search bar */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
            <input
              type="text"
              className="input-field"
              placeholder="Search user by email..."
              style={{ maxWidth: "300px" }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Leaderboard Table List */}
          <div className="glass-panel" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "600px", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "rgba(255, 255, 255, 0.02)", borderBottom: "1px solid var(--border)" }}>
                  <th style={{ padding: "1.25rem", color: "var(--text-muted)", fontWeight: "600" }}>Rank</th>
                  <th style={{ padding: "1.25rem", color: "var(--text-muted)", fontWeight: "600" }}>Programmer</th>
                  <th style={{ padding: "1.25rem", color: "var(--text-muted)", fontWeight: "600", textAlign: "center" }}>Rating</th>
                  <th style={{ padding: "1.25rem", color: "var(--text-muted)", fontWeight: "600", textAlign: "center" }}>Problems Solved</th>
                  <th style={{ padding: "1.25rem", color: "var(--text-muted)", fontWeight: "600", textAlign: "center" }}>Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {restOfList.length === 0 && top3.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: "2rem", color: "var(--text-muted)", textAlign: "center" }}>
                      No programmers found. Join and solve problems to appear here!
                    </td>
                  </tr>
                ) : (
                  restOfList.map((item) => (
                    <tr
                      key={item.userId}
                      style={{
                        borderBottom: "1px solid rgba(255, 255, 255, 0.03)",
                        transition: "background 0.2s"
                      }}
                      className="table-row-hover"
                    >
                      <td style={{ padding: "1.25rem", fontWeight: "bold", color: "var(--text-muted)" }}>
                        #{item.rank}
                      </td>
                      <td style={{ padding: "1.25rem" }}>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontWeight: "600" }}>{item.email.split("@")[0]}</span>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{item.email}</span>
                        </div>
                      </td>
                      <td style={{ padding: "1.25rem", textAlign: "center", fontWeight: "700", color: "var(--primary)" }}>
                        {item.rating}
                      </td>
                      <td style={{ padding: "1.25rem", textAlign: "center", fontWeight: "600", color: "var(--easy)" }}>
                        {item.problemsSolved}
                      </td>
                      <td style={{ padding: "1.25rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                        {item.totalSubmissions > 0
                          ? `${Math.round((item.problemsSolved / item.totalSubmissions) * 100)}%`
                          : "0%"}
                        <span style={{ display: "block", fontSize: "0.7rem", color: "#4b5563" }}>
                          ({item.totalSubmissions} attempts)
                        </span>
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
  );
}

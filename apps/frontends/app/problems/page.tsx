"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { problemsApi, submissionsApi } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

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
  const [solvedProblemIds, setSolvedProblemIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const data = await problemsApi.list();
        setProblems(data);

        // If user is logged in, find their successfully solved problem IDs
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
        setError(err.message || "Failed to fetch problems from servers.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  const filteredProblems = problems.filter((prob) => {
    const matchesSearch = prob.title.toLowerCase().includes(search.toLowerCase()) ||
      prob.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase()));
    const matchesDifficulty = difficultyFilter === "" || prob.difficulty === difficultyFilter;
    return matchesSearch && matchesDifficulty;
  });

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
        <p style={{ color: "var(--text-muted)", fontSize: "1.1rem" }}>Loading problems bank...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <div>
        <h1 style={{
          fontSize: "2.2rem",
          fontWeight: "800",
          background: "linear-gradient(135deg, var(--primary), var(--accent))",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          marginBottom: "0.5rem"
        }}>
          Code Challenges
        </h1>
        <p style={{ color: "var(--text-muted)" }}>
          Solve algorithm challenges to raise your points and climb the global leaderboard.
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
          {/* Filters section */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1rem",
            alignItems: "center"
          }}>
            <div style={{ display: "flex", gap: "1rem", flex: 1, maxWidth: "500px" }}>
              <input
                type="text"
                className="input-field"
                placeholder="Search by title or topic..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={() => setDifficultyFilter("")}
                className="btn"
                style={{
                  padding: "0.4rem 0.8rem",
                  fontSize: "0.8rem",
                  background: difficultyFilter === "" ? "var(--primary)" : "rgba(255,255,255,0.05)",
                  color: "white"
                }}
              >
                All
              </button>
              <button
                onClick={() => setDifficultyFilter("EASY")}
                className="btn"
                style={{
                  padding: "0.4rem 0.8rem",
                  fontSize: "0.8rem",
                  background: difficultyFilter === "EASY" ? "rgba(16, 185, 129, 0.2)" : "rgba(255,255,255,0.05)",
                  color: "var(--easy)",
                  border: difficultyFilter === "EASY" ? "1px solid var(--easy)" : "none"
                }}
              >
                Easy
              </button>
              <button
                onClick={() => setDifficultyFilter("MEDIUM")}
                className="btn"
                style={{
                  padding: "0.4rem 0.8rem",
                  fontSize: "0.8rem",
                  background: difficultyFilter === "MEDIUM" ? "rgba(245, 158, 13, 0.2)" : "rgba(255,255,255,0.05)",
                  color: "var(--medium)",
                  border: difficultyFilter === "MEDIUM" ? "1px solid var(--medium)" : "none"
                }}
              >
                Medium
              </button>
              <button
                onClick={() => setDifficultyFilter("HARD")}
                className="btn"
                style={{
                  padding: "0.4rem 0.8rem",
                  fontSize: "0.8rem",
                  background: difficultyFilter === "HARD" ? "rgba(239, 68, 68, 0.2)" : "rgba(255,255,255,0.05)",
                  color: "var(--hard)",
                  border: difficultyFilter === "HARD" ? "1px solid var(--hard)" : "none"
                }}
              >
                Hard
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="glass-panel" style={{ overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "600px", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "rgba(255, 255, 255, 0.02)", borderBottom: "1px solid var(--border)" }}>
                  <th style={{ padding: "1.25rem", color: "var(--text-muted)", width: "80px", textAlign: "center" }}>Status</th>
                  <th style={{ padding: "1.25rem", color: "var(--text-muted)" }}>Title</th>
                  <th style={{ padding: "1.25rem", color: "var(--text-muted)", width: "120px" }}>Difficulty</th>
                  <th style={{ padding: "1.25rem", color: "var(--text-muted)" }}>Topics</th>
                  <th style={{ padding: "1.25rem", color: "var(--text-muted)", width: "125px", textAlign: "center" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredProblems.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
                      No problems match the filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredProblems.map((prob) => {
                    const isSolved = solvedProblemIds.has(prob.id);
                    return (
                      <tr
                        key={prob.id}
                        style={{
                          borderBottom: "1px solid rgba(255, 255, 255, 0.03)",
                          backgroundColor: isSolved ? "rgba(16, 185, 129, 0.01)" : "transparent",
                          transition: "all 0.2s"
                        }}
                      >
                        {/* Solved Status Indicator Icon */}
                        <td style={{ padding: "1.25rem", textAlign: "center" }}>
                          {isSolved ? (
                            <span style={{ color: "var(--easy)", fontSize: "1.1rem" }}>✔</span>
                          ) : (
                            <span style={{ color: "rgba(255,255,255,0.1)", fontSize: "1rem" }}>○</span>
                          )}
                        </td>

                        {/* Title & Link */}
                        <td style={{ padding: "1.25rem" }}>
                          <Link
                            href={`/problems/${prob.id}`}
                            style={{
                              fontWeight: "600",
                              fontSize: "1.05rem",
                              color: isSolved ? "rgba(255,200,200,0.9)" : "var(--foreground)",
                              transition: "color 0.2s"
                            }}
                          >
                            <span className="problem-link">
                              {prob.title}
                            </span>
                          </Link>
                        </td>

                        {/* Difficulty Badge */}
                        <td style={{ padding: "1.25rem" }}>
                          <span className={`badge badge-${prob.difficulty.toLowerCase()}`}>
                            {prob.difficulty}
                          </span>
                        </td>

                        {/* Topics/Tags */}
                        <td style={{ padding: "1.25rem" }}>
                          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                            {prob.tags.map((tag) => (
                              <span
                                key={tag}
                                style={{
                                  fontSize: "0.7rem",
                                  padding: "0.2rem 0.5rem",
                                  borderRadius: "4px",
                                  background: "rgba(255, 255, 255, 0.04)",
                                  border: "1px solid rgba(255, 255, 255, 0.05)",
                                  color: "var(--text-muted)"
                                }}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* solve Action */}
                        <td style={{ padding: "1.25rem", textAlign: "center" }}>
                          <Link href={`/problems/${prob.id}`} className={isSolved ? "btn btn-secondary" : "btn btn-primary"} style={{ padding: "0.35rem 0.85rem", fontSize: "0.8rem", width: "100%" }}>
                            {isSolved ? "Resolve" : "Solve"}
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { problemsApi, submissionsApi } from "../lib/api";

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

export default function Home() {
  const { user } = useAuth();
  const [featuredProblems, setFeaturedProblems] = useState<Problem[]>([]);
  const [recentSubmissions, setRecentSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const probs = await problemsApi.list();
        // Take a few featured problems
        setFeaturedProblems(probs.slice(0, 4));

        if (user) {
          try {
            const subs = await submissionsApi.list();
            // Fetch problem relations manually if needed, but since we retrieve user submissions:
            // submissions endpoint maps: id, problemId, code, language, status.
            // Let's resolve the problem titles using the fetched problems list.
            const enhancedSubs = subs.slice(0, 5).map((sub: any) => {
              const matchingProblem = probs.find((p) => p.id === sub.problemId);
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
          }
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
                <div key={prob.id} className="glass-card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", justifyBetween: "space-between", minHeight: "180px" }}>
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

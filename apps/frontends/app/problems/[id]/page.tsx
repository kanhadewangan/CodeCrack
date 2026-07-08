"use client";

import * as React from "react";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "../../../context/AuthContext";
import { problemsApi, submissionsApi, hintsApi, contestApi } from "../../../lib/api";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import RequireAuth from "../../../components/RequireAuth";

interface Problem {
  id: string;
  title: string;
  slug: string;
  description: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  tags: string[];
}

interface Submission {
  id: string;
  problemId: string;
  code: string;
  language: string;
  status: string;
  createdAt?: string;
}

const JS_TEMPLATE = `// Write your JavaScript solution here
// write  your code in a function and test it and submit it to see if it passes all the test cases
// Example:
// function solve() {
//   // Your solution logic here
//   console.log("Hello, World!");
// };
  
}`;

const PY_TEMPLATE = `# Write your Python solution here
import sys

def solve():
    lines = sys.stdin.read().splitlines()
    if not lines:
        return
    # Your solution logic here
    print(lines[0])

if __name__ == '__main__':
    solve()
`;

const TABS = ["Description", "Hints", "Editorial", "Submissions", "Discussion"];

export default function ProblemDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = useAuth();
  const { id } = React.use(params);
  const searchParams = useSearchParams();
  const contestId = searchParams.get("contestId");

  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hints, setHints] = useState<any[]>([]);
  const [newHint, setNewHint] = useState("");
  const [addingHint, setAddingHint] = useState(false);

  const [activeTab, setActiveTab] = useState<string>("Description");
  const [language, setLanguage] = useState<"javascript" | "python">(
    "javascript"
  );
  const [code, setCode] = useState(JS_TEMPLATE);

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<string | null>(null);
  const [submissionProgressLog, setSubmissionProgressLog] = useState<string[]>(
    []
  );
  const [selectedSubCode, setSelectedSubCode] = useState<string | null>(null);
  const [showConsole, setShowConsole] = useState(false);

  // NEW: controls the "Accepted" celebration overlay
  const [showAcceptedAnimation, setShowAcceptedAnimation] = useState(false);
  const acceptedTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function loadProblem() {
      try {
        const item = await problemsApi.get(id);
        setProblem(item);
        const hintsData = await hintsApi.getHints(id).catch(() => []);
        setHints(hintsData);
      } catch (err: any) {
        setError(err.message || "Failed to load problem.");
      } finally {
        setLoading(false);
      }
    }
    loadProblem();
    loadSubmissions();
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (acceptedTimeoutRef.current) clearTimeout(acceptedTimeoutRef.current);
    };
  }, [id, user]);

  useEffect(() => {
    setCode(language === "javascript" ? JS_TEMPLATE : PY_TEMPLATE);
  }, [language]);

  const loadSubmissions = async () => {
    if (!user) return;
    setLoadingSubmissions(true);
    try {
      if (contestId) {
        const data = await contestApi.getContestSubmissions(contestId);
        const list = Array.isArray(data?.submissions) ? data.submissions : [];
        setSubmissions(list.filter((s: any) => s.problemId === id));
      } else {
        const all = await submissionsApi.list();
        setSubmissions(all.filter((s: any) => s.problemId === id));
      }
    } catch {
      /* ignore */
    } finally {
      setLoadingSubmissions(false);
    }
  };

  // NEW: triggers the celebration overlay and auto-dismisses it
  const triggerAcceptedAnimation = () => {
    setShowAcceptedAnimation(true);
    if (acceptedTimeoutRef.current) clearTimeout(acceptedTimeoutRef.current);
    acceptedTimeoutRef.current = setTimeout(() => {
      setShowAcceptedAnimation(false);
    }, 3200);
  };

  const pollSubmissionStatus = (subId: string) => {
    let attempts = 0;
    setSubmissionProgressLog(["Spawning compilation sandbox context..."]);

    pollIntervalRef.current = setInterval(async () => {
      attempts++;
      if (attempts > 30) {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        setSubmissionStatus("TIME_LIMIT_EXCEEDED");
        setSubmissionProgressLog((p) => [
          ...p,
          "Timed out checking status from judge runner queue.",
        ]);
        setSubmitting(false);
        loadSubmissions();
        return;
      }
      try {
        const statusData = await submissionsApi.get(subId);
        setSubmissionStatus(statusData.status);
        if (statusData.status === "PENDING") {
          setSubmissionProgressLog((p) => [
            ...p,
            `Waiting in queue (attempt ${attempts})...`,
          ]);
        } else if (statusData.status === "RUNNING") {
          setSubmissionProgressLog((p) => [
            ...p,
            "Compiling and executing test cases...",
          ]);
        } else {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setSubmissionProgressLog((p) => [
            ...p,
            `Verdict reached: ${statusData.status} ✔`,
          ]);
          setSubmitting(false);
          loadSubmissions();

          // NEW: fire the celebration animation on acceptance
          if (statusData.status === "ACCEPTED") {
            triggerAcceptedAnimation();
          }
        }
      } catch {
        /* ignore */
      }
    }, 1200);
  };

  const handleSubmit = async () => {
    if (!user) {
      setError("You must be logged in to submit code.");
      return;
    }
    setSubmitting(true);
    setSubmissionStatus("PENDING");
    setShowConsole(true);
    setSubmissionProgressLog(["Registering submission request with core server API..."]);
    try {
      const payload = {
        problemId: id,
        code,
        language: language === "javascript" ? "js" : "py",
      };
      const response = contestId
        ? await contestApi.submitContestProblem({ ...payload, contestId })
        : await submissionsApi.submit(payload);
      if (response.submissionId) {
        pollSubmissionStatus(response.submissionId);
      } else {
        setSubmissionProgressLog((p) => [
          ...p,
          "Failed to fetch session queue tracker token.",
        ]);
        setSubmitting(false);
      }
    } catch (err: any) {
      setSubmissionStatus("RUNTIME_ERROR");
      setSubmissionProgressLog((p) => [
        ...p,
        `Core request failed: ${err.message}`,
      ]);
      setSubmitting(false);
    }
  };

  const getBadgeClass = (status: string) => {
    switch (status.toUpperCase()) {
      case "ACCEPTED":
        return "badge-accepted";
      case "PENDING":
      case "RUNNING":
        return "badge-pending";
      default:
        return "badge-failed";
    }
  };

  if (loading) {
    return (
      <RequireAuth>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "70vh",
          }}
        >
          <div className="spinner" />
        </div>
      </RequireAuth>
    );
  }

  if (error || !problem) {
    return (
      <RequireAuth>
        <div
          style={{
            maxWidth: "1280px",
            margin: "0 auto",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <h3
            style={{ color: "var(--hard)", marginBottom: "1rem", fontSize: "1.2rem" }}
          >
            Problem not found
          </h3>
          <p
            style={{
              color: "var(--text-muted)",
              marginBottom: "1.5rem",
              fontSize: "0.9rem",
            }}
          >
            {error || "The requested problem could not be found."}
          </p>
          <Link href="/problems" className="btn btn-secondary">
            ← Back to Problems
          </Link>
        </div>
      </RequireAuth>
    );
  }

  // Parse description into sections
  const descLines = problem.description.split("\n");

  return (
    <RequireAuth>
      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "0",
          display: "flex",
          flexDirection: "column",
          height: "calc(100vh - 60px)",
        }}
        className="animate-fade-in"
      >
        {/* Breadcrumb */}
        <div
          style={{
            padding: "0.65rem 1.5rem",
            borderBottom: "1px solid var(--border-soft)",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            fontSize: "0.82rem",
            color: "var(--text-muted)",
          }}
        >
          {contestId ? (
            <>
              <Link
                href={`/contests/${contestId}`}
                style={{ color: "var(--text-muted)", transition: "color 0.15s" }}
              >
                ← Contest
              </Link>
              <span>/</span>
            </>
          ) : (
            <>
          <Link
            href="/problems"
            style={{ color: "var(--text-muted)", transition: "color 0.15s" }}
          >
            ← All problems
          </Link>
          <span>/</span>
            </>
          )}
          <span style={{ color: "var(--text-heading)", fontWeight: "500" }}>
            {problem.title}
          </span>
          {contestId && (
            <span
              style={{
                marginLeft: "auto",
                border: "1px solid rgba(34,197,94,0.24)",
                color: "var(--easy)",
                borderRadius: "999px",
                padding: "0.18rem 0.55rem",
                fontSize: "0.68rem",
                fontWeight: 700,
                textTransform: "uppercase",
              }}
            >
              Contest submission
            </span>
          )}
        </div>

        {/* Split layout */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            flex: 1,
            overflow: "hidden",
          }}
        >
          {/* LEFT: Problem description */}
          <div
            style={{
              borderRight: "1px solid var(--border-soft)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Tabs */}
            <div
              style={{
                borderBottom: "1px solid var(--border-soft)",
                display: "flex",
                background: "var(--bg-surface)",
                overflow: "auto",
              }}
            >
              {TABS.map((tab) => (
                <button
                  key={tab}
                  className={`tab-btn ${activeTab === tab ? "active" : ""}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>
              {activeTab === "Description" && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1.25rem",
                  }}
                >
                  {/* Title block */}
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.6rem",
                        marginBottom: "0.65rem",
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        className={`badge badge-${problem.difficulty.toLowerCase()}`}
                      >
                        {problem.difficulty.charAt(0) +
                          problem.difficulty.slice(1).toLowerCase()}
                      </span>
                      <span
                        style={{
                          fontSize: "0.78rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        Acceptance 54.2%
                      </span>
                    </div>
                    <h1
                      style={{
                        fontSize: "1.4rem",
                        fontWeight: "700",
                        color: "var(--text-heading)",
                        lineHeight: 1.3,
                      }}
                    >
                      {problem.title}
                    </h1>
                  </div>

                  {/* Tags */}
                  {problem.tags.length > 0 && (
                    <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                      {problem.tags.map((tag) => (
                        <span
                          key={tag}
                          style={{
                            fontSize: "0.68rem",
                            padding: "0.2rem 0.55rem",
                            borderRadius: "4px",
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.07)",
                            color: "var(--text-muted)",
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Description body */}
                  <div
                    style={{
                      fontSize: "0.9rem",
                      lineHeight: 1.75,
                      color: "var(--text-body)",
                      borderTop: "1px solid var(--border-soft)",
                      paddingTop: "1rem",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {problem.description}
                  </div>
                </div>
              )}

              {activeTab === "Hints" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  <h3
                    style={{
                      fontSize: "1.1rem",
                      fontWeight: "600",
                      color: "var(--text-heading)",
                    }}
                  >
                    Hints
                  </h3>
                  {hints.length === 0 ? (
                    <div style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>No hints available for this problem yet.</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      {hints.map((hint, idx) => (
                        <div key={hint.id} className="glass-card" style={{ padding: "0.9rem", fontSize: "0.9rem", lineHeight: 1.5 }}>
                          <strong style={{ color: "var(--purple-3)" }}>Hint {idx + 1}:</strong> {hint.hint}
                        </div>
                      ))}
                    </div>
                  )}
                  {user && (
                    <div style={{ marginTop: "1rem" }}>
                      <textarea
                        value={newHint}
                        onChange={(e) => setNewHint(e.target.value)}
                        placeholder="Share a helpful hint for this problem..."
                        style={{
                          width: "100%",
                          background: "var(--bg-input)",
                          border: "1px solid var(--border-soft)",
                          color: "var(--text-body)",
                          padding: "0.75rem",
                          borderRadius: "8px",
                          resize: "vertical",
                          minHeight: "80px",
                          fontFamily: "var(--font-body)",
                          fontSize: "0.9rem",
                          marginBottom: "0.5rem"
                        }}
                      />
                      <button
                        className="btn btn-primary btn-sm"
                        disabled={addingHint || !newHint.trim()}
                        onClick={async () => {
                          setAddingHint(true);
                          try {
                            const added = await hintsApi.addHint({ problemId: id, hint: newHint.trim() });
                            setHints([...hints, added]);
                            setNewHint("");
                          } catch (err) {
                            console.error(err);
                            alert("Failed to add hint.");
                          } finally {
                            setAddingHint(false);
                          }
                        }}
                      >
                        {addingHint ? "Adding..." : "Add Hint"}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "Submissions" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <h3
                    style={{
                      fontSize: "0.95rem",
                      fontWeight: "600",
                      color: "var(--text-heading)",
                      marginBottom: "0.25rem",
                    }}
                    >
                    {contestId ? "Contest Submissions" : "My Submissions"} ({submissions.length})
                  </h3>
                  {!user ? (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "2rem",
                        color: "var(--text-muted)",
                        fontSize: "0.85rem",
                      }}
                    >
                      Please{" "}
                      <Link
                        href="/login"
                        style={{
                          color: "var(--primary)",
                          fontWeight: "600",
                        }}
                      >
                        log in
                      </Link>{" "}
                      to view your submissions.
                    </div>
                  ) : loadingSubmissions ? (
                    <div className="spinner" style={{ margin: "2rem auto" }} />
                  ) : submissions.length === 0 ? (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "2rem",
                        color: "var(--text-muted)",
                        fontSize: "0.85rem",
                      }}
                    >
                      No submissions yet for this problem.
                    </div>
                  ) : (
                    submissions.map((sub) => (
                      <div
                        key={sub.id}
                        onClick={() =>
                          setSelectedSubCode(
                            sub.code === selectedSubCode ? null : sub.code
                          )
                        }
                        className="glass-card"
                        style={{ padding: "0.9rem", cursor: "pointer" }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <span
                            className={`badge ${getBadgeClass(sub.status)}`}
                            style={{ fontSize: "0.65rem" }}
                          >
                            {sub.status}
                          </span>
                          <span
                            style={{
                              fontSize: "0.72rem",
                              color: "var(--text-muted)",
                              fontFamily: "var(--font-mono)",
                            }}
                          >
                            {sub.language.toUpperCase()}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: "0.68rem",
                            color: "var(--text-dim)",
                            marginTop: "0.25rem",
                            wordBreak: "break-all",
                          }}
                        >
                          {sub.id}
                        </div>
                        {selectedSubCode === sub.code && (
                          <div style={{ marginTop: "0.75rem" }}>
                            <pre
                              style={{
                                background: "rgba(0,0,0,0.5)",
                                border: "1px solid rgba(34,197,94,0.2)",
                                borderLeft: "3px solid var(--easy)",
                                padding: "0.75rem",
                                borderRadius: "6px",
                                fontFamily: "var(--font-mono)",
                                fontSize: "0.72rem",
                                color: "var(--easy)",
                                overflowX: "auto",
                                lineHeight: 1.6,
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {sub.code}
                            </pre>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setCode(sub.code);
                                setLanguage(
                                  sub.language === "py" ? "python" : "javascript"
                                );
                              }}
                              className="btn btn-secondary"
                              style={{
                                marginTop: "0.5rem",
                                padding: "0.25rem 0.65rem",
                                fontSize: "0.72rem",
                              }}
                            >
                              Load into Editor
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {(activeTab === "Editorial" || activeTab === "Discussion") && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "3rem",
                    color: "var(--text-muted)",
                    fontSize: "0.9rem",
                  }}
                >
                  <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>
                    {activeTab === "Editorial" ? "📝" : "💬"}
                  </div>
                  {activeTab === "Editorial"
                    ? "Editorial will be available after the contest ends."
                    : "Discussion threads coming soon."}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Code editor */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              background: "var(--bg-surface)",
            }}
          >
            {/* Editor toolbar */}
            <div
              style={{
                height: "48px",
                borderBottom: "1px solid var(--border-soft)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 1rem",
                gap: "0.75rem",
                flexShrink: 0,
                background: "var(--bg-elevated)",
              }}
            >
              {/* Language selector */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-card)",
                  borderRadius: "8px",
                  padding: "0.25rem 0.4rem 0.25rem 0.65rem",
                  fontSize: "0.82rem",
                  color: "var(--text-heading)",
                  fontWeight: "600",
                }}
              >
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background:
                      language === "javascript" ? "#F0DB4F" : "#3776AB",
                    flexShrink: 0,
                  }}
                />
                <select
                  value={language}
                  disabled={submitting}
                  onChange={(e) => setLanguage(e.target.value as any)}
                  style={{
                    background: "none",
                    border: "none",
                    outline: "none",
                    color: "var(--text-heading)",
                    fontSize: "0.82rem",
                    fontWeight: "600",
                    cursor: "pointer",
                    fontFamily: "var(--font-body)",
                    padding: "0",
                    appearance: "none",
                  }}
                >
                  <option value="javascript" style={{ background: "#111119" }}>
                    JavaScript
                  </option>
                  <option value="python" style={{ background: "#111119" }}>
                    Python
                  </option>
                </select>
                <span style={{ color: "var(--text-dim)", fontSize: "0.7rem" }}>
                  ▾
                </span>
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={() => setShowConsole((p) => !p)}
                  className="btn btn-ghost"
                  style={{ padding: "0.3rem 0.75rem", fontSize: "0.8rem" }}
                >
                  ▶ Run
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="btn btn-primary"
                  style={{ padding: "0.3rem 0.9rem", fontSize: "0.8rem" }}
                >
                  {submitting ? (
                    <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <div
                        style={{
                          width: "12px",
                          height: "12px",
                          borderRadius: "50%",
                          border: "2px solid rgba(255,255,255,0.3)",
                          borderTopColor: "#fff",
                          animation: "spin 0.7s linear infinite",
                        }}
                      />
                      Submitting...
                    </span>
                  ) : (
                    "✦ Submit"
                  )}
                </button>
              </div>
            </div>

            {/* Code textarea */}
            <div
              style={{ flex: 1, position: "relative", overflow: "hidden" }}
            >
              <textarea
                value={code}
                disabled={submitting}
                onChange={(e) => setCode(e.target.value)}
                spellCheck={false}
                style={{
                  width: "100%",
                  height: "100%",
                  background: "#09090F",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.85rem",
                  color: "#A5B4FC",
                  padding: "1.1rem 1.25rem",
                  border: "none",
                  outline: "none",
                  resize: "none",
                  lineHeight: 1.65,
                  tabSize: 2,
                }}
              />
            </div>

            {/* Console / Test results panel */}
            <div
              style={{
                borderTop: "1px solid var(--border-soft)",
                background: "var(--bg-elevated)",
                flexShrink: 0,
              }}
            >
              {/* Console toggle tabs */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.15rem",
                  padding: "0 0.75rem",
                  borderBottom: showConsole
                    ? "1px solid var(--border-soft)"
                    : "none",
                }}
              >
                <button
                  className={`tab-btn ${showConsole ? "active" : ""}`}
                  onClick={() => setShowConsole((p) => !p)}
                  style={{ fontSize: "0.78rem", padding: "0.55rem 0.75rem" }}
                >
                  🖥 Test results
                </button>
                <button
                  className="tab-btn"
                  style={{
                    fontSize: "0.78rem",
                    padding: "0.55rem 0.75rem",
                    color: "var(--text-dim)",
                  }}
                >
                  ⏱ Console
                </button>
              </div>

              {showConsole && (
                <div style={{ padding: "0.75rem 1rem" }}>
                  {submissionStatus ? (
                    <>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: "0.5rem",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.78rem",
                            color: "var(--text-muted)",
                          }}
                        >
                          Status
                        </span>
                        <span
                          className={`badge ${getBadgeClass(submissionStatus)}`}
                          style={{ fontSize: "0.65rem" }}
                        >
                          {submissionStatus}
                        </span>
                      </div>
                      <div
                        style={{
                          background: "rgba(0,0,0,0.35)",
                          borderRadius: "6px",
                          padding: "0.5rem 0.75rem",
                          fontFamily: "var(--font-mono)",
                          fontSize: "0.72rem",
                          color: "rgba(255,255,255,0.6)",
                          maxHeight: "100px",
                          overflowY: "auto",
                          lineHeight: 1.6,
                        }}
                      >
                        {submissionProgressLog.map((log, idx) => (
                          <div key={idx}>
                            <span style={{ color: "var(--purple-3)" }}>›</span>{" "}
                            {log}
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p
                      style={{
                        fontSize: "0.78rem",
                        color: "var(--text-dim)",
                        textAlign: "center",
                        padding: "0.75rem 0",
                      }}
                    >
                      Click Run to execute the sample tests.
                    </p>
                  )}
                </div>
              )}

              {!showConsole && (
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-dim)",
                    padding: "0.6rem 1rem",
                  }}
                >
                  Click Run to execute the sample tests.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* NEW: Accepted celebration overlay */}
      {showAcceptedAnimation && (
        <div
          className="accepted-overlay"
          onClick={() => setShowAcceptedAnimation(false)}
        >
          <div className="accepted-card">
            <div className="confetti-wrap">
              {Array.from({ length: 26 }).map((_, i) => (
                <span
                  key={i}
                  className="confetti-piece"
                  style={{
                    left: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 0.5}s`,
                    background: [
                      "#22c55e",
                      "#a5b4fc",
                      "#f0db4f",
                      "#f472b6",
                      "#38bdf8",
                    ][i % 5],
                  }}
                />
              ))}
            </div>
            <svg className="accepted-check" viewBox="0 0 52 52">
              <circle
                className="accepted-check-circle"
                cx="26"
                cy="26"
                r="24"
                fill="none"
              />
              <path
                className="accepted-check-mark"
                fill="none"
                d="M14.1 27.2l7.1 7.2 16.7-16.8"
              />
            </svg>
            <h2 className="accepted-title">Accepted</h2>
            <p className="accepted-sub">All test cases passed 🎉</p>
          </div>
        </div>
      )}

      {/* NEW: animation styles */}
      <style>{`
        @keyframes accepted-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes accepted-pop {
          0% { transform: scale(0.6); opacity: 0; }
          60% { transform: scale(1.06); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes accepted-circle-draw {
          from { stroke-dashoffset: 166; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes accepted-check-draw {
          from { stroke-dashoffset: 48; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes confetti-fall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(240px) rotate(360deg); opacity: 0; }
        }

        .accepted-overlay {
          position: fixed;
          inset: 0;
          background: rgba(5, 5, 10, 0.72);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 999;
          animation: accepted-fade-in 0.25s ease-out;
          backdrop-filter: blur(4px);
        }

        .accepted-card {
          position: relative;
          background: var(--bg-elevated, #14141c);
          border: 1px solid rgba(34, 197, 94, 0.35);
          border-radius: 16px;
          padding: 2.5rem 3rem;
          text-align: center;
          box-shadow: 0 0 60px rgba(34, 197, 94, 0.18);
          animation: accepted-pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
          overflow: hidden;
          min-width: 260px;
        }

        .accepted-check {
          width: 84px;
          height: 84px;
          margin: 0 auto 1rem;
          display: block;
          position: relative;
          z-index: 1;
        }

        .accepted-check-circle {
          stroke: var(--easy, #22c55e);
          stroke-width: 3;
          stroke-dasharray: 166;
          stroke-dashoffset: 166;
          animation: accepted-circle-draw 0.6s ease-out forwards;
        }

        .accepted-check-mark {
          stroke: var(--easy, #22c55e);
          stroke-width: 4;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-dasharray: 48;
          stroke-dashoffset: 48;
          animation: accepted-check-draw 0.4s 0.5s ease-out forwards;
        }

        .accepted-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--easy, #22c55e);
          margin: 0 0 0.4rem;
          letter-spacing: 0.02em;
          position: relative;
          z-index: 1;
        }

        .accepted-sub {
          font-size: 0.9rem;
          color: var(--text-muted, #999);
          margin: 0;
          position: relative;
          z-index: 1;
        }

        .confetti-wrap {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
        }

        .confetti-piece {
          position: absolute;
          top: -10px;
          width: 6px;
          height: 12px;
          opacity: 0.9;
          border-radius: 2px;
          animation: confetti-fall 1.8s ease-in forwards;
        }
      `}</style>
    </RequireAuth>
  );
}

"use client";

import * as React from "react";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "../../../context/AuthContext";
import { problemsApi, submissionsApi } from "../../../lib/api";
import Link from "next/link";

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
// Input is passed details through process.argv or standard stdin parser.
// For testing, read input from standard input:
// Example:
const fs = require('fs');
const input = fs.readFileSync('/dev/stdin', 'utf-8').trim();

function solve(inputData) {
  // Your solution logic here
  console.log(inputData);
}

solve(input);
`;

const PY_TEMPLATE = `# Write your Python solution here
# Read standard input and print the results
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

export default function ProblemDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = useAuth();
  const { id } = React.use(params);

  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState<"description" | "submissions">("description");
  const [language, setLanguage] = useState<"javascript" | "python">("javascript");
  const [code, setCode] = useState(JS_TEMPLATE);

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<string | null>(null);
  const [submissionProgressLog, setSubmissionProgressLog] = useState<string[]>([]);
  const [selectedSubCode, setSelectedSubCode] = useState<string | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load problem details and previous submissions
  useEffect(() => {
    async function loadProblem() {
      try {
        const item = await problemsApi.get(id);
        setProblem(item);
      } catch (err: any) {
        setError(err.message || "Failed to load problem description.");
      } finally {
        setLoading(false);
      }
    }

    loadProblem();
    loadSubmissions();

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [id, user]);

  // Handle template updates on language toggling
  useEffect(() => {
    if (language === "javascript") {
      setCode(JS_TEMPLATE);
    } else {
      setCode(PY_TEMPLATE);
    }
  }, [language]);

  const loadSubmissions = async () => {
    if (!user) return;
    setLoadingSubmissions(true);
    try {
      const allSubmissions = await submissionsApi.list();
      const filtered = allSubmissions.filter((sub: any) => sub.problemId === id);
      setSubmissions(filtered);
    } catch (err) {
      console.error("Failed to load user submissions list:", err);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const pollSubmissionStatus = (subId: string) => {
    let attempts = 0;
    setSubmissionProgressLog((prev) => [...prev, "Spawning compilation sandbox context..."]);
    
    pollIntervalRef.current = setInterval(async () => {
      attempts++;
      if (attempts > 30) {
        // Stop polling after 30 seconds
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        setSubmissionStatus("TIME_LIMIT_EXCEEDED");
        setSubmissionProgressLog((prev) => [...prev, "Timed out checking status from judge runner queue."]);
        setSubmitting(false);
        loadSubmissions();
        return;
      }

      try {
        const statusData = await submissionsApi.get(subId);
        setSubmissionStatus(statusData.status);

        if (statusData.status === "PENDING") {
          setSubmissionProgressLog((prev) => [...prev, `Waiting in rabbitmq queue (attempt ${attempts})...`]);
        } else if (statusData.status === "RUNNING") {
          setSubmissionProgressLog((prev) => [...prev, "Compiling and executing test cases..."]);
        } else {
          // Verdict reached
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setSubmissionProgressLog((prev) => [
            ...prev,
            `Verdict reached: ${statusData.status} ✔`
          ]);
          setSubmitting(false);
          loadSubmissions();
        }
      } catch (err) {
        console.error("Poller check failed:", err);
      }
    }, 1200);
  };

  const handleSubSubmit = async () => {
    if (!user) {
      setError("You must be logged in to submit code.");
      return;
    }

    setSubmitting(true);
    setSubmissionStatus("PENDING");
    setSubmissionProgressLog(["Registering submission request with core server API..."]);

    try {
      const response = await submissionsApi.submit({
        problemId: id,
        code,
        language: language === "javascript" ? "js" : "py"
      });

      if (response.submissionId) {
        pollSubmissionStatus(response.submissionId);
      } else {
        setSubmissionProgressLog((prev) => [...prev, "Failed to fetch session queue tracker token."]);
        setSubmitting(false);
      }
    } catch (err: any) {
      setSubmissionStatus("RUNTIME_ERROR");
      setSubmissionProgressLog((prev) => [...prev, `Core request failed: ${err.message}`]);
      setSubmitting(false);
    }
  };

  // Helper badge color loader
  const getBadgeColorClass = (status: string) => {
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
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <p style={{ color: "var(--text-muted)", fontSize: "1.1rem" }}>Loading workbench workspace...</p>
      </div>
    );
  }

  if (error || !problem) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <h3 style={{ color: "var(--hard)", marginBottom: "1rem" }}>An Error Occurred</h3>
        <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>{error || "Problem requested was not found."}</p>
        <Link href="/problems" className="btn btn-secondary">
          Go back to Problems
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Back button */}
      <div>
        <Link href="/problems" style={{ color: "var(--text-muted)", fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
          ← Back to code bank
        </Link>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
        gap: "1.5rem",
        alignItems: "stretch"
      }}>
        {/* LEFT COLUMN: DESCRIPTION OR SUBMISSIONS */}
        <div className="glass-panel" style={{ display: "flex", flexDirection: "column", height: "700px" }}>
          {/* Tabs header */}
          <div style={{
            display: "flex",
            borderBottom: "1px solid var(--border)",
            background: "rgba(255, 255, 255, 0.01)"
          }}>
            <button
              onClick={() => setActiveTab("description")}
              style={{
                flex: 1,
                background: "none",
                border: "none",
                padding: "1rem",
                color: activeTab === "description" ? "var(--primary)" : "var(--text-muted)",
                fontWeight: activeTab === "description" ? "600" : "400",
                borderBottom: activeTab === "description" ? "2.5px solid var(--primary)" : "none",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              Problem Description
            </button>
            <button
              onClick={() => setActiveTab("submissions")}
              style={{
                flex: 1,
                background: "none",
                border: "none",
                padding: "1rem",
                color: activeTab === "submissions" ? "var(--primary)" : "var(--text-muted)",
                fontWeight: activeTab === "submissions" ? "600" : "400",
                borderBottom: activeTab === "submissions" ? "2.5px solid var(--primary)" : "none",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              My Runs ({submissions.length})
            </button>
          </div>

          {/* Tab content inside a scrollable view */}
          <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>
            {activeTab === "description" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <div>
                  <h2 style={{ fontSize: "1.75rem", fontWeight: "800", marginBottom: "0.5rem" }}>
                    {problem.title}
                  </h2>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                    <span className={`badge badge-${problem.difficulty.toLowerCase()}`}>
                      {problem.difficulty}
                    </span>
                    {problem.tags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          fontSize: "0.65rem",
                          padding: "0.15rem 0.4rem",
                          borderRadius: "4px",
                          background: "rgba(255, 255, 255, 0.05)",
                          color: "var(--text-muted)"
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    color: "rgba(255, 255, 255, 0.85)",
                    fontSize: "0.95rem",
                    lineHeight: "1.6",
                    whiteSpace: "pre-wrap",
                    borderTop: "1px solid rgba(255, 255, 255, 0.03)",
                    paddingTop: "1rem"
                  }}
                >
                  {problem.description}
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {!user ? (
                  <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                    Please <Link href="/login" style={{ color: "var(--primary)", fontWeight: "600" }}>log in</Link> to view your submission records.
                  </div>
                ) : loadingSubmissions ? (
                  <p style={{ color: "var(--text-muted)" }}>Loading records...</p>
                ) : submissions.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)", fontSize: "0.9rem" }}>
                    No solution history logged for this problem yet.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {submissions.map((sub) => (
                      <div
                        key={sub.id}
                        onClick={() => setSelectedSubCode(sub.code === selectedSubCode ? null : sub.code)}
                        className="glass-card"
                        style={{
                          padding: "1rem",
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.5rem"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span className={`badge ${getBadgeColorClass(sub.status)}`} style={{ padding: "0.2rem 0.5rem", fontSize: "0.7rem" }}>
                            {sub.status}
                          </span>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                            Language: {sub.language.toUpperCase()}
                          </span>
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "#6b7280", wordBreak: "break-all" }}>
                          Ref ID: {sub.id}
                        </div>
                        {selectedSubCode === sub.code && (
                          <div style={{ marginTop: "0.5rem" }}>
                            <pre style={{
                              background: "rgba(0,0,0,0.4)",
                              padding: "0.75rem",
                              borderRadius: "4px",
                              fontFamily: "var(--font-mono)",
                              fontSize: "0.75rem",
                              overflowX: "auto",
                              color: "#10b981",
                              borderLeft: "2px solid #10b981"
                            }} onClick={(e) => e.stopPropagation()}>
                              {sub.code}
                            </pre>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setCode(sub.code);
                                setLanguage(sub.language === "py" ? "python" : "javascript");
                              }}
                              className="btn btn-secondary"
                              style={{ transform: "scale(0.95)", marginTop: "0.5rem", padding: "0.25rem 0.6rem", fontSize: "0.75rem" }}
                            >
                              Restore Code To Console
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: CODING PLAYGROUND */}
        <div className="glass-panel" style={{ display: "flex", flexDirection: "column", height: "700px" }}>
          {/* Editor Header Toolbar */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0.75rem 1.25rem",
            borderBottom: "1px solid var(--border)",
            background: "rgba(255, 255, 255, 0.01)"
          }}>
            <span style={{ fontWeight: "600", fontSize: "0.9rem", color: "var(--text-muted)" }}>
              🔒 Interactive Playground
            </span>

            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Lang:</label>
              <select
                className="input-field"
                value={language}
                disabled={submitting}
                onChange={(e) => setLanguage(e.target.value as any)}
                style={{
                  background: "#0F172A",
                  padding: "0.25rem 0.5rem",
                  fontSize: "0.8rem",
                  width: "120px",
                  cursor: "pointer"
                }}
              >
                <option value="javascript">JavaScript (Node)</option>
                <option value="python">Python 3</option>
              </select>
            </div>
          </div>

          {/* Editor Textarea */}
          <div style={{ flex: 1, position: "relative" }}>
            <textarea
              className="input-field"
              value={code}
              disabled={submitting}
              onChange={(e) => setCode(e.target.value)}
              style={{
                width: "100%",
                height: "100%",
                background: "#090d16",
                fontFamily: "var(--font-mono)",
                fontSize: "0.85rem",
                color: "#10B981",
                padding: "1.25rem",
                border: "none",
                borderRadius: 0,
                resize: "none",
                outline: "none",
                lineHeight: "1.5"
              }}
            />
          </div>

          {/* Live submission Console Output status box */}
          {submissionStatus && (
            <div className="animate-fade-in" style={{
              background: "#0F1626",
              borderTop: "1px solid var(--border)",
              padding: "1rem 1.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "var(--text-muted)" }}>
                  Console Outputs
                </span>
                <span className={`badge ${getBadgeColorClass(submissionStatus)}`} style={{ fontSize: "0.75rem", padding: "0.2rem 0.6rem" }}>
                  {submissionStatus}
                </span>
              </div>
              <div style={{
                maxHeight: "100px",
                overflowY: "auto",
                background: "rgba(0, 0, 0, 0.3)",
                padding: "0.5rem 0.75rem",
                borderRadius: "4px",
                fontFamily: "var(--font-mono)",
                fontSize: "0.75rem",
                color: "#ffffff"
              }}>
                {submissionProgressLog.map((log, idx) => (
                  <div key={idx} style={{ marginBottom: "0.25rem" }}>
                    &gt; {log}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Bar Footer */}
          <div style={{
            padding: "0.75rem 1.5rem",
            borderTop: "1px solid var(--border)",
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center"
          }}>
            <button
              onClick={handleSubSubmit}
              disabled={submitting}
              className="btn btn-primary"
              style={{
                flex: "0 0 auto",
                padding: "0.5rem 1.5rem"
              }}
            >
              {submitting ? "Analyzing..." : "Submit Solution"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

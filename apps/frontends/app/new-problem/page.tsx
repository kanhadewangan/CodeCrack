"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { problemsApi } from "../../lib/api";

interface TestCaseInput {
  input: string;
  output: string;
}

export default function NewProblemPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState("EASY");
  const [tagsInput, setTagsInput] = useState("");
  const [testCases, setTestCases] = useState<TestCaseInput[]>([
    { input: "", output: "" }
  ]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAddTestCase = () => {
    setTestCases([...testCases, { input: "", output: "" }]);
  };

  const handleRemoveTestCase = (index: number) => {
    setTestCases(testCases.filter((_, i) => i !== index));
  };

  const handleTestCaseChange = (index: number, field: keyof TestCaseInput, value: string) => {
    const updated = [...testCases];
    if (updated[index]) {
      updated[index][field] = value;
      setTestCases(updated);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const payload = {
      title,
      description,
      difficulty,
      tags,
      testCases
    };

    try {
      await problemsApi.create(payload);
      setSuccess(true);
      setTimeout(() => {
        router.push("/problems");
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to create the problem. Verify if slug is unique.");
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{
          fontSize: "2rem",
          fontWeight: "800",
          background: "linear-gradient(135deg, var(--primary), var(--accent))",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          marginBottom: "0.5rem"
        }}>
          Create New Problem
        </h1>
        <p style={{ color: "var(--text-muted)" }}>
          Publish a coding challenge to get solved by users.
        </p>
      </div>

      {success && (
        <div style={{
          background: "rgba(16, 185, 129, 0.1)",
          border: "1px solid rgba(16, 185, 129, 0.2)",
          color: "var(--easy)",
          padding: "1rem",
          borderRadius: "8px",
          textAlign: "center",
          marginBottom: "2rem",
          fontWeight: "600"
        }}>
          ✓ Problem created successfully! Redirecting to problems bank...
        </div>
      )}

      {error && (
        <div style={{
          background: "rgba(239, 68, 68, 0.1)",
          border: "1px solid rgba(239, 68, 68, 0.2)",
          color: "var(--hard)",
          padding: "1rem",
          borderRadius: "8px",
          textAlign: "center",
          marginBottom: "2rem"
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: "2.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <label style={{ fontSize: "0.85rem", fontWeight: "600", textTransform: "uppercase", color: "var(--text-muted)" }}>
            Problem Title & Name
          </label>
          <input
            type="text"
            className="input-field"
            placeholder="e.g. Two Sum"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.85rem", fontWeight: "600", textTransform: "uppercase", color: "var(--text-muted)" }}>
              Difficulty Level
            </label>
            <select
              className="input-field"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              style={{ background: "#0F172A", cursor: "pointer" }}
            >
              <option value="EASY">EASY</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HARD">HARD</option>
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.85rem", fontWeight: "600", textTransform: "uppercase", color: "var(--text-muted)" }}>
              Tags (Comma separated)
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Array, Hash Table, Math"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <label style={{ fontSize: "0.85rem", fontWeight: "600", textTransform: "uppercase", color: "var(--text-muted)" }}>
            Description (Instructions, Examples, Constraints)
          </label>
          <textarea
            className="input-field"
            rows={8}
            placeholder="Describe the challenge details..."
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ fontFamily: "inherit", resize: "vertical" }}
          />
        </div>

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1.5rem", marginTop: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: "bold" }}>Test Cases</h3>
            <button type="button" onClick={handleAddTestCase} className="btn btn-secondary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}>
              + Add TestCase
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {testCases.map((tc, idx) => (
              <div key={idx} className="glass-card animate-fade-in" style={{ padding: "1.25rem", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: "bold", color: "var(--primary)" }}>
                    TestCase #{idx + 1}
                  </span>
                  {testCases.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTestCase(idx)}
                      style={{ background: "none", border: "none", color: "var(--hard)", cursor: "pointer", fontSize: "0.8rem" }}
                    >
                      Delete
                    </button>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Standard Input (stdin)</label>
                    <textarea
                      className="input-field"
                      rows={3}
                      placeholder="e.g. [2,7,11,15]\n9"
                      required
                      value={tc.input}
                      onChange={(e) => handleTestCaseChange(idx, "input", e.target.value)}
                      style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Expected Output (stdout)</label>
                    <textarea
                      className="input-field"
                      rows={3}
                      placeholder="e.g. [0,1]"
                      required
                      value={tc.output}
                      onChange={(e) => handleTestCaseChange(idx, "output", e.target.value)}
                      style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading || success}
          style={{ width: "100%", marginTop: "1rem" }}
        >
          {loading ? "Creating problem..." : "Publish Problem"}
        </button>
      </form>
    </div>
  );
}

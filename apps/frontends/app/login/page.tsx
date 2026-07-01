"use client";

import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import Link from "next/link";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || "Failed to log in. Please check your credentials.");
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "70vh",
      padding: "1rem"
    }}>
      <div className="glass-panel animate-fade-in" style={{
        width: "100%",
        maxWidth: "400px",
        padding: "2.5rem",
        boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.4)"
      }}>
        <h2 style={{
          marginBottom: "0.5rem",
          fontSize: "1.75rem",
          fontWeight: "bold",
          textAlign: "center",
          background: "linear-gradient(135deg, #a78bfa, #818cf8)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent"
        }}>
          Welcome Back
        </h2>
        <p style={{
          color: "var(--text-muted)",
          fontSize: "0.875rem",
          textAlign: "center",
          marginBottom: "2rem"
        }}>
          Sign in to your CodeJudge account
        </p>

        {error && (
          <div style={{
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            color: "var(--hard)",
            padding: "0.75rem",
            borderRadius: "6px",
            fontSize: "0.85rem",
            marginBottom: "1.5rem",
            textAlign: "center"
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>
              Email Address
            </label>
            <input
              type="email"
              className="input-field"
              placeholder="you@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>
              Password
            </label>
            <input
              type="password"
              className="input-field"
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: "100%", marginTop: "1rem" }}
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <p style={{
          marginTop: "1.5rem",
          fontSize: "0.85rem",
          textAlign: "center",
          color: "var(--text-muted)"
        }}>
          Don't have an account?{" "}
          <Link href="/register" style={{ color: "var(--primary)", fontWeight: "600" }}>
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}

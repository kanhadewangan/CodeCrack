"use client";

import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <header className="glass-panel" style={{
      position: "sticky",
      top: 0,
      zIndex: 100,
      borderRadius: "0 0 16px 16px",
      borderTop: "none",
      borderLeft: "none",
      borderRight: "none",
      marginBottom: "2rem"
    }}>
      <div style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "1rem 2rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        {/* Brand/Logo */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none" }}>
          <span style={{
            fontSize: "1.5rem",
            fontWeight: "bold",
            background: "linear-gradient(135deg, #818cf8, #a78bfa)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: "-0.025em"
          }}>
            CodeJudge
          </span>
          <span className="badge badge-easy" style={{ fontSize: "0.6rem", padding: "0.1rem 0.4rem" }}>
            v1.0
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
          <Link
            href="/"
            style={{
              color: isActive("/") ? "var(--primary)" : "var(--text-muted)",
              fontWeight: isActive("/") ? "600" : "400",
              transition: "color 0.2s"
            }}
          >
            Dashboard
          </Link>
          <Link
            href="/problems"
            style={{
              color: isActive("/problems") || pathname?.startsWith("/problems/") ? "var(--primary)" : "var(--text-muted)",
              fontWeight: isActive("/problems") || pathname?.startsWith("/problems/") ? "600" : "400",
              transition: "color 0.2s"
            }}
          >
            Problems
          </Link>
          <Link
            href="/leaderboard"
            style={{
              color: isActive("/leaderboard") ? "var(--primary)" : "var(--text-muted)",
              fontWeight: isActive("/leaderboard") ? "600" : "400",
              transition: "color 0.2s"
            }}
          >
            Leaderboard
          </Link>
          <Link
            href="/new-problem"
            style={{
              color: isActive("/new-problem") ? "var(--primary)" : "var(--text-muted)",
              fontWeight: isActive("/new-problem") ? "600" : "400",
              transition: "color 0.2s"
            }}
          >
            Add Problem
          </Link>
        </nav>

        {/* User Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#f3f4f6" }}>
                  {user.email.split("@")[0]}
                </span>
                {user.userStat && user.userStat[0] && (
                  <span style={{ fontSize: "0.75rem", color: "var(--easy)" }}>
                    ★ {user.userStat[0].rating} pts | ✔ {user.userStat[0].problemsSolved} solved
                  </span>
                )}
              </div>
              <button onClick={logout} className="btn btn-secondary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}>
                Logout
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <Link href="/login" className="btn btn-secondary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}>
                Log In
              </Link>
              <Link href="/register" className="btn btn-primary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}>
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

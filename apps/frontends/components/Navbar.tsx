"use client";

import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { streaksApi } from "../lib/api";

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [streaks, setStreaks] = useState<number | null>(null);

  useEffect(() => {
    if (!user) {
      setStreaks(null);
      return;
    }
    const loadStreaks = async () => {
      try {
        const data = await streaksApi.get();
        setStreaks(data?.streaks ?? 0);
      } catch {
        setStreaks(0);
      }
    };
    loadStreaks();
  }, [user]);

  const isActive = (path: string) =>
    path === "/" ? pathname === "/" : pathname?.startsWith(path);

  const navLinks = [
    { href: "/", label: "Dashboard" },
    { href: "/problems", label: "Problems" },
    { href: "/leaderboard", label: "Leaderboard" },
  ];

  if (user) {
    navLinks.push({ href: "/new-problem", label: "Add Problem" });
  }

  return (
    <>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "rgba(11,11,20,0.88)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          marginBottom: "0",
        }}
      >
        <div
          style={{
            maxWidth: "1280px",
            margin: "0 auto",
            padding: "0 2rem",
            height: "60px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          {/* Logo */}
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              textDecoration: "none",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, #7C3AED, #A855F7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.85rem",
                boxShadow: "0 0 12px rgba(124,58,237,0.5)",
                fontWeight: "700",
                color: "#fff",
              }}
            >
              {"</>"}
            </div>
            <span
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "1.15rem",
                fontWeight: "700",
                color: "var(--text-heading)",
                letterSpacing: "-0.02em",
              }}
            >
              CodeCrack
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <nav
            className="hide-mobile"
            style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}
          >
            {navLinks.map((link) => {
              const active =
                link.href === "/"
                  ? isActive("/") && !isActive("/problems") && !isActive("/leaderboard") && !isActive("/new-problem")
                  : isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{
                    padding: "0.35rem 0.85rem",
                    borderRadius: "7px",
                    fontSize: "0.875rem",
                    fontWeight: active ? "600" : "500",
                    color: active ? "var(--text-heading)" : "var(--text-muted)",
                    textDecoration: "none",
                    position: "relative",
                    transition: "color 0.18s",
                    borderBottom: active ? "2px solid var(--purple-2)" : "2px solid transparent",
                    paddingBottom: "calc(0.35rem - 2px)",
                  }}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Area */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              flexShrink: 0,
            }}
          >
            {/* Search bar */}
            <div className="search-input-wrap hide-mobile" style={{ minWidth: "180px" }}>
              <svg width="13" height="13" viewBox="0 0 20 20" fill="none" style={{ color: "var(--text-dim)", flexShrink: 0 }}>
                <path d="M9 17A8 8 0 1 0 9 1a8 8 0 0 0 0 16zm0 0l4.35 4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <input placeholder="Search problems, tags, contests" readOnly />
              <span className="kbd">⌘K</span>
            </div>

            {user ? (
              <>
                {/* Streak badge */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.25rem",
                    fontSize: "0.8rem",
                    fontWeight: "700",
                    color: "#F97316",
                    padding: "0.3rem 0.65rem",
                    borderRadius: "var(--radius-pill)",
                    background: "rgba(249, 115, 22, 0.1)",
                    border: "1px solid rgba(249,115,22,0.2)",
                  }}
                  className="hide-mobile"
                >
                  <span>🔥</span>
                  <span>{streaks ?? 0}</span>
                </div>

                {/* Bell */}
                <button
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-muted)",
                    padding: "0.35rem",
                    borderRadius: "6px",
                    display: "flex",
                    alignItems: "center",
                    transition: "color 0.18s",
                  }}
                  className="hide-mobile"
                  aria-label="Notifications"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                  </svg>
                </button>

                {/* Avatar */}
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #7C3AED, #C084FC)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.8rem",
                    fontWeight: "700",
                    color: "#fff",
                    flexShrink: 0,
                    cursor: "pointer",
                    border: "2px solid rgba(157,92,246,0.3)",
                  }}
                  title={user.email}
                >
                  {(user.email?.[0] || "U").toUpperCase()}
                </div>

                <button
                  onClick={logout}
                  className="btn btn-ghost hide-mobile"
                  style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem" }}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="btn btn-ghost"
                  style={{ padding: "0.38rem 0.85rem", fontSize: "0.85rem" }}
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="btn btn-primary"
                  style={{ padding: "0.38rem 0.95rem", fontSize: "0.85rem" }}
                >
                  Get Started →
                </Link>
              </>
            )}

            {/* Mobile hamburger */}
            <button
              className="hide-desktop btn btn-ghost"
              onClick={() => setMobileOpen((p) => !p)}
              style={{ padding: "0.38rem 0.6rem", fontSize: "1rem" }}
              aria-label="Toggle menu"
            >
              {mobileOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div
            style={{
              borderTop: "1px solid rgba(255,255,255,0.06)",
              background: "rgba(11,11,20,0.98)",
              padding: "1rem 1.5rem 1.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.4rem",
            }}
          >
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="nav-link"
                onClick={() => setMobileOpen(false)}
                style={{ padding: "0.6rem 0" }}
              >
                {link.label}
              </Link>
            ))}
            {user ? (
              <button
                onClick={() => { logout(); setMobileOpen(false); }}
                className="btn btn-ghost"
                style={{ marginTop: "0.5rem", width: "100%" }}
              >
                Logout
              </button>
            ) : (
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                <Link href="/login" className="btn btn-secondary" style={{ flex: 1 }}>Sign In</Link>
                <Link href="/register" className="btn btn-primary" style={{ flex: 1 }}>Get Started</Link>
              </div>
            )}
          </div>
        )}
      </header>
    </>
  );
}

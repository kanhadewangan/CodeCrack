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
      } catch (err) {
        console.error("Error fetching streaks:", err);
        setStreaks(0);
      }
    };

    loadStreaks();
  }, [user]);

  const isActive = (path: string) =>
    path === "/" ? pathname === "/" : pathname?.startsWith(path);

  const navLinks = [
    { href: "/problems", label: "Problems" },
    { href: "/leaderboard", label: "Leaderboard" },
    { href: "/new-problem", label: "Add Problem" },
  ];
  

  return (
    <>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "rgba(10,6,18,0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(124,58,237,0.18)",
          marginBottom: "2rem",
        }}
      >
        <div
          style={{
            maxWidth: "1280px",
            margin: "0 auto",
            padding: "0 2rem",
            height: "64px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
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
            }}
          >
            {/* Icon mark */}
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, #7C3AED, #A855F7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1rem",
                boxShadow: "0 0 16px rgba(124,58,237,0.4)",
              }}
            >
              {"</>"}
            </div>
            <span
              style={{
                fontFamily: "var(--font-heading, 'Space Grotesk', sans-serif)",
                fontSize: "1.3rem",
                fontWeight: "700",
                background: "linear-gradient(135deg, #C084FC, #9F5EF6)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                letterSpacing: "-0.03em",
              }}
            >
              CodeCrack
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav
            className="hide-mobile"
            style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}
          >
            <Link
              href="/"
              className={`nav-link ${isActive("/") && !isActive("/problems") && !isActive("/leaderboard") ? "active" : ""}`}
              style={{ padding: "0.4rem 0.875rem", borderRadius: "8px", display: "block" }}
            >
              Dashboard
            </Link>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`nav-link ${isActive(link.href) ? "active" : ""}`}
                style={{ padding: "0.4rem 0.875rem", borderRadius: "8px", display: "block" }}
              >
                {link.label}
              </Link>
            ))}
            {user && (
              <div
                style={{
                  marginLeft: "0.5rem",
                  paddingLeft: "0.75rem",
                  borderLeft: "1px solid rgba(124,58,237,0.22)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.45rem",
                  color: "#FCD34D",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                }}
              >
                <span>
                  🔥 {streaks ?? 0} day{(streaks ?? 0) === 1 ? "" : "s"}
                </span>
              </div>
            )}
          </nav>

          {/* User actions */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {user ? (
              <>
                {/* Avatar + info */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.6rem",
                    padding: "0.35rem 0.75rem 0.35rem 0.35rem",
                    borderRadius: "999px",
                    background: "rgba(124,58,237,0.1)",
                    border: "1px solid rgba(124,58,237,0.2)",
                  }}
                  className="hide-mobile"
                >
                  {/* Avatar */}
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      background: "linear-gradient(135deg,#7C3AED,#C084FC)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.75rem",
                      fontWeight: "700",
                      color: "#fff",
                      flexShrink: 0,
                    }}
                  >
                    {(user.email?.[0] || "U").toUpperCase()}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span
                      style={{
                        fontSize: "0.8rem",
                        fontWeight: "600",
                        color: "var(--text-heading, #F1EEF9)",
                        lineHeight: 1.2,
                      }}
                    >
                      {user.email.split("@")[0]}
                    </span>
                    {user.userStat?.[0] && (
                      <span
                        style={{
                          fontSize: "0.68rem",
                          color: "var(--purple-3, #C084FC)",
                          lineHeight: 1.2,
                        }}
                      >
                        ⚡ {user.userStat[0].rating} pts
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={logout}
                  className="btn btn-ghost"
                  style={{ padding: "0.4rem 0.9rem", fontSize: "0.8rem" }}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="btn btn-ghost"
                  style={{ padding: "0.4rem 0.9rem", fontSize: "0.85rem" }}
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="btn btn-primary"
                  style={{ padding: "0.4rem 1rem", fontSize: "0.85rem" }}
                >
                  Get Started
                </Link>
              </>
            )}

            {/* Mobile hamburger */}
            <button
              className="hide-desktop btn btn-ghost"
              onClick={() => setMobileOpen((p) => !p)}
              style={{ padding: "0.4rem 0.6rem", fontSize: "1.1rem" }}
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
              borderTop: "1px solid rgba(124,58,237,0.15)",
              background: "rgba(10,6,18,0.98)",
              padding: "1rem 2rem 1.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
            }}
          >
            <Link href="/" className="nav-link" onClick={() => setMobileOpen(false)}>
              Dashboard
            </Link>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="nav-link"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {user && (
              <div
                style={{
                  marginTop: "0.5rem",
                  padding: "0.65rem 0.75rem",
                  borderRadius: "10px",
                  background: "rgba(245, 158, 11, 0.12)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  color: "#FCD34D",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                }}
              >
                🔥 Current streak: {streaks ?? 0} day{(streaks ?? 0) === 1 ? "" : "s"}
              </div>
            )}
            {!user && (
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                <Link href="/login" className="btn btn-secondary" style={{ flex: 1 }}>
                  Sign In
                </Link>
                <Link href="/register" className="btn btn-primary" style={{ flex: 1 }}>
                  Get Started
                </Link>
              </div>
            )}
          </div>
        )}
      </header>
    </>
  );
}

"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";

interface RequireAuthProps {
  children: ReactNode;
}

export default function RequireAuth({ children }: RequireAuthProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [loading, user, router]);
if (loading || !user) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1rem",
        minHeight: "50vh",
      }}
    >
      <div
        className="skeleton-block"
        style={{ width: "48px", height: "48px", borderRadius: "50%" }}
      />
      <div
        className="skeleton-block"
        style={{ width: "220px", height: "14px", borderRadius: "4px" }}
      />
      <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginTop: "0.25rem" }}>
        Redirecting to landing page...
      </p>
    </div>
  );
}

  return <>{children}</>;
}

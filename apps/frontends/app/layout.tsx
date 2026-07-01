import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import Navbar from "../components/Navbar";

export const metadata: Metadata = {
  title: "CodeCrack — Crack Your Next Interview. Code Smarter.",
  description:
    "CodeCrack is a premium coding practice platform for software engineers. Solve 1000+ DSA problems, compete in contests, and climb the global leaderboard.",
  keywords: ["coding", "interview prep", "algorithms", "data structures", "leetcode", "competitive programming"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <AuthProvider>
          <Navbar />
          <main
            style={{
              flex: 1,
              padding: "0 2rem 4rem 2rem",
              maxWidth: "1280px",
              width: "100%",
              margin: "0 auto",
            }}
          >
            {children}
          </main>
          {/* Global ambient orbs */}
          <div
            style={{
              position: "fixed",
              top: "10%",
              left: "-10%",
              width: "600px",
              height: "600px",
              background: "radial-gradient(circle, rgba(124,58,237,0.07) 0%, transparent 70%)",
              pointerEvents: "none",
              zIndex: 0,
              filter: "blur(40px)",
            }}
          />
          <div
            style={{
              position: "fixed",
              bottom: "10%",
              right: "-10%",
              width: "500px",
              height: "500px",
              background: "radial-gradient(circle, rgba(168,85,247,0.06) 0%, transparent 70%)",
              pointerEvents: "none",
              zIndex: 0,
              filter: "blur(40px)",
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}

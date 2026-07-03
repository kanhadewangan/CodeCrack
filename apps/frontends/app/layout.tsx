import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import Navbar from "../components/Navbar";

export const metadata: Metadata = {
  title: "CodeCrack — Crack Your Next Interview. Code Smarter.",
  description:
    "CodeCrack is a premium coding practice platform for software engineers. Solve 1000+ DSA problems, compete in contests, and climb the global leaderboard.",
  keywords: [
    "coding",
    "interview prep",
    "algorithms",
    "data structures",
    "leetcode",
    "competitive programming",
  ],
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
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          background: "var(--bg-base)",
        }}
      >
        <AuthProvider>
          <Navbar />
          <main
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}

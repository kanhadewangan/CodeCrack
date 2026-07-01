import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import Navbar from "../components/Navbar";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "CodeJudge - Premier Online Judge",
  description: "Test and improve your coding skills with instant compilation and test execution.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`} style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <AuthProvider>
          <Navbar />
          <main style={{ flex: 1, padding: "0 2rem 3rem 2rem", maxWidth: "1200px", width: "100%", margin: "0 auto" }}>
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}

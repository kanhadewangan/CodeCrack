"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { authApi } from "../lib/api";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  email: string;
  createdAt: string;
  userStat?: Array<{
    problemsSolved: number;
    totalSubmissions: number;
    rating: number;
  }>;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refreshUser = async () => {
    const token = localStorage.getItem("oj_token");
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const userData = await authApi.getMe();
      setUser(userData);
    } catch (err) {
      console.error("Auth session restore failed:", err);
      localStorage.removeItem("oj_token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await authApi.login({ email, password });
      localStorage.setItem("oj_token", res.token);
      await refreshUser();
      router.push("/");
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const register = async (email: string, password: string) => {
    setLoading(true);
    try {
      await authApi.register({ email, password });
      // Automatically log them in after registration
      const res = await authApi.login({ email, password });
      localStorage.setItem("oj_token", res.token);
      await refreshUser();
      router.push("/");
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem("oj_token");
    setUser(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

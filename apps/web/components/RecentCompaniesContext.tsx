"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

const STORAGE_KEY = "edinet-screener-recent-companies";
const MAX_RECENT = 5;

export type RecentCompany = { secCode: string; filerName: string };

function loadRecent(): RecentCompany[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const arr = JSON.parse(stored) as RecentCompany[];
    return Array.isArray(arr) ? arr.slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

function saveRecent(list: RecentCompany[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
  } catch {
    /* ignore */
  }
}

type RecentCompaniesContextValue = {
  recent: RecentCompany[];
  addRecent: (secCode: string, filerName: string) => void;
};

const RecentCompaniesContext = createContext<RecentCompaniesContextValue | null>(null);

export function RecentCompaniesProvider({ children }: { children: ReactNode }) {
  const [recent, setRecent] = useState<RecentCompany[]>(() => []);

  useEffect(() => {
    setRecent(loadRecent());
  }, []);

  useEffect(() => {
    saveRecent(recent);
  }, [recent]);

  const addRecent = useCallback((secCode: string, filerName: string) => {
    setRecent((prev) => {
      const filtered = prev.filter((c) => c.secCode !== secCode);
      return [{ secCode, filerName }, ...filtered].slice(0, MAX_RECENT);
    });
  }, []);

  return (
    <RecentCompaniesContext.Provider value={{ recent, addRecent }}>{children}</RecentCompaniesContext.Provider>
  );
}

export function useRecentCompanies() {
  const ctx = useContext(RecentCompaniesContext);
  if (!ctx) throw new Error("useRecentCompanies must be used within RecentCompaniesProvider");
  return ctx;
}

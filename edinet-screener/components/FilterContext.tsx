"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

export type FilterState = {
  searchName: string;
  searchCode: string;
  minEquityRatio: string;
  maxEquityRatio: string;
  minEps: string;
  maxEps: string;
  minSales: string;
  maxSales: string;
  minRoe: string;
  maxRoe: string;
  minTotalAssets: string;
  maxTotalAssets: string;
  showOnlyFavorites: boolean;
};

const defaultFilters: FilterState = {
  searchName: "",
  searchCode: "",
  minEquityRatio: "",
  maxEquityRatio: "",
  minEps: "",
  maxEps: "",
  minSales: "",
  maxSales: "",
  minRoe: "",
  maxRoe: "",
  minTotalAssets: "",
  maxTotalAssets: "",
  showOnlyFavorites: false,
};

type FilterContextValue = {
  filters: FilterState;
  setFilter: (key: keyof FilterState, value: string | boolean) => void;
  clearFilters: () => void;
  getShareableUrl: () => string;
};

const FilterContext = createContext<FilterContextValue | null>(null);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<FilterState>(defaultFilters);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);

    const filterFromUrl: Partial<FilterState> = {};

    // URLパラメータから各フィルタを読み込む
    if (params.has("searchName")) filterFromUrl.searchName = params.get("searchName") || "";
    if (params.has("searchCode")) filterFromUrl.searchCode = params.get("searchCode") || "";
    if (params.has("minEquityRatio")) filterFromUrl.minEquityRatio = params.get("minEquityRatio") || "";
    if (params.has("maxEquityRatio")) filterFromUrl.maxEquityRatio = params.get("maxEquityRatio") || "";
    if (params.has("minEps")) filterFromUrl.minEps = params.get("minEps") || "";
    if (params.has("maxEps")) filterFromUrl.maxEps = params.get("maxEps") || "";
    if (params.has("minSales")) filterFromUrl.minSales = params.get("minSales") || "";
    if (params.has("maxSales")) filterFromUrl.maxSales = params.get("maxSales") || "";
    if (params.has("minRoe")) filterFromUrl.minRoe = params.get("minRoe") || "";
    if (params.has("maxRoe")) filterFromUrl.maxRoe = params.get("maxRoe") || "";
    if (params.has("minTotalAssets")) filterFromUrl.minTotalAssets = params.get("minTotalAssets") || "";
    if (params.has("maxTotalAssets")) filterFromUrl.maxTotalAssets = params.get("maxTotalAssets") || "";
    if (params.has("favorites")) filterFromUrl.showOnlyFavorites = params.get("favorites") === "1";

    if (Object.keys(filterFromUrl).length > 0) {
      setFilters((prev) => ({ ...prev, ...filterFromUrl }));
    }
  }, []);

  const setFilter = useCallback((key: keyof FilterState, value: string | boolean) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => setFilters({ ...defaultFilters }), []);

  const getShareableUrl = useCallback(() => {
    const params = new URLSearchParams();
    const f = filters;

    if (f.searchName) params.append("searchName", f.searchName);
    if (f.searchCode) params.append("searchCode", f.searchCode);
    if (f.minEquityRatio) params.append("minEquityRatio", f.minEquityRatio);
    if (f.maxEquityRatio) params.append("maxEquityRatio", f.maxEquityRatio);
    if (f.minEps) params.append("minEps", f.minEps);
    if (f.maxEps) params.append("maxEps", f.maxEps);
    if (f.minSales) params.append("minSales", f.minSales);
    if (f.maxSales) params.append("maxSales", f.maxSales);
    if (f.minRoe) params.append("minRoe", f.minRoe);
    if (f.maxRoe) params.append("maxRoe", f.maxRoe);
    if (f.minTotalAssets) params.append("minTotalAssets", f.minTotalAssets);
    if (f.maxTotalAssets) params.append("maxTotalAssets", f.maxTotalAssets);
    if (f.showOnlyFavorites) params.append("favorites", "1");

    const baseUrl = typeof window !== "undefined" ? window.location.origin + window.location.pathname : "";
    return params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;
  }, [filters]);

  return (
    <FilterContext.Provider value={{ filters, setFilter, clearFilters, getShareableUrl }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error("useFilters must be used within FilterProvider");
  return ctx;
}

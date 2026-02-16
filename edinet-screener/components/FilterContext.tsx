"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

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
};

const FilterContext = createContext<FilterContextValue | null>(null);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const setFilter = useCallback((key: keyof FilterState, value: string | boolean) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);
  const clearFilters = useCallback(() => setFilters(defaultFilters), []);
  return (
    <FilterContext.Provider value={{ filters, setFilter, clearFilters }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error("useFilters must be used within FilterProvider");
  return ctx;
}

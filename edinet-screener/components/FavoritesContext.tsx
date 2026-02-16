"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

const STORAGE_KEY = "edinet-screener-favorites";

function loadFavorites(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return new Set();
    const arr = JSON.parse(stored) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveFavorites(set: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch {
    /* ignore */
  }
}

type FavoritesContextValue = {
  favorites: Set<string>;
  isFavorite: (secCode: string) => boolean;
  toggleFavorite: (secCode: string) => void;
  addFavorite: (secCode: string) => void;
  removeFavorite: (secCode: string) => void;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<Set<string>>(() => loadFavorites());

  useEffect(() => {
    saveFavorites(favorites);
  }, [favorites]);

  const toggleFavorite = useCallback((secCode: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(secCode)) {
        next.delete(secCode);
      } else {
        next.add(secCode);
      }
      return next;
    });
  }, []);

  const addFavorite = useCallback((secCode: string) => {
    setFavorites((prev) => new Set(prev).add(secCode));
  }, []);

  const removeFavorite = useCallback((secCode: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      next.delete(secCode);
      return next;
    });
  }, []);

  const isFavorite = useCallback(
    (secCode: string) => favorites.has(secCode),
    [favorites]
  );

  return (
    <FavoritesContext.Provider
      value={{ favorites, isFavorite, toggleFavorite, addFavorite, removeFavorite }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used within FavoritesProvider");
  return ctx;
}

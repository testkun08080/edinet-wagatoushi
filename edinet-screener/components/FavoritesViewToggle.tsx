"use client";

import { useFilters } from "./FilterContext.js";

const toolbarBtnBase =
  "inline-flex items-center justify-center gap-1.5 min-h-[36px] min-w-[36px] px-3 py-2 rounded-md text-sm font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition";

export function FavoritesViewToggle() {
  const { filters, setFilter } = useFilters();

  return (
    <nav className="flex gap-0.5" aria-label="表示切り替え">
      <a
        href="/"
        onClick={(e) => {
          e.preventDefault();
          setFilter("showOnlyFavorites", false);
          window.history.replaceState({}, "", "/");
        }}
        className={`${toolbarBtnBase} ${!filters.showOnlyFavorites ? "bg-slate-100 border-slate-300 text-slate-900" : ""}`}
        title="全て表示"
      >
        <span className="material-symbols-outlined text-[20px]" aria-hidden>
          list
        </span>
        <span className="hidden md:inline">全て表示</span>
      </a>
      <a
        href="/?favorites=1"
        onClick={(e) => {
          e.preventDefault();
          setFilter("showOnlyFavorites", true);
          window.history.replaceState({}, "", "/?favorites=1");
        }}
        className={`${toolbarBtnBase} ${filters.showOnlyFavorites ? "bg-slate-100 border-slate-300 text-slate-900" : ""}`}
        title="お気に入りだけ"
      >
        <span className="material-symbols-outlined text-[20px]" aria-hidden>
          star
        </span>
        <span className="hidden md:inline">お気に入りだけ</span>
      </a>
    </nav>
  );
}

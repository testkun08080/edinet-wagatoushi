"use client";

import { useState } from "react";
import { useFilters } from "./FilterContext.js";
import logoUrl from "../assets/logo.svg";

const STORAGE_KEY = "edinet-screener-sidebar-open";

function loadSidebarOpen(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "true";
  } catch {
    return false;
  }
}

function saveSidebarOpen(open: boolean) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, open ? "true" : "false");
  } catch {
    /* ignore */
  }
}

export function CompanySidebar() {
  const { filters, setFilter, clearFilters } = useFilters();
  const [isOpen, setIsOpen] = useState(() => loadSidebarOpen());

  const toggle = () => {
    setIsOpen((prev) => {
      const next = !prev;
      saveSidebarOpen(next);
      return next;
    });
  };

  return (
    <aside
      id="sidebar"
      className={`shrink-0 flex flex-col h-screen border-r border-base-300 bg-base-200/50 overflow-hidden transition-[width] duration-200 ease-in-out ${
        isOpen ? "w-80 min-w-80" : "w-12 min-w-12"
      }`}
    >
      {/* ヘッダー: Logo + 開閉ボタン */}
      <div
        className={`shrink-0 p-2 border-b border-base-300 flex gap-1 ${
          isOpen ? "flex-row items-center justify-between" : "flex-col items-center pt-3"
        }`}
      >
        <a href="/" className={`flex items-center gap-2 min-w-0 ${!isOpen ? "justify-center" : ""}`}>
          <img src={logoUrl} height={28} width={28} alt="logo" className="shrink-0" />
          {isOpen && <span className="font-bold text-base truncate">EDINET Screener</span>}
        </a>
        <button
          type="button"
          onClick={toggle}
          className="btn btn-ghost btn-sm btn-square shrink-0"
          aria-label={isOpen ? "サイドバーを閉じる" : "サイドバーを開く"}
          title={isOpen ? "サイドバーを閉じる" : "サイドバーを開く"}
        >
          <span className="text-lg" aria-hidden>
            {isOpen ? "◀" : "▶"}
          </span>
        </button>
      </div>

      {/* 検索・フィルター（開いている時のみ表示） */}
      {isOpen && (
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 border-b border-base-300">
        <section>
          <h3 className="text-sm font-semibold text-base-content/80 flex items-center gap-1 mb-2">
            <span>🔍</span> 検索
          </h3>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="会社名"
              className="input input-bordered input-sm w-full"
              value={filters.searchName}
              onChange={(e) => setFilter("searchName", e.target.value)}
            />
            <input
              type="text"
              placeholder="銘柄コード（例: 13760）"
              className="input input-bordered input-sm w-full"
              value={filters.searchCode}
              onChange={(e) => setFilter("searchCode", e.target.value)}
            />
            <label className="flex items-center gap-2 cursor-pointer text-sm mt-2">
              <input
                type="checkbox"
                className="checkbox checkbox-sm"
                checked={filters.showOnlyFavorites}
                onChange={(e) => setFilter("showOnlyFavorites", e.target.checked)}
              />
              <span>★ お気に入りのみ</span>
            </label>
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-base-content/80 flex items-center gap-1 mb-2">
            <span>📊</span> 基本フィルター
          </h3>
          <div className="space-y-2">
            <div>
              <label className="text-xs text-base-content/60">自己資本比率（最小・0.5=50%）</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                placeholder="0.3"
                className="input input-bordered input-sm w-full mt-0.5"
                value={filters.minEquityRatio}
                onChange={(e) => setFilter("minEquityRatio", e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-base-content/60">自己資本比率（最大）</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                placeholder="1.0"
                className="input input-bordered input-sm w-full mt-0.5"
                value={filters.maxEquityRatio}
                onChange={(e) => setFilter("maxEquityRatio", e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-base-content/60">EPS（最小）</label>
              <input
                type="number"
                step="0.1"
                placeholder="0"
                className="input input-bordered input-sm w-full mt-0.5"
                value={filters.minEps}
                onChange={(e) => setFilter("minEps", e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-base-content/60">EPS（最大）</label>
              <input
                type="number"
                step="0.1"
                placeholder="空欄で制限なし"
                className="input input-bordered input-sm w-full mt-0.5"
                value={filters.maxEps}
                onChange={(e) => setFilter("maxEps", e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-base-content/60">売上高（百万円・最小）</label>
              <input
                type="number"
                step="1000"
                placeholder="0"
                className="input input-bordered input-sm w-full mt-0.5"
                value={filters.minSales}
                onChange={(e) => setFilter("minSales", e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-base-content/60">売上高（百万円・最大）</label>
              <input
                type="number"
                step="1000"
                placeholder="空欄で制限なし"
                className="input input-bordered input-sm w-full mt-0.5"
                value={filters.maxSales}
                onChange={(e) => setFilter("maxSales", e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-base-content/60">ROE（最小・0.1=10%）</label>
              <input
                type="number"
                step="0.01"
                placeholder="0"
                className="input input-bordered input-sm w-full mt-0.5"
                value={filters.minRoe}
                onChange={(e) => setFilter("minRoe", e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-base-content/60">ROE（最大）</label>
              <input
                type="number"
                step="0.01"
                placeholder="空欄で制限なし"
                className="input input-bordered input-sm w-full mt-0.5"
                value={filters.maxRoe}
                onChange={(e) => setFilter("maxRoe", e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-base-content/60">総資産額（百万円・最小）</label>
              <input
                type="number"
                step="10000"
                placeholder="0"
                className="input input-bordered input-sm w-full mt-0.5"
                value={filters.minTotalAssets}
                onChange={(e) => setFilter("minTotalAssets", e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-base-content/60">総資産額（百万円・最大）</label>
              <input
                type="number"
                step="10000"
                placeholder="空欄で制限なし"
                className="input input-bordered input-sm w-full mt-0.5"
                value={filters.maxTotalAssets}
                onChange={(e) => setFilter("maxTotalAssets", e.target.value)}
              />
            </div>
          </div>
        </section>

        <button
          type="button"
          onClick={clearFilters}
          className="btn btn-sm btn-outline btn-secondary w-full"
        >
          🗑️ フィルターをクリア
        </button>
      </div>
      )}
    </aside>
  );
}

"use client";

import { useState } from "react";
import { usePageContext } from "vike-react/usePageContext";
import { useFilters } from "./FilterContext.js";
import { useRecentCompanies } from "./RecentCompaniesContext.js";
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
  const pageContext = usePageContext();
  const urlPathname = pageContext?.urlPathname ?? "/";
  const { filters, setFilter, clearFilters } = useFilters();
  const { recent } = useRecentCompanies();
  const [isOpen, setIsOpen] = useState(() => loadSidebarOpen());

  const isDashboard = urlPathname === "/";
  const isAnalyzePage = urlPathname.startsWith("/analyze/");

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
      className={`shrink-0 flex flex-col h-screen border-r border-slate-200 bg-white overflow-hidden transition-[width] duration-200 ease-in-out ${
        isOpen ? "w-72 min-w-72" : "w-12 min-w-12"
      }`}
    >
      {/* ヘッダー: Logo + 開閉ボタン（Stitch 風） */}
      <div
        className={`shrink-0 p-4 border-b border-slate-200 flex gap-2 ${
          isOpen ? "flex-row items-center justify-between" : "flex-col items-center pt-3"
        }`}
      >
        <a href="/" className={`flex items-center gap-2 min-w-0 ${!isOpen ? "justify-center" : ""}`}>
          <img src={logoUrl} height={28} width={28} alt="logo" className="shrink-0" />
          {isOpen && <span className="font-bold text-lg text-slate-900">EDINET Screener</span>}
        </a>
        <button
          type="button"
          onClick={toggle}
          className="p-1 hover:bg-slate-100 rounded text-slate-400 shrink-0"
          aria-label={isOpen ? "サイドバーを閉じる" : "サイドバーを開く"}
          title={isOpen ? "サイドバーを閉じる" : "サイドバーを開く"}
        >
          <span className="material-symbols-outlined align-middle" style={{ fontSize: 24 }}>
            {isOpen ? "menu_open" : "menu"}
          </span>
        </button>
      </div>

      {isOpen && (
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-6">
          {/* ナビ（Stitch 風） */}
          <nav className="space-y-1">
            <a
              href="/"
              className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg ${
                isDashboard ? "text-blue-700 bg-blue-50" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="material-symbols-outlined text-xl">home</span>
              ダッシュボード
            </a>
            <a
              href={filters.showOnlyFavorites ? "/" : "/?favorites=1"}
              onClick={(e) => {
                e.preventDefault();
                if (filters.showOnlyFavorites) {
                  setFilter("showOnlyFavorites", false);
                  window.history.replaceState({}, "", "/");
                } else {
                  setFilter("showOnlyFavorites", true);
                  if (isDashboard) {
                    window.history.replaceState({}, "", "/?favorites=1");
                  } else {
                    window.location.href = "/?favorites=1";
                  }
                }
              }}
              className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg ${
                filters.showOnlyFavorites ? "text-blue-700 bg-blue-50" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="material-symbols-outlined text-xl">star</span>
              お気に入り
            </a>
          </nav>

          {/* 検索・フィルター（企業一覧の時のみ表示） */}
          {!isAnalyzePage && (
            <>
              <section>
                <h3 className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">検索</h3>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="会社名"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={filters.searchName}
                    onChange={(e) => setFilter("searchName", e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="銘柄コード（例: 13760）"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={filters.searchCode}
                    onChange={(e) => setFilter("searchCode", e.target.value)}
                  />
                </div>
              </section>

              <section>
                <h3 className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  基本フィルター
                </h3>
                <div className="space-y-2">
                  {[
                    { key: "minEquityRatio" as const, label: "自己資本比率（最小・0.5=50%）", step: "0.01", placeholder: "0.3" },
                    { key: "maxEquityRatio" as const, label: "自己資本比率（最大）", step: "0.01", placeholder: "1.0" },
                    { key: "minEps" as const, label: "EPS（最小）", step: "0.1", placeholder: "0" },
                    { key: "maxEps" as const, label: "EPS（最大）", step: "0.1", placeholder: "空欄で制限なし" },
                    { key: "minSales" as const, label: "売上高（百万円・最小）", step: "1000", placeholder: "0" },
                    { key: "maxSales" as const, label: "売上高（百万円・最大）", step: "1000", placeholder: "空欄で制限なし" },
                    { key: "minRoe" as const, label: "ROE（最小・0.1=10%）", step: "0.01", placeholder: "0" },
                    { key: "maxRoe" as const, label: "ROE（最大）", step: "0.01", placeholder: "空欄で制限なし" },
                    { key: "minTotalAssets" as const, label: "総資産額（百万円・最小）", step: "10000", placeholder: "0" },
                    { key: "maxTotalAssets" as const, label: "総資産額（百万円・最大）", step: "10000", placeholder: "空欄で制限なし" },
                  ].map(({ key, label, step, placeholder }) => (
                    <div key={key}>
                      <label className="text-xs text-slate-500 block mt-0.5">{label}</label>
                      <input
                        type="number"
                        step={step}
                        placeholder={placeholder}
                        className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg mt-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={(filters as Record<string, string>)[key]}
                        onChange={(e) => setFilter(key, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </section>

              <button
                type="button"
                onClick={clearFilters}
                className="w-full px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
              >
                🗑️ フィルターをクリア
              </button>
            </>
          )}

          {/* 最近閲覧した企業（企業分析の時のみ表示） */}
          {isAnalyzePage && recent.length > 0 && (
            <div className="pt-4 border-t border-slate-100">
              <h3 className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                最近閲覧した企業
              </h3>
              <div className="mt-2 space-y-1">
                {recent.map((c) => (
                  <a
                    key={c.secCode}
                    href={`/analyze/${c.secCode}`}
                    className="block px-3 py-1.5 text-sm text-slate-600 hover:text-blue-600"
                  >
                    {c.filerName.replace(/^株式会社\s*|\s*株式会社$/g, "").trim() || c.filerName} ({c.secCode})
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

"use client";

import { useState, useEffect } from "react";
import { usePageContext } from "vike-react/usePageContext";
import { useFilters } from "./FilterContext.js";
import { useFavorites } from "./FavoritesContext.js";
import { useRecentCompanies } from "./RecentCompaniesContext.js";
import logoUrl from "../assets/logo.svg";

type CompanyItem = { secCode: string; filerName: string };

export const SIDEBAR_BREAKPOINT_PX = 1024;

export function useNarrowViewport(): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const m = window.matchMedia(`(max-width: ${SIDEBAR_BREAKPOINT_PX}px)`);
    setNarrow(m.matches);
    const on = () => setNarrow(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return narrow;
}

function formatDisplayName(name: string): string {
  return name.replace(/^株式会社\s*|\s*株式会社$/g, "").trim() || name;
}

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
  const { favorites } = useFavorites();
  const { recent } = useRecentCompanies();
  const isNarrow = useNarrowViewport();
  const [isOpen, setIsOpen] = useState(() => loadSidebarOpen());
  const [modalOpen, setModalOpen] = useState(false);
  const [companyList, setCompanyList] = useState<CompanyItem[]>([]);
  const [analyzeSearchQuery, setAnalyzeSearchQuery] = useState("");

  const isDashboard = urlPathname === "/";
  const isAnalyzePage = urlPathname.startsWith("/analyze/");

  useEffect(() => {
    if (!isAnalyzePage) return;
    fetch("/data/company_metrics.json")
      .then((res) => res.json())
      .then((data: { metrics?: Array<{ secCode: string; filerName: string }> }) => {
        const list = (data.metrics ?? []).map((m) => ({ secCode: m.secCode, filerName: m.filerName }));
        setCompanyList(list);
      })
      .catch(() => setCompanyList([]));
  }, [isAnalyzePage]);

  const analyzeSearchResults = analyzeSearchQuery.trim()
    ? companyList.filter(
        (c) =>
          c.filerName.toLowerCase().includes(analyzeSearchQuery.trim().toLowerCase()) ||
          c.secCode.includes(analyzeSearchQuery.trim())
      ).slice(0, 15)
    : [];

  const toggle = () => {
    setIsOpen((prev) => {
      const next = !prev;
      saveSidebarOpen(next);
      return next;
    });
  };

  const openModal = () => setModalOpen(true);
  const closeModal = () => setModalOpen(false);

  // モーダル表示中は Escape で閉じる・body スクロール無効
  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [modalOpen]);

  const sidebarBody = (
    <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-6">
          {/* タブ: 全て表示 / お気に入りだけ（企業一覧の時のみ） */}
          {!isAnalyzePage && (
            <nav className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
              <a
                href="/"
                onClick={(e) => {
                  e.preventDefault();
                  setFilter("showOnlyFavorites", false);
                  if (!isDashboard) window.location.href = "/";
                  else window.history.replaceState({}, "", "/");
                }}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition ${
                  !filters.showOnlyFavorites
                    ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span className="material-symbols-outlined text-lg">list</span>
                全て表示
              </a>
              <a
                href="/?favorites=1"
                onClick={(e) => {
                  e.preventDefault();
                  setFilter("showOnlyFavorites", true);
                  if (!isDashboard) window.location.href = "/?favorites=1";
                  else window.history.replaceState({}, "", "/?favorites=1");
                }}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition ${
                  filters.showOnlyFavorites
                    ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span className="material-symbols-outlined text-lg">star</span>
                お気に入りだけ
              </a>
            </nav>
          )}

          {/* 企業分析ページ: お気に入り・履歴・検索 */}
          {isAnalyzePage && (
            <>
              <section>
                <h3 className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">検索</h3>
                <input
                  type="text"
                  placeholder="会社名・銘柄コードで検索"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={analyzeSearchQuery}
                  onChange={(e) => setAnalyzeSearchQuery(e.target.value)}
                />
                {analyzeSearchResults.length > 0 && (
                  <div className="mt-2 space-y-0.5 max-h-48 overflow-y-auto border border-slate-100 rounded-lg">
                    {analyzeSearchResults.map((c) => (
                      <a
                        key={c.secCode}
                        href={`/analyze/${c.secCode}`}
                        className="block px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-blue-600"
                      >
                        {formatDisplayName(c.filerName)} ({c.secCode})
                      </a>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <h3 className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">お気に入り</h3>
                <div className="space-y-1">
                  {Array.from(favorites).length === 0 ? (
                    <p className="px-3 py-2 text-sm text-slate-400">お気に入りがありません</p>
                  ) : (
                    <>
                      {companyList
                        .filter((c) => favorites.has(c.secCode))
                        .map((c) => (
                          <a
                            key={c.secCode}
                            href={`/analyze/${c.secCode}`}
                            className="block px-3 py-1.5 text-sm text-slate-600 hover:text-blue-600"
                          >
                            {formatDisplayName(c.filerName)} ({c.secCode})
                          </a>
                        ))}
                      {Array.from(favorites)
                        .filter((s) => !companyList.find((c) => c.secCode === s))
                        .map((secCode) => (
                          <a key={secCode} href={`/analyze/${secCode}`} className="block px-3 py-1.5 text-sm text-slate-600 hover:text-blue-600">
                            {secCode}
                          </a>
                        ))}
                    </>
                  )}
                </div>
              </section>

              <section>
                <h3 className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">履歴</h3>
                <div className="space-y-1">
                  {recent.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-slate-400">履歴がありません</p>
                  ) : (
                    recent.map((c) => (
                      <a
                        key={c.secCode}
                        href={`/analyze/${c.secCode}`}
                        className="block px-3 py-1.5 text-sm text-slate-600 hover:text-blue-600"
                      >
                        {formatDisplayName(c.filerName)} ({c.secCode})
                      </a>
                    ))
                  )}
                </div>
              </section>
            </>
          )}

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
    </div>
  );

  // iPad以下: 固定ヘッダー（コンテンツを被らない）+ モーダルで開閉
  if (isNarrow) {
    return (
      <>
        {/* 固定アプリバー: 常に同じ高さでコンテンツと被らない（Layout側で padding-top を確保） */}
        <header
          className="fixed left-0 right-0 top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4 shadow-sm lg:hidden"
          style={{
            paddingTop: "max(0.875rem, env(safe-area-inset-top))",
            minHeight: "calc(3.5rem + env(safe-area-inset-top))",
          }}
        >
          <button
            type="button"
            onClick={openModal}
            className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 active:bg-slate-200"
            aria-label="メニューを開く"
            title="メニューを開く"
          >
            <span className="material-symbols-outlined text-[28px]" aria-hidden>
              menu
            </span>
          </button>
          <a href="/" className="flex min-h-[44px] items-center gap-2 overflow-hidden">
            <img src={logoUrl} height={28} width={28} alt="" className="shrink-0" />
            <span className="truncate font-bold text-lg text-slate-900">エディー</span>
          </a>
        </header>

        {modalOpen && (
          <div
            id="sidebar-modal"
            className="fixed inset-0 z-40 lg:hidden"
            aria-modal="true"
            role="dialog"
            aria-label="メニュー"
          >
            <div
              className="absolute inset-0 bg-black/50"
              onClick={closeModal}
              aria-hidden
            />
            <div
              id="sidebar"
              className="absolute left-0 top-0 bottom-0 flex w-72 flex-col bg-white shadow-xl max-[480px]:w-full max-[480px]:max-w-[100vw]"
              style={{
                paddingTop: "env(safe-area-inset-top)",
                paddingBottom: "env(safe-area-inset-bottom)",
              }}
              onClick={(e) => {
                if ((e.target as HTMLElement).closest("a")) closeModal();
              }}
            >
              <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3">
                <a href="/" className="flex min-h-[44px] items-center gap-2">
                  <img src={logoUrl} height={28} width={28} alt="" className="shrink-0" />
                  <span className="font-bold text-lg text-slate-900">エディー</span>
                </a>
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 active:bg-slate-200"
                  aria-label="メニューを閉じる"
                >
                  <span className="material-symbols-outlined text-[28px]">close</span>
                </button>
              </div>
              {sidebarBody}
            </div>
          </div>
        )}
      </>
    );
  }

  // デスクトップ: 従来のサイドバー
  return (
    <aside
      id="sidebar"
      className={`shrink-0 flex flex-col h-screen border-r border-slate-200 bg-white overflow-hidden transition-[width] duration-200 ease-in-out ${
        isOpen ? "w-72 min-w-72" : "w-12 min-w-12"
      }`}
    >
      <div
        className={`shrink-0 p-4 border-b border-slate-200 flex gap-2 ${
          isOpen ? "flex-row items-center justify-between" : "flex-col items-center pt-3"
        }`}
      >
        <a href="/" className={`flex items-center gap-2 min-w-0 ${!isOpen ? "justify-center" : ""}`}>
          <img src={logoUrl} height={28} width={28} alt="logo" className="shrink-0" />
          {isOpen && <span className="font-bold text-lg text-slate-900">エディー</span>}
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
      {isOpen && sidebarBody}
    </aside>
  );
}

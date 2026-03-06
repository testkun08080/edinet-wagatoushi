"use client";

import { useState, useCallback } from "react";
import { useFilters } from "./FilterContext.js";
import { useColumnVisibility, type ColumnId } from "./ColumnVisibilityContext.js";
import { useFavorites } from "./FavoritesContext.js";
import type { CompanyMetric } from "./CompanyTable.js";

function formatSales(s: string | null): string {
  if (s == null || s === "") return "－";
  const n = parseFloat(s) / 1_000_000;
  if (isNaN(n)) return "－";
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function formatRatio(s: string | null): string {
  if (s == null || s === "") return "－";
  const n = parseFloat(s);
  if (isNaN(n)) return s;
  return (n * 100).toFixed(2) + "%";
}

function formatDisplayName(name: string): string {
  return name.replace(/^株式会社\s*|\s*株式会社$/g, "").trim() || name;
}

function passesFilter(
  m: CompanyMetric,
  f: ReturnType<typeof useFilters>["filters"],
  favorites: Set<string>
): boolean {
  if (f.showOnlyFavorites && !favorites.has(m.secCode)) return false;
  if (f.searchName.trim() && !m.filerName.toLowerCase().includes(f.searchName.trim().toLowerCase()))
    return false;
  if (f.searchCode.trim() && !m.secCode.includes(f.searchCode.trim())) return false;
  const eq = m.自己資本比率 != null ? parseFloat(m.自己資本比率) : NaN;
  if (f.minEquityRatio && !isNaN(eq) && eq < parseFloat(f.minEquityRatio)) return false;
  if (f.maxEquityRatio && !isNaN(eq) && eq > parseFloat(f.maxEquityRatio)) return false;
  const eps = m.EPS != null ? parseFloat(m.EPS) : NaN;
  if (f.minEps && !isNaN(eps) && eps < parseFloat(f.minEps)) return false;
  if (f.maxEps && !isNaN(eps) && eps > parseFloat(f.maxEps)) return false;
  const sales = m.売上高 != null ? parseFloat(m.売上高) : NaN;
  if (f.minSales && !isNaN(sales) && sales < parseFloat(f.minSales)) return false;
  if (f.maxSales && !isNaN(sales) && sales > parseFloat(f.maxSales)) return false;
  const roe = m.ROE != null ? parseFloat(m.ROE) : NaN;
  if (f.minRoe != null && f.minRoe !== "" && !isNaN(roe) && roe < parseFloat(f.minRoe)) return false;
  if (f.maxRoe != null && f.maxRoe !== "" && !isNaN(roe) && roe > parseFloat(f.maxRoe)) return false;
  const totalAssets = m.総資産額 != null ? parseFloat(m.総資産額) : NaN;
  if (
    f.minTotalAssets != null &&
    f.minTotalAssets !== "" &&
    !isNaN(totalAssets) &&
    totalAssets < parseFloat(f.minTotalAssets) * 1_000_000
  )
    return false;
  if (
    f.maxTotalAssets != null &&
    f.maxTotalAssets !== "" &&
    !isNaN(totalAssets) &&
    totalAssets > parseFloat(f.maxTotalAssets) * 1_000_000
  )
    return false;
  return true;
}

function getCellValueForExport(m: CompanyMetric, colId: ColumnId): string {
  switch (colId) {
    case "filerName":
      return formatDisplayName(m.filerName);
    case "secCode":
      return m.secCode;
    case "edinetCode":
      return m.edinetCode ?? "";
    case "calcDate":
      return m.計算日 ?? "－";
    case "fiscalMonth":
      return m.決算月 ?? "－";
    case "PER":
      return m.PER != null ? m.PER.toFixed(1) : "－";
    case "PBR":
      return m.PBR != null ? m.PBR.toFixed(2) : "－";
    case "dividendYield":
      return m.配当利回り != null ? m.配当利回り.toFixed(2) + "%" : "－";
    case "marketCap":
      return m.時価総額 != null ? formatSales(String(m.時価総額)) : "－";
    case "netCash":
      return m.ネットキャッシュ != null ? formatSales(String(m.ネットキャッシュ)) : "－";
    case "netCashRatio":
      return m.ネットキャッシュ比率 != null ? (m.ネットキャッシュ比率 * 100).toFixed(2) + "%" : "－";
    case "equityRatio":
      return formatRatio(m.自己資本比率);
    case "ROE":
      return formatRatio(m.ROE);
    case "EPS":
      return m.EPS ?? "－";
    case "BPS":
      return m.BPS ?? "－";
    case "payoutRatio":
      return formatRatio(m.配当性向);
    case "sales":
      return formatSales(m.売上高);
    case "operatingProfit":
      return formatSales(m.営業利益);
    case "operatingProfitRatio": {
      const sales = m.売上高 != null ? parseFloat(m.売上高) : NaN;
      const op = m.営業利益 != null ? parseFloat(m.営業利益) : NaN;
      if (isNaN(sales) || isNaN(op) || sales === 0) return "－";
      return ((op / sales) * 100).toFixed(2) + "%";
    }
    case "netIncome":
      return formatSales(m.当期純利益);
    case "netProfitRatio": {
      const sales = m.売上高 != null ? parseFloat(m.売上高) : NaN;
      const ni = m.当期純利益 != null ? parseFloat(m.当期純利益) : NaN;
      if (isNaN(sales) || isNaN(ni) || sales === 0) return "－";
      return ((ni / sales) * 100).toFixed(2) + "%";
    }
    case "liabilities":
      return formatSales(m.負債);
    case "currentLiabilities":
      return formatSales(m.流動負債);
    case "currentAssets":
      return formatSales(m.流動資産);
    case "investmentSecurities":
      return formatSales(m.投資有価証券);
    case "cashBalance":
      return formatSales(m.現金残高);
    case "dividendPerShare":
      return m.dividendPerShare ?? "－";
    case "sharesOutstanding":
      return m.発行済株式総数 != null ? parseInt(m.発行済株式総数, 10).toLocaleString() : "－";
    case "recurringProfit":
      return formatSales(m.経常利益);
    case "comprehensiveIncome":
      return formatSales(m.包括利益);
    case "netAssets":
      return formatSales(m.純資産額);
    case "totalAssets":
      return formatSales(m.総資産額);
    case "operatingCF":
      return formatSales(m.営業CF);
    case "investingCF":
      return formatSales(m.投資CF);
    case "financingCF":
      return formatSales(m.財務CF);
    default:
      return "－";
  }
}

function escapeCsvCell(s: string): string {
  if (/[,\n"]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function TableDownloadButton() {
  const { filters } = useFilters();
  const { favorites } = useFavorites();
  const { visibility, columnIds, columnLabel } = useColumnVisibility();
  const [loading, setLoading] = useState(false);

  const handleDownload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/data/company_metrics.json");
      const data = (await res.json()) as { metrics?: CompanyMetric[] };
      const metrics = data.metrics ?? [];

      const filtered = metrics.filter((m) => passesFilter(m, filters, favorites));
      const visibleColumns = columnIds.filter((id) => visibility[id]);

      const headers = visibleColumns.map((id) => columnLabel(id));
      const rows = filtered.map((m) =>
        visibleColumns.map((id) => escapeCsvCell(getCellValueForExport(m, id))).join(",")
      );

      const bom = "\uFEFF";
      const csv = bom + [headers.join(","), ...rows].join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `企業一覧_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  }, [filters, favorites, visibility, columnIds, columnLabel]);

  const toolbarBtnBase =
    "inline-flex items-center justify-center gap-1.5 min-h-[36px] min-w-[36px] px-3 py-2 rounded-md text-sm font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition disabled:opacity-50";

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={loading}
      className={toolbarBtnBase}
      title={loading ? "ダウンロード中" : "CSVダウンロード"}
    >
      <span className="material-symbols-outlined text-[20px]" aria-hidden>
        download
      </span>
      <span className="hidden md:inline">{loading ? "ダウンロード中…" : "ダウンロード"}</span>
    </button>
  );
}

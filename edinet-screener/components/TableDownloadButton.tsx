"use client";

import { useState, useCallback } from "react";
import { useFilters } from "./FilterContext.js";
import { useColumnVisibility, type ColumnId } from "./ColumnVisibilityContext.js";
import { useFavorites } from "./FavoritesContext.js";
import { passesFilter, type CompanyMetric } from "./CompanyTable.js";
import { Button } from "./ui/button";
import { Download, Loader2 } from "lucide-react";
import { formatRatioDecimalStringAsPercent, formatYenStringAsMillionYen } from "../lib/metricFormat.js";

const formatSales = formatYenStringAsMillionYen;
const formatRatio = formatRatioDecimalStringAsPercent;

function formatDisplayName(name: string): string {
  return name.replace(/^株式会社\s*|\s*株式会社$/g, "").trim() || name;
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
      return m.calcDate ?? "－";
    case "fiscalMonth":
      return m.fiscalMonth ?? "－";
    case "PER":
      return m.PER != null ? m.PER.toFixed(1) : "－";
    case "PBR":
      return m.PBR != null ? m.PBR.toFixed(2) : "－";
    case "dividendYield":
      return m.dividendYield != null ? m.dividendYield.toFixed(2) + "%" : "－";
    case "marketCap":
      return m.marketCap != null ? formatSales(String(m.marketCap)) : "－";
    case "netCash":
      return m.netCash != null ? formatSales(String(m.netCash)) : "－";
    case "netCashRatio":
      return m.netCashRatio != null ? (m.netCashRatio * 100).toFixed(2) + "%" : "－";
    case "equityRatio":
      return formatRatio(m.equityRatio);
    case "ROE":
      return formatRatio(m.ROE);
    case "EPS":
      return m.EPS ?? "－";
    case "dilutedEPS":
      return m.dilutedEPS ?? "－";
    case "roeCalculated":
      return formatRatio(m.roeCalculated ?? null);
    case "roa":
      return formatRatio(m.roa ?? null);
    case "equityRatioCalculated":
      return formatRatio(m.equityRatioCalculated ?? null);
    case "BPS":
      return m.BPS ?? "－";
    case "payoutRatio":
      return formatRatio(m.payoutRatio);
    case "payoutRatioComputed":
      return formatRatio(m.payoutRatioComputed ?? null);
    case "sales":
      return formatSales(m.sales);
    case "operatingProfit":
      return formatSales(m.operatingProfit);
    case "operatingProfitRatio": {
      const sales = m.sales != null ? parseFloat(m.sales) : NaN;
      const op = m.operatingProfit != null ? parseFloat(m.operatingProfit) : NaN;
      if (isNaN(sales) || isNaN(op) || sales === 0) return "－";
      return ((op / sales) * 100).toFixed(2) + "%";
    }
    case "netIncome":
      return formatSales(m.netIncome);
    case "netProfitRatio": {
      const sales = m.sales != null ? parseFloat(m.sales) : NaN;
      const ni = m.netIncome != null ? parseFloat(m.netIncome) : NaN;
      if (isNaN(sales) || isNaN(ni) || sales === 0) return "－";
      return ((ni / sales) * 100).toFixed(2) + "%";
    }
    case "liabilities":
      return formatSales(m.liabilities);
    case "currentLiabilities":
      return formatSales(m.currentLiabilities);
    case "currentAssets":
      return formatSales(m.currentAssets);
    case "investmentSecurities":
      return formatSales(m.investmentSecurities);
    case "cashBalance":
      return formatSales(m.cashBalance);
    case "dividendPerShare":
      return m.dividendPerShare ?? "－";
    case "sharesOutstanding":
      return m.sharesOutstanding != null ? parseInt(m.sharesOutstanding, 10).toLocaleString() : "－";
    case "recurringProfit":
      return formatSales(m.recurringProfit);
    case "comprehensiveIncome":
      return formatSales(m.comprehensiveIncome);
    case "netAssets":
      return formatSales(m.netAssets);
    case "totalAssets":
      return formatSales(m.totalAssets);
    case "operatingCF":
      return formatSales(m.operatingCF);
    case "investingCF":
      return formatSales(m.investingCF);
    case "fcf":
      return formatSales(m.fcf ?? null);
    case "financingCF":
      return formatSales(m.financingCF);
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
        visibleColumns.map((id) => escapeCsvCell(getCellValueForExport(m, id))).join(","),
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

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDownload}
      disabled={loading}
      title={loading ? "ダウンロード中" : "現在のフィルター・表示列でCSVをダウンロード"}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
      {/* <span className="text-xs sm:text-sm">{loading ? "処理中…" : "CSVでダウンロード"}</span> */}
    </Button>
  );
}

"use client";

import { useState, useEffect, type ReactNode } from "react";
import { useFilters } from "./FilterContext.js";
import { useColumnVisibility, type ColumnId } from "./ColumnVisibilityContext.js";
import { useFavorites } from "./FavoritesContext.js";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Skeleton } from "./ui/skeleton";
import { ArrowUp, ArrowDown, Star } from "lucide-react";
import { formatRatioDecimalStringAsPercent, formatYenStringAsMillionYen } from "../lib/metricFormat.js";

export type CompanyMetric = {
  edinetCode: string;
  secCode: string;
  filerName: string;
  calcDate: string | null;
  fiscalMonth: string | null;
  equityRatio: string | null;
  EPS: string | null;
  sales: string | null;
  recurringProfit: string | null;
  netIncome: string | null;
  netAssets: string | null;
  totalAssets: string | null;
  comprehensiveIncome: string | null;
  BPS: string | null;
  ROE: string | null;
  /** 親会社純利益÷純資産額（開示ROEと別） */
  roeCalculated?: string | null;
  /** 親会社純利益÷総資産額 */
  roa?: string | null;
  /** 純資産額÷総資産額（開示の自己資本比率と別） */
  equityRatioCalculated?: string | null;
  dilutedEPS?: string | null;
  /** DPS÷EPS（200%超は欠損扱い） */
  payoutRatioComputed?: string | null;
  /** 営業CF＋投資CF */
  fcf?: string | null;
  operatingProfit: string | null;
  operatingCF: string | null;
  investingCF: string | null;
  financingCF: string | null;
  cashBalance: string | null;
  payoutRatio: string | null;
  dividendPerShare: string | null;
  sharesOutstanding: string | null;
  currentAssets: string | null;
  currentLiabilities: string | null;
  liabilities: string | null;
  investmentSecurities: string | null;
  PER: number | null;
  PBR: number | null;
  dividendYield: number | null;
  marketCap?: number | null;
  netCash?: number | null;
  netCashRatio?: number | null;
  salesGrowthYoY?: string | null;
  opGrowthYoY?: string | null;
  epsGrowthYoY?: string | null;
  dividendGrowthYoY?: string | null;
  salesCagr3y?: string | null;
  salesCagr5y?: string | null;
  consecutiveDivIncreases?: number | null;
  currentRatio?: number | null;
  deRatio?: number | null;
  roic?: number | null;
  piotroskiFScore?: number | null;
};

const formatSales = formatYenStringAsMillionYen;
const formatRatio = formatRatioDecimalStringAsPercent;

function parseMetricNumber(value: string | number | null | undefined): number {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return NaN;
  return Number(value.replace(/,/g, "").trim());
}

function sortNum(value: string | number | null | undefined): number {
  const n = parseMetricNumber(value);
  return Number.isFinite(n) ? n : -Infinity;
}

function formatDisplayName(name: string): string {
  return name.replace(/^株式会社\s*|\s*株式会社$/g, "").trim() || name;
}

export function passesFilter(
  m: CompanyMetric,
  f: ReturnType<typeof useFilters>["filters"],
  favorites: Set<string>,
): boolean {
  if (f.showOnlyFavorites && !favorites.has(m.secCode)) return false;
  if (f.searchName.trim() && !m.filerName.toLowerCase().includes(f.searchName.trim().toLowerCase())) return false;
  if (f.searchCode.trim() && !m.secCode.includes(f.searchCode.trim())) return false;
  const eq = parseMetricNumber(m.equityRatio);
  if (f.minEquityRatio && !isNaN(eq) && eq < parseFloat(f.minEquityRatio)) return false;
  if (f.maxEquityRatio && !isNaN(eq) && eq > parseFloat(f.maxEquityRatio)) return false;
  const eps = parseMetricNumber(m.EPS);
  if (f.minEps && !isNaN(eps) && eps < parseFloat(f.minEps)) return false;
  if (f.maxEps && !isNaN(eps) && eps > parseFloat(f.maxEps)) return false;
  const sales = parseMetricNumber(m.sales);
  const minSalesYen = f.minSales && f.minSales !== "" ? parseFloat(f.minSales) * 1_000_000 : NaN;
  const maxSalesYen = f.maxSales && f.maxSales !== "" ? parseFloat(f.maxSales) * 1_000_000 : NaN;
  if (!isNaN(minSalesYen) && !isNaN(sales) && sales < minSalesYen) return false;
  if (!isNaN(maxSalesYen) && !isNaN(sales) && sales > maxSalesYen) return false;
  const roe = parseMetricNumber(m.ROE);
  if (f.minRoe != null && f.minRoe !== "" && !isNaN(roe) && roe < parseFloat(f.minRoe)) return false;
  if (f.maxRoe != null && f.maxRoe !== "" && !isNaN(roe) && roe > parseFloat(f.maxRoe)) return false;
  const totalAssets = parseMetricNumber(m.totalAssets);
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

function getCellValue(
  m: CompanyMetric,
  colId: ColumnId,
  favHelpers?: { isFavorite: (sec: string) => boolean; toggleFavorite: (sec: string) => void },
): ReactNode {
  switch (colId) {
    case "filerName":
      return (
        <span className="inline-flex items-center gap-1.5">
          {favHelpers && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                favHelpers.toggleFavorite(m.secCode);
              }}
              aria-label={favHelpers.isFavorite(m.secCode) ? "お気に入りから外す" : "お気に入りに追加"}
              title={favHelpers.isFavorite(m.secCode) ? "お気に入りから外す" : "お気に入りに追加"}
              className="h-5 w-5"
            >
              <Star
                className={`size-3.5 ${
                  favHelpers.isFavorite(m.secCode) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                }`}
              />
            </Button>
          )}
          <a
            href={`/analyze/${m.secCode}`}
            className="font-medium text-foreground hover:text-primary hover:underline underline-offset-4"
          >
            {formatDisplayName(m.filerName)}
          </a>
        </span>
      );
    case "secCode":
      return <Badge variant="outline">{m.secCode}</Badge>;
    case "edinetCode":
      return m.edinetCode;
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
      const s = parseMetricNumber(m.sales);
      const op = parseMetricNumber(m.operatingProfit);
      if (isNaN(s) || isNaN(op) || s === 0) return "－";
      return ((op / s) * 100).toFixed(2) + "%";
    }
    case "netIncome":
      return formatSales(m.netIncome);
    case "netProfitRatio": {
      const s = parseMetricNumber(m.sales);
      const ni = parseMetricNumber(m.netIncome);
      if (isNaN(s) || isNaN(ni) || s === 0) return "－";
      return ((ni / s) * 100).toFixed(2) + "%";
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
    case "sharesOutstanding": {
      const shares = sortNum(m.sharesOutstanding);
      return Number.isFinite(shares) ? Math.round(shares).toLocaleString("ja-JP") : "－";
    }
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
    case "salesGrowthYoY":
      return formatRatio(m.salesGrowthYoY ?? null);
    case "opGrowthYoY":
      return formatRatio(m.opGrowthYoY ?? null);
    case "epsGrowthYoY":
      return formatRatio(m.epsGrowthYoY ?? null);
    case "dividendGrowthYoY":
      return formatRatio(m.dividendGrowthYoY ?? null);
    case "salesCagr3y":
      return formatRatio(m.salesCagr3y ?? null);
    case "salesCagr5y":
      return formatRatio(m.salesCagr5y ?? null);
    case "consecutiveDivIncreases":
      return m.consecutiveDivIncreases != null ? String(m.consecutiveDivIncreases) : "－";
    case "currentRatio":
      return m.currentRatio != null ? m.currentRatio.toFixed(2) : "－";
    case "deRatio":
      return m.deRatio != null ? m.deRatio.toFixed(2) : "－";
    case "roic":
      return m.roic != null ? (m.roic * 100).toFixed(2) + "%" : "－";
    case "piotroskiFScore":
      return m.piotroskiFScore != null ? String(m.piotroskiFScore) : "－";
    default:
      return "－";
  }
}

function getSortValue(m: CompanyMetric, colId: ColumnId): number | string {
  switch (colId) {
    case "filerName":
      return m.filerName ?? "";
    case "secCode":
      return m.secCode ?? "";
    case "edinetCode":
      return m.edinetCode ?? "";
    case "calcDate":
      return m.calcDate ?? "";
    case "fiscalMonth":
      return m.fiscalMonth ?? "";
    case "PER":
      return m.PER ?? -Infinity;
    case "PBR":
      return m.PBR ?? -Infinity;
    case "dividendYield":
      return m.dividendYield ?? -Infinity;
    case "marketCap":
      return m.marketCap ?? -Infinity;
    case "netCash":
      return m.netCash ?? -Infinity;
    case "netCashRatio":
      return m.netCashRatio ?? -Infinity;
    case "equityRatio":
      return sortNum(m.equityRatio);
    case "ROE":
      return sortNum(m.ROE);
    case "EPS":
      return sortNum(m.EPS);
    case "dilutedEPS":
      return sortNum(m.dilutedEPS);
    case "roeCalculated":
      return sortNum(m.roeCalculated);
    case "roa":
      return sortNum(m.roa);
    case "equityRatioCalculated":
      return sortNum(m.equityRatioCalculated);
    case "BPS":
      return sortNum(m.BPS);
    case "payoutRatio":
      return sortNum(m.payoutRatio);
    case "payoutRatioComputed":
      return sortNum(m.payoutRatioComputed);
    case "sales":
      return sortNum(m.sales);
    case "operatingProfit":
      return sortNum(m.operatingProfit);
    case "operatingProfitRatio": {
      const s = parseMetricNumber(m.sales);
      const op = parseMetricNumber(m.operatingProfit);
      if (isNaN(s) || s === 0) return -Infinity;
      return isNaN(op) ? -Infinity : op / s;
    }
    case "netIncome":
      return sortNum(m.netIncome);
    case "netProfitRatio": {
      const s = parseMetricNumber(m.sales);
      const ni = parseMetricNumber(m.netIncome);
      if (isNaN(s) || s === 0) return -Infinity;
      return isNaN(ni) ? -Infinity : ni / s;
    }
    case "liabilities":
      return sortNum(m.liabilities);
    case "currentLiabilities":
      return sortNum(m.currentLiabilities);
    case "currentAssets":
      return sortNum(m.currentAssets);
    case "investmentSecurities":
      return sortNum(m.investmentSecurities);
    case "cashBalance":
      return sortNum(m.cashBalance);
    case "dividendPerShare":
      return sortNum(m.dividendPerShare);
    case "sharesOutstanding":
      return sortNum(m.sharesOutstanding);
    case "recurringProfit":
      return sortNum(m.recurringProfit);
    case "comprehensiveIncome":
      return sortNum(m.comprehensiveIncome);
    case "netAssets":
      return sortNum(m.netAssets);
    case "totalAssets":
      return sortNum(m.totalAssets);
    case "operatingCF":
      return sortNum(m.operatingCF);
    case "investingCF":
      return sortNum(m.investingCF);
    case "fcf":
      return sortNum(m.fcf);
    case "financingCF":
      return sortNum(m.financingCF);
    case "salesGrowthYoY":
      return sortNum(m.salesGrowthYoY);
    case "opGrowthYoY":
      return sortNum(m.opGrowthYoY);
    case "epsGrowthYoY":
      return sortNum(m.epsGrowthYoY);
    case "dividendGrowthYoY":
      return sortNum(m.dividendGrowthYoY);
    case "salesCagr3y":
      return sortNum(m.salesCagr3y);
    case "salesCagr5y":
      return sortNum(m.salesCagr5y);
    case "consecutiveDivIncreases":
      return m.consecutiveDivIncreases ?? -Infinity;
    case "currentRatio":
      return m.currentRatio ?? -Infinity;
    case "deRatio":
      return m.deRatio ?? -Infinity;
    case "roic":
      return m.roic ?? -Infinity;
    case "piotroskiFScore":
      return m.piotroskiFScore ?? -Infinity;
    default:
      return "";
  }
}

function getHeadAlign(colId: ColumnId): string {
  if (colId === "filerName") return "text-left";
  return "text-right";
}

function getCellAlign(colId: ColumnId): string {
  if (colId === "filerName") return "";
  if (colId === "secCode" || colId === "edinetCode" || colId === "calcDate" || colId === "fiscalMonth")
    return "tabular-nums";
  return "text-right tabular-nums";
}

export function CompanyTable() {
  const { filters } = useFilters();
  const { favorites, isFavorite, toggleFavorite } = useFavorites();
  const { visibility, columnIds, columnLabel } = useColumnVisibility();
  const [metrics, setMetrics] = useState<CompanyMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortColumn, setSortColumn] = useState<ColumnId | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => {
    fetch("/data/company_metrics.json")
      .then((res) => res.json())
      .then((data) => {
        const { metrics: metricsList } = data as { metrics?: CompanyMetric[] };
        setMetrics(metricsList ?? []);
        setLoading(false);
      })
      .catch(() => {
        setMetrics([]);
        setLoading(false);
      });
  }, []);

  const filtered = metrics.filter((m) => passesFilter(m, filters, favorites));
  const visibleColumns = columnIds.filter((id) => visibility[id]);
  const hasColumns = visibleColumns.length > 0;

  const handleSort = (colId: ColumnId) => {
    if (sortColumn === colId) {
      setSortAsc((prev) => !prev);
    } else {
      setSortColumn(colId);
      setSortAsc(true);
    }
  };

  const sorted =
    sortColumn == null
      ? filtered
      : [...filtered].sort((a, b) => {
          const va = getSortValue(a, sortColumn);
          const vb = getSortValue(b, sortColumn);
          const isNumA = typeof va === "number";
          const isNumB = typeof vb === "number";
          if (isNumA && isNumB) {
            const diff = (va as number) - (vb as number);
            return sortAsc ? diff : -diff;
          }
          const sa = String(va);
          const sb = String(vb);
          const cmp = sa.localeCompare(sb, "ja");
          return sortAsc ? cmp : -cmp;
        });

  if (loading) {
    return (
      <div className="space-y-3 p-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <p className="text-muted-foreground text-sm">該当する企業がありません。フィルターを緩めてください。</p>
      </div>
    );
  }

  if (!hasColumns) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <p className="text-muted-foreground text-sm">右上の「表示列」で表示する列を選択してください。</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {visibleColumns.map((id) => (
              <TableHead
                key={id}
                className={`${getHeadAlign(id)} cursor-pointer select-none hover:bg-muted/50 transition-colors ${
                  id === "filerName" ? "md:sticky md:left-0 md:z-10 bg-background" : ""
                }`}
                onClick={() => handleSort(id)}
              >
                <span className="inline-flex items-center gap-1">
                  {columnLabel(id)}
                  {sortColumn === id &&
                    (sortAsc ? (
                      <ArrowUp className="size-3.5 text-primary" />
                    ) : (
                      <ArrowDown className="size-3.5 text-primary" />
                    ))}
                </span>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((m) => (
            <TableRow key={m.edinetCode}>
              {visibleColumns.map((id) => (
                <TableCell
                  key={id}
                  className={`${getCellAlign(id)} ${
                    id === "filerName" ? "md:sticky md:left-0 md:z-10 bg-background font-medium" : ""
                  }`}
                >
                  {getCellValue(m, id, { isFavorite, toggleFavorite })}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

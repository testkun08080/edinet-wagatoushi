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

export type CompanyMetric = {
  edinetCode: string;
  secCode: string;
  filerName: string;
  計算日: string | null;
  決算月: string | null;
  自己資本比率: string | null;
  EPS: string | null;
  売上高: string | null;
  経常利益: string | null;
  当期純利益: string | null;
  純資産額: string | null;
  総資産額: string | null;
  包括利益: string | null;
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
  営業利益: string | null;
  営業CF: string | null;
  投資CF: string | null;
  財務CF: string | null;
  現金残高: string | null;
  配当性向: string | null;
  dividendPerShare: string | null;
  発行済株式総数: string | null;
  流動資産: string | null;
  流動負債: string | null;
  負債: string | null;
  投資有価証券: string | null;
  PER: number | null;
  PBR: number | null;
  配当利回り: number | null;
  時価総額?: number | null;
  ネットキャッシュ?: number | null;
  ネットキャッシュ比率?: number | null;
};

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

export function passesFilter(
  m: CompanyMetric,
  f: ReturnType<typeof useFilters>["filters"],
  favorites: Set<string>,
): boolean {
  if (f.showOnlyFavorites && !favorites.has(m.secCode)) return false;
  if (f.searchName.trim() && !m.filerName.toLowerCase().includes(f.searchName.trim().toLowerCase())) return false;
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
      return formatRatio(m.配当性向);
    case "payoutRatioComputed":
      return formatRatio(m.payoutRatioComputed ?? null);
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
    case "fcf":
      return formatSales(m.fcf ?? null);
    case "financingCF":
      return formatSales(m.財務CF);
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
      return m.計算日 ?? "";
    case "fiscalMonth":
      return m.決算月 ?? "";
    case "PER":
      return m.PER ?? -Infinity;
    case "PBR":
      return m.PBR ?? -Infinity;
    case "dividendYield":
      return m.配当利回り ?? -Infinity;
    case "marketCap":
      return m.時価総額 ?? -Infinity;
    case "netCash":
      return m.ネットキャッシュ ?? -Infinity;
    case "netCashRatio":
      return m.ネットキャッシュ比率 ?? -Infinity;
    case "equityRatio":
      return m.自己資本比率 != null ? parseFloat(m.自己資本比率) : -Infinity;
    case "ROE":
      return m.ROE != null ? parseFloat(m.ROE) : -Infinity;
    case "EPS":
      return m.EPS != null ? parseFloat(m.EPS) : -Infinity;
    case "dilutedEPS":
      return m.dilutedEPS != null ? parseFloat(m.dilutedEPS) : -Infinity;
    case "roeCalculated":
      return m.roeCalculated != null ? parseFloat(m.roeCalculated) : -Infinity;
    case "roa":
      return m.roa != null ? parseFloat(m.roa) : -Infinity;
    case "equityRatioCalculated":
      return m.equityRatioCalculated != null ? parseFloat(m.equityRatioCalculated) : -Infinity;
    case "BPS":
      return m.BPS != null ? parseFloat(m.BPS) : -Infinity;
    case "payoutRatio":
      return m.配当性向 != null ? parseFloat(m.配当性向) : -Infinity;
    case "payoutRatioComputed":
      return m.payoutRatioComputed != null ? parseFloat(m.payoutRatioComputed) : -Infinity;
    case "sales":
      return m.売上高 != null ? parseFloat(m.売上高) : -Infinity;
    case "operatingProfit":
      return m.営業利益 != null ? parseFloat(m.営業利益) : -Infinity;
    case "operatingProfitRatio": {
      const sales = m.売上高 != null ? parseFloat(m.売上高) : NaN;
      const op = m.営業利益 != null ? parseFloat(m.営業利益) : NaN;
      if (isNaN(sales) || sales === 0) return -Infinity;
      return isNaN(op) ? -Infinity : op / sales;
    }
    case "netIncome":
      return m.当期純利益 != null ? parseFloat(m.当期純利益) : -Infinity;
    case "netProfitRatio": {
      const sales = m.売上高 != null ? parseFloat(m.売上高) : NaN;
      const ni = m.当期純利益 != null ? parseFloat(m.当期純利益) : NaN;
      if (isNaN(sales) || sales === 0) return -Infinity;
      return isNaN(ni) ? -Infinity : ni / sales;
    }
    case "liabilities":
      return m.負債 != null ? parseFloat(m.負債) : -Infinity;
    case "currentLiabilities":
      return m.流動負債 != null ? parseFloat(m.流動負債) : -Infinity;
    case "currentAssets":
      return m.流動資産 != null ? parseFloat(m.流動資産) : -Infinity;
    case "investmentSecurities":
      return m.投資有価証券 != null ? parseFloat(m.投資有価証券) : -Infinity;
    case "cashBalance":
      return m.現金残高 != null ? parseFloat(m.現金残高) : -Infinity;
    case "dividendPerShare":
      return m.dividendPerShare != null ? parseFloat(m.dividendPerShare) : -Infinity;
    case "sharesOutstanding":
      return m.発行済株式総数 != null ? parseFloat(m.発行済株式総数) : -Infinity;
    case "recurringProfit":
      return m.経常利益 != null ? parseFloat(m.経常利益) : -Infinity;
    case "comprehensiveIncome":
      return m.包括利益 != null ? parseFloat(m.包括利益) : -Infinity;
    case "netAssets":
      return m.純資産額 != null ? parseFloat(m.純資産額) : -Infinity;
    case "totalAssets":
      return m.総資産額 != null ? parseFloat(m.総資産額) : -Infinity;
    case "operatingCF":
      return m.営業CF != null ? parseFloat(m.営業CF) : -Infinity;
    case "investingCF":
      return m.投資CF != null ? parseFloat(m.投資CF) : -Infinity;
    case "fcf":
      return m.fcf != null ? parseFloat(m.fcf) : -Infinity;
    case "financingCF":
      return m.財務CF != null ? parseFloat(m.財務CF) : -Infinity;
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
                  id === "filerName" ? "sticky left-0 z-10 bg-background" : ""
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
                    id === "filerName" ? "sticky left-0 z-10 bg-background font-medium" : ""
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

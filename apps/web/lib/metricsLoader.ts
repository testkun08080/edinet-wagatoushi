import type { CompanyMetricsRow } from "@edinet/metrics";
import type { MetricsQueryResponse } from "@edinet/types";
import type { FilterState } from "../components/FilterContext.js";
import type { ColumnId } from "../components/ColumnVisibilityContext.js";
import { api } from "./api";

export type CompanyMetric = CompanyMetricsRow;

export type ScreenerMode = "all" | "server";

const CHUNK_SIZE = 500;

export function getScreenerMode(): ScreenerMode {
  const mode = import.meta.env.VITE_SCREENER_MODE;
  return mode === "server" ? "server" : "all";
}

export type MetricsQueryParams = {
  q?: string;
  minRoe?: string;
  maxRoe?: string;
  minSales?: string;
  maxSales?: string;
  minEquityRatio?: string;
  maxEquityRatio?: string;
  minTotalAssets?: string;
  maxTotalAssets?: string;
  sort?: string;
  order?: "asc" | "desc";
  page?: string;
  pageSize?: string;
};

const SERVER_SORT_MAP: Partial<Record<ColumnId, MetricsQueryParams["sort"]>> = {
  filerName: "filer_name",
  calcDate: "calc_date",
  sales: "sales",
  ROE: "roe",
  totalAssets: "total_assets",
  equityRatio: "equity_ratio",
};

function millionYenToYen(value: string): string | undefined {
  if (!value.trim()) return undefined;
  const n = Number.parseFloat(value);
  if (!Number.isFinite(n)) return undefined;
  return String(n * 1_000_000);
}

function optionalFilter(value: string): string | undefined {
  return value.trim() ? value.trim() : undefined;
}

export function buildMetricsQueryParams(
  filters: FilterState,
  sortColumn: ColumnId | null,
  sortAsc: boolean,
  pageIndex: number,
  pageSize: number,
): MetricsQueryParams {
  const q = filters.searchName.trim() || filters.searchCode.trim() || undefined;
  const params: MetricsQueryParams = {
    page: String(pageIndex + 1),
    pageSize: String(pageSize),
  };

  if (q) params.q = q;
  if (optionalFilter(filters.minRoe)) params.minRoe = filters.minRoe.trim();
  if (optionalFilter(filters.maxRoe)) params.maxRoe = filters.maxRoe.trim();
  const minSales = millionYenToYen(filters.minSales);
  const maxSales = millionYenToYen(filters.maxSales);
  if (minSales) params.minSales = minSales;
  if (maxSales) params.maxSales = maxSales;
  if (optionalFilter(filters.minEquityRatio)) params.minEquityRatio = filters.minEquityRatio.trim();
  if (optionalFilter(filters.maxEquityRatio)) params.maxEquityRatio = filters.maxEquityRatio.trim();
  const minTotalAssets = millionYenToYen(filters.minTotalAssets);
  const maxTotalAssets = millionYenToYen(filters.maxTotalAssets);
  if (minTotalAssets) params.minTotalAssets = minTotalAssets;
  if (maxTotalAssets) params.maxTotalAssets = maxTotalAssets;

  const sortField = sortColumn ? SERVER_SORT_MAP[sortColumn] : undefined;
  if (sortField) {
    params.sort = sortField;
    params.order = sortAsc ? "asc" : "desc";
  }

  return params;
}

export async function loadCompanyMetrics(): Promise<CompanyMetric[]> {
  const all: CompanyMetric[] = [];
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;

  while (offset < total) {
    const res = await api.api.metrics.$get({
      query: { limit: String(CHUNK_SIZE), offset: String(offset) },
    });
    if (!res.ok) break;
    const body = (await res.json()) as unknown as { rows: CompanyMetric[]; total?: number };
    const rows = body.rows ?? [];
    if (rows.length === 0) break;
    all.push(...rows);
    total = body.total ?? all.length;
    offset += rows.length;
    if (rows.length < CHUNK_SIZE) break;
  }

  return all;
}

export async function queryCompanyMetricsPage(params: MetricsQueryParams): Promise<MetricsQueryResponse | null> {
  const res = await api.api.metrics.query.$get({ query: params });
  if (!res.ok) return null;
  return (await res.json()) as MetricsQueryResponse;
}

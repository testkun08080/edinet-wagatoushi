/**
 * Shared API response / domain types.
 * Used by both `apps/api` (returns) and `apps/web` (consumes).
 */

export interface Company {
  edinetCode: string;
  secCode: string | null;
  filerName: string;
  listedCategory: string | null;
  industry: string | null;
  updatedAt: string;
}

export interface CompanyListResponse {
  companies: Company[];
  total: number;
  page: number;
  pageSize: number;
}

export interface FinancialBlock {
  [key: string]: number | string | null;
}

export interface PeriodFinancialView {
  edinetCode: string;
  secCode: string | null;
  docId: string;
  docType: string;
  docDescription: string | null;
  periodStart: string | null;
  periodEnd: string;
  submitDateTime: string | null;
  filerName: string;
  summary: FinancialBlock;
  pl: FinancialBlock;
  bs: FinancialBlock;
  cf: FinancialBlock;
}

export interface SummaryResponse {
  secCode: string;
  periods: PeriodFinancialView[];
}

export interface MetricsRow {
  secCode: string;
  edinetCode: string;
  filerName: string;
  latestPeriodEnd: string;
  latestSubmitDateTime: string | null;
  industry: string | null;
  listedCategory: string | null;
  /** ROE / ROA / PER / PBR / FCF / 売上成長率など、UI 一覧テーブル列に対応 */
  [metric: string]: number | string | null;
}

export interface MetricsResponse {
  rows: MetricsRow[];
  columns: ColumnDefinition[];
  generatedAt: string;
}

export interface ColumnDefinition {
  key: string;
  label: string;
  group?: string;
  format?: "number" | "percent" | "currency" | "date" | "text";
  decimals?: number;
  defaultVisible?: boolean;
}

export interface SearchResult {
  type: "company";
  secCode: string | null;
  edinetCode: string;
  filerName: string;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
}

export interface ShareholderEntry {
  name: string;
  shares: number;
  ratio: number | null;
}

export interface ShareholderSnapshot {
  periodEnd: string;
  entries: ShareholderEntry[];
}

export interface ShareholdersResponse {
  secCode: string;
  snapshots: ShareholderSnapshot[];
}

export interface ManifestResponse {
  columns: ColumnDefinition[];
  generatedAt: string;
  schemaVersion: string;
}

export interface HealthResponse {
  ok: true;
  service: "edinet-api";
  version: string;
  timestamp: string;
}

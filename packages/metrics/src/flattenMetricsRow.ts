import type { MetricsRow } from "@edinet/types";
import type { CompanyMetricsDbRow, CompanyMetricsRow } from "./types.js";

export const METRICS_SCHEMA_VERSION = "v2";

export function metricsToDenormalizedColumns(metrics: CompanyMetricsRow): {
  sales: number | null;
  roe: number | null;
  equityRatio: number | null;
  totalAssets: number | null;
} {
  const sales = metrics.sales != null ? Number.parseFloat(metrics.sales.replace(/,/g, "")) : null;
  const roeRaw = metrics.ROE ?? metrics.roeCalculated;
  const roe =
    roeRaw != null && roeRaw !== "－" ? Number.parseFloat(String(roeRaw).replace(/,/g, "")) : null;
  const eqRaw = metrics.equityRatio ?? metrics.equityRatioCalculated;
  const equityRatio =
    eqRaw != null && eqRaw !== "－" ? Number.parseFloat(String(eqRaw).replace(/,/g, "")) : null;
  const totalAssets =
    metrics.totalAssets != null ? Number.parseFloat(metrics.totalAssets.replace(/,/g, "")) : null;
  return {
    sales: sales != null && Number.isFinite(sales) ? sales : null,
    roe: roe != null && Number.isFinite(roe) ? roe : null,
    equityRatio: equityRatio != null && Number.isFinite(equityRatio) ? equityRatio : null,
    totalAssets: totalAssets != null && Number.isFinite(totalAssets) ? totalAssets : null,
  };
}

/** Flatten a company_metrics DB row into an API MetricsRow. */
export function flattenMetricsRow(row: CompanyMetricsDbRow): MetricsRow {
  const parsed = JSON.parse(row.metricsJson) as CompanyMetricsRow;
  const {
    edinetCode: _edinetCode,
    secCode: _secCode,
    filerName: _filerName,
    calcDate: parsedCalcDate,
    fiscalMonth: parsedFiscalMonth,
    ...metricFields
  } = parsed;
  return {
    secCode: row.secCode,
    edinetCode: row.edinetCode,
    filerName: row.filerName,
    latestPeriodEnd: row.calcDate ?? parsedCalcDate ?? "",
    latestSubmitDateTime: null,
    industry: null,
    listedCategory: null,
    calcDate: row.calcDate ?? parsedCalcDate ?? null,
    fiscalMonth: row.fiscalMonth ?? parsedFiscalMonth ?? null,
    ...metricFields,
  };
}

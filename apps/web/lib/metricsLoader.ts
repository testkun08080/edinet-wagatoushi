/**
 * Dual-source loader for the screener metrics table.
 *
 * Behaviour:
 *   - If PUBLIC_ENV__API_URL is set at build/runtime, hit `/api/metrics`
 *     via hono/client (v2 path).
 *   - Otherwise fall back to the legacy static JSON at
 *     `/data/company_metrics.json` so existing deployments keep working.
 *
 * This is the migration seam: per-route callers swap from
 * `fetch("/data/...")` to `loadCompanyMetrics()` and we flip the source
 * once the API is verified in staging.
 */
import { api, apiBaseUrl } from "./api";

export interface CompanyMetric {
  // Mirror the shape the legacy JSON exposed. Extend gradually as the
  // API surfaces more derived metrics.
  secCode: string;
  edinetCode: string;
  filerName: string;
  latestPeriodEnd?: string;
  latestSubmitDateTime?: string | null;
  industry?: string | null;
  listedCategory?: string | null;
  [extra: string]: unknown;
}

const usingApi = () => {
  const url = apiBaseUrl;
  return Boolean(url) && !url.startsWith("http://localhost:8787/*missing*");
};

export async function loadCompanyMetrics(): Promise<CompanyMetric[]> {
  if (usingApi()) {
    try {
      const res = await api.api.metrics.$get({ query: { limit: "2000" } });
      if (res.ok) {
        const body = (await res.json()) as { rows: CompanyMetric[] };
        return body.rows ?? [];
      }
    } catch (err) {
      console.warn("[metricsLoader] API fetch failed, falling back to JSON:", err);
    }
  }

  const res = await fetch("/data/company_metrics.json");
  if (!res.ok) return [];
  const data = (await res.json()) as { metrics?: CompanyMetric[] };
  return data.metrics ?? [];
}

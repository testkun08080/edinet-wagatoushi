import { api } from "./api";

export interface CompanyMetric {
  secCode: string;
  edinetCode: string;
  filerName: string;
  latestPeriodEnd?: string;
  latestSubmitDateTime?: string | null;
  industry?: string | null;
  listedCategory?: string | null;
  [extra: string]: unknown;
}

export async function loadCompanyMetrics(): Promise<CompanyMetric[]> {
  const res = await api.api.metrics.$get({ query: { limit: "2000" } });
  if (!res.ok) return [];
  const body = (await res.json()) as { rows: CompanyMetric[] };
  return body.rows ?? [];
}

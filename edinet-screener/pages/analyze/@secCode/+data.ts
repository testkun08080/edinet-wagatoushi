// https://vike.dev/data

import type { PageContextServer } from "vike/types";
import { useConfig } from "vike-react/useConfig";

export type CompanySummary = {
  edinetCode: string;
  secCode: string;
  filerName: string;
  periods: Array<{
    periodStart: string;
    periodEnd: string;
    docID: string;
    docDescription: string;
    submitDateTime: string;
    summary: Record<string, string>;
    pl: Record<string, string>;
    bs: Record<string, string>;
    cf: Record<string, string>;
  }>;
};

export type CompanyMetricsRow = {
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

export type Data = Awaited<ReturnType<typeof data>>;

export async function data(pageContext: PageContextServer) {
  const secCode = pageContext.routeParams?.secCode;
  if (!secCode) {
    return { company: null, metrics: null, error: "証券コードが指定されていません" };
  }

  try {
    const config = useConfig();
    const base =
      typeof pageContext.urlOriginal === "string" ? new URL(pageContext.urlOriginal).origin : "http://localhost:3000";

    const [companyRes, metricsRes] = await Promise.all([
      fetch(`${base}/data/summaries/${secCode}.json`),
      fetch(`${base}/data/company_metrics.json`),
    ]);

    if (!companyRes.ok) {
      if (companyRes.status === 404) {
        return {
          company: null,
          metrics: null,
          error: `証券コード ${secCode} のデータが見つかりません。企業一覧から選択してください。`,
        };
      }
      throw new Error(`HTTP ${companyRes.status}`);
    }
    const company = (await companyRes.json()) as CompanySummary;
    config({ title: `${company.filerName} - 企業分析 | エディー` });

    let metrics: CompanyMetricsRow | null = null;
    if (metricsRes.ok) {
      const metricsData = (await metricsRes.json()) as { metrics?: CompanyMetricsRow[] };
      metrics = metricsData.metrics?.find((m) => m.secCode === secCode) ?? null;
    }

    return { company, metrics, error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { company: null, metrics: null, error: `データの取得に失敗しました: ${msg}` };
  }
}

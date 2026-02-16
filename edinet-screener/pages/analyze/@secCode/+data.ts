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

export type Data = Awaited<ReturnType<typeof data>>;

export async function data(pageContext: PageContextServer) {
  const secCode = pageContext.routeParams?.secCode;
  if (!secCode) {
    return { company: null, error: "証券コードが指定されていません" };
  }

  try {
    const config = useConfig();
    const base =
      typeof pageContext.urlOriginal === "string" ? new URL(pageContext.urlOriginal).origin : "http://localhost:5173";
    const res = await fetch(`${base}/data/summaries/${secCode}.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const company = (await res.json()) as CompanySummary;
    config({ title: `${company.filerName} - 企業分析 | EDINET Screener` });
    return { company, error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { company: null, error: `データの取得に失敗しました: ${msg}` };
  }
}

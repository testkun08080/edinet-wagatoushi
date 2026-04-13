// https://vike.dev/data

import type { PageContextServer } from "vike/types";

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
    /** e.g. raw_tsv/67030/S100R4I6.json — used for 大株主 extraction */
    rawTsvPath?: string;
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
  dilutedEPS?: string | null;
  roeCalculated?: string | null;
  roa?: string | null;
  equityRatioCalculated?: string | null;
  payoutRatioComputed?: string | null;
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

export type Data = Awaited<ReturnType<typeof data>>;

function compareSubmitDateTime(a: string, b: string): number {
  return a.localeCompare(b, "en");
}

/**
 * 同一提出（periodEnd + docID）の重複行を除去。提出日時が新しい方を残す。
 * EDINET 再提出などで JSON 内に同一 doc が複製されているケースへの対処。
 */
function dedupePeriodsByPeriodEndAndDoc(periods: CompanySummary["periods"]): CompanySummary["periods"] {
  const map = new Map<string, CompanySummary["periods"][0]>();
  for (const p of periods) {
    const key = `${p.periodEnd}\0${p.docID}`;
    const prev = map.get(key);
    if (!prev || compareSubmitDateTime(p.submitDateTime, prev.submitDateTime) > 0) {
      map.set(key, p);
    }
  }
  return Array.from(map.values()).sort((a, b) => {
    const c = a.periodEnd.localeCompare(b.periodEnd);
    if (c !== 0) return c;
    return compareSubmitDateTime(a.submitDateTime, b.submitDateTime);
  });
}

/** JSON の欠損で periods が無いと画面が例外落ちするため正規化する */
function normalizeCompanySummary(raw: unknown, secCode: string): CompanySummary {
  if (!raw || typeof raw !== "object") {
    throw new Error("企業データの形式が不正です");
  }
  const o = raw as Record<string, unknown>;
  const periodsRaw = o.periods;
  const periods: CompanySummary["periods"] = [];
  if (Array.isArray(periodsRaw)) {
    for (const pr of periodsRaw) {
      if (!pr || typeof pr !== "object") continue;
      const p = pr as Record<string, unknown>;
      periods.push({
        periodStart: String(p.periodStart ?? ""),
        periodEnd: String(p.periodEnd ?? ""),
        docID: String(p.docID ?? ""),
        docDescription: String(p.docDescription ?? ""),
        submitDateTime: String(p.submitDateTime ?? ""),
        summary: typeof p.summary === "object" && p.summary !== null ? (p.summary as Record<string, string>) : {},
        pl: typeof p.pl === "object" && p.pl !== null ? (p.pl as Record<string, string>) : {},
        bs: typeof p.bs === "object" && p.bs !== null ? (p.bs as Record<string, string>) : {},
        cf: typeof p.cf === "object" && p.cf !== null ? (p.cf as Record<string, string>) : {},
        rawTsvPath: typeof p.rawTsvPath === "string" ? p.rawTsvPath : undefined,
      });
    }
  }
  return {
    edinetCode: String(o.edinetCode ?? ""),
    secCode: String(o.secCode ?? secCode),
    filerName: String(o.filerName ?? "（無題）"),
    periods: dedupePeriodsByPeriodEndAndDoc(periods),
  };
}

/**
 * SSR / Workers では urlOriginal が相対パスのみのことがあり new URL() が例外になる。
 * Vike の urlParsed.origin を最優先する。
 */
function resolveFetchOrigin(pageContext: PageContextServer): string {
  const parsedOrigin = pageContext.urlParsed?.origin;
  if (typeof parsedOrigin === "string" && parsedOrigin.length > 0) {
    return parsedOrigin;
  }
  const raw = pageContext.urlOriginal;
  if (typeof raw === "string" && /^https?:\/\//i.test(raw)) {
    try {
      return new URL(raw).origin;
    } catch {
      /* fall through */
    }
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  const headers = pageContext.headers;
  if (headers) {
    const h = headers as Record<string, string | undefined>;
    const host = h.host ?? h.Host ?? h["host"] ?? h["HOST"];
    if (typeof host === "string" && host.length > 0) {
      const proto = h["x-forwarded-proto"] === "https" ? "https" : "http";
      return `${proto}://${host}`;
    }
  }
  // Last resort: match the Vike dev server port used by this project.
  return "http://localhost:3000";
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

/** 同一オリジンで JSON を取得。Photon/Workers では node:fs が使えないため fetch のみ。 */
async function fetchPublicJson(path: string, base: string, timeoutMs: number): Promise<Response> {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const primary = await fetchWithTimeout(`${base}${normalized}`, timeoutMs);
  if (primary.ok || primary.status !== 404) {
    return primary;
  }
  // localhost と 127.0.0.1 で静的配信の扱いが分かれる環境向け
  try {
    const u = new URL(base);
    if (u.hostname === "localhost") {
      u.hostname = "127.0.0.1";
    } else if (u.hostname === "127.0.0.1") {
      u.hostname = "localhost";
    } else {
      return primary;
    }
    const second = await fetchWithTimeout(`${u.origin}${normalized}`, timeoutMs);
    if (second.ok || second.status !== 404) {
      return second;
    }
  } catch {
    /* ignore */
  }
  return primary;
}

export async function data(pageContext: PageContextServer) {
  const secCode = pageContext.routeParams?.secCode;
  if (!secCode) {
    return { company: null, metrics: null, error: "証券コードが指定されていません" };
  }

  try {
    const base = resolveFetchOrigin(pageContext);

    // Ensure we don't keep Vike's globalContext pending indefinitely.
    // (Vike warns when a Promise hasn't resolved after ~3s in dev.)
    const timeoutMs = 2500;
    const [companyRes, metricsRes] = await Promise.all([
      fetchPublicJson(`/data/summaries/${secCode}.json`, base, timeoutMs),
      fetchPublicJson("/data/company_metrics.json", base, timeoutMs),
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
    const company = normalizeCompanySummary(await companyRes.json(), secCode);

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

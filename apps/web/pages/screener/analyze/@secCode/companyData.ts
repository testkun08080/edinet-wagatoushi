export type {
  CompanyMetricsRow,
  CompanySummary,
} from "@edinet/metrics";
export { metricsFromPeriods } from "@edinet/metrics";

import { compareSubmitDateTime, type CompanySummary } from "@edinet/metrics";

function docDescriptionFromPeriod(p: Record<string, unknown>): string {
  const explicit = String(p.docDescription ?? "");
  if (explicit) return explicit;
  const docType = String(p.docType ?? "");
  if (docType === "annual") return "有価証券報告書";
  if (docType === "quarter" || docType === "quarterly" || docType === "quarterly_amended") {
    return "四半期報告書";
  }
  if (
    docType === "semi_annual" ||
    docType === "semiAnnual" ||
    docType === "semiannual" ||
    docType === "semiannual_amended"
  ) {
    return "半期報告書";
  }
  return "";
}

function blockToStringRecord(block: unknown): Record<string, string> {
  if (!block || typeof block !== "object" || Array.isArray(block)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(block)) {
    if (v == null) continue;
    out[k] = String(v);
  }
  return out;
}

/**
 * 同一提出（periodEnd + docID）の重複行を除去。提出日時が新しい方を残す。
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
export function normalizeCompanySummary(raw: unknown, secCode: string): CompanySummary {
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
        docID: String(p.docID ?? p.docId ?? ""),
        docDescription: docDescriptionFromPeriod(p),
        submitDateTime: String(p.submitDateTime ?? ""),
        summary: blockToStringRecord(p.summary),
        pl: blockToStringRecord(p.pl),
        bs: blockToStringRecord(p.bs),
        cf: blockToStringRecord(p.cf),
      });
    }
  }
  const deduped = dedupePeriodsByPeriodEndAndDoc(periods);
  const firstRaw =
    Array.isArray(periodsRaw) && periodsRaw[0] && typeof periodsRaw[0] === "object"
      ? (periodsRaw[0] as Record<string, unknown>)
      : null;

  return {
    edinetCode: String(o.edinetCode ?? firstRaw?.edinetCode ?? ""),
    secCode: String(o.secCode ?? secCode),
    filerName: String(o.filerName ?? firstRaw?.filerName ?? "（無題）"),
    periods: deduped,
  };
}

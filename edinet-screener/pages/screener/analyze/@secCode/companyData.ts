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
  calcDate: string | null;
  fiscalMonth: string | null;
  equityRatio: string | null;
  EPS: string | null;
  sales: string | null;
  recurringProfit: string | null;
  netIncome: string | null;
  netAssets: string | null;
  totalAssets: string | null;
  comprehensiveIncome: string | null;
  BPS: string | null;
  ROE: string | null;
  dilutedEPS?: string | null;
  roeCalculated?: string | null;
  roa?: string | null;
  equityRatioCalculated?: string | null;
  payoutRatioComputed?: string | null;
  fcf?: string | null;
  operatingProfit: string | null;
  operatingCF: string | null;
  investingCF: string | null;
  financingCF: string | null;
  cashBalance: string | null;
  payoutRatio: string | null;
  dividendPerShare: string | null;
  sharesOutstanding: string | null;
  currentAssets: string | null;
  currentLiabilities: string | null;
  liabilities: string | null;
  investmentSecurities: string | null;
  PER: number | null;
  PBR: number | null;
  dividendYield: number | null;
  marketCap?: number | null;
  netCash?: number | null;
  netCashRatio?: number | null;
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

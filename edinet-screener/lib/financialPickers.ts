/**
 * EDINET フラット化後の summary / pl / cf から、表示用の値を取る。
 * JP GAAP のキーが無い IFRS 開示向けフォールバックを含む。
 */

export function pickSummaryRevenueForChart(summary: Record<string, string> | undefined): string | undefined {
  const s = summary ?? {};
  const v = s["売上高"] ?? s["売上収益（IFRS）"];
  if (v == null || v === "" || v === "－") return undefined;
  return v;
}

export function pickPlRevenueForChart(pl: Record<string, string> | undefined): string | undefined {
  const p = pl ?? {};
  const v = p["売上高"] ?? p["売上収益（IFRS）"];
  if (v == null || v === "" || v === "－") return undefined;
  return v;
}

export function pickCfDividendPaid(cf: Record<string, string> | undefined): string | undefined {
  const c = cf ?? {};
  const v = c["配当金の支払額"] ?? c["配当金の支払額（IFRS）"];
  if (v == null || v === "" || v === "－") return undefined;
  return v;
}

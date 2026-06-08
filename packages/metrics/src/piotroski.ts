import { parseDecimal, parseYen, pickFromPeriod } from "./helpers.js";
import type { CompanySummary } from "./types.js";

type PeriodBlocks = CompanySummary["periods"][0];

function pickNum(period: PeriodBlocks, ...keys: string[]): number | null {
  for (const key of keys) {
    const v = parseDecimal(pickFromPeriod(period, key));
    if (v != null) return v;
  }
  return null;
}

function pickYen(period: PeriodBlocks, ...keys: string[]): number | null {
  for (const key of keys) {
    const v = parseYen(pickFromPeriod(period, key));
    if (v != null) return v;
  }
  return null;
}

function roa(period: PeriodBlocks): number | null {
  const ni = pickYen(period, "親会社株主に帰属する当期純利益", "当期純利益", "netIncome");
  const ta = pickYen(period, "総資産額", "総資産", "totalAssets");
  if (ni == null || ta == null || ta === 0) return null;
  return ni / ta;
}

function grossMargin(period: PeriodBlocks): number | null {
  const sales = pickYen(period, "売上高", "売上収益（IFRS）", "revenue");
  const gross = pickYen(period, "売上総利益又は売上総損失（△)", "売上総利益");
  if (sales == null || gross == null || sales === 0) return null;
  return gross / sales;
}

function assetTurnover(period: PeriodBlocks): number | null {
  const sales = pickYen(period, "売上高", "売上収益（IFRS）", "revenue");
  const ta = pickYen(period, "総資産額", "総資産", "totalAssets");
  if (sales == null || ta == null || ta === 0) return null;
  return sales / ta;
}

function leverageRatio(period: PeriodBlocks): number | null {
  const liab = pickYen(period, "負債");
  const ta = pickYen(period, "総資産額", "総資産", "totalAssets");
  if (liab == null || ta == null || ta === 0) return null;
  return liab / ta;
}

function currentRatio(period: PeriodBlocks): number | null {
  const ca = pickYen(period, "流動資産");
  const cl = pickYen(period, "流動負債");
  if (ca == null || cl == null || cl === 0) return null;
  return ca / cl;
}

function sharesOutstanding(period: PeriodBlocks): number | null {
  return pickYen(period, "発行済株式総数（普通株式）", "発行済株式総数");
}

/**
 * Standard Piotroski F-Score (0–9) from latest and prior period PL/BS/CF.
 * Returns null when prior-period data is insufficient.
 */
export function computePiotroskiFScore(
  current: PeriodBlocks,
  prior: PeriodBlocks | undefined,
): number | null {
  if (!prior) return null;

  const ni = pickYen(current, "親会社株主に帰属する当期純利益", "当期純利益", "netIncome");
  const ocf = pickYen(current, "営業活動によるキャッシュ・フロー", "operatingCF");
  const currRoa = roa(current);
  const priorRoa = roa(prior);
  const currLev = leverageRatio(current);
  const priorLev = leverageRatio(prior);
  const currCr = currentRatio(current);
  const priorCr = currentRatio(prior);
  const currShares = sharesOutstanding(current);
  const priorShares = sharesOutstanding(prior);
  const currGm = grossMargin(current);
  const priorGm = grossMargin(prior);
  const currAt = assetTurnover(current);
  const priorAt = assetTurnover(prior);

  if (
    ni == null ||
    ocf == null ||
    currRoa == null ||
    priorRoa == null ||
    currLev == null ||
    priorLev == null ||
    currCr == null ||
    priorCr == null ||
    currShares == null ||
    priorShares == null ||
    currGm == null ||
    priorGm == null ||
    currAt == null ||
    priorAt == null
  ) {
    return null;
  }

  let score = 0;
  if (ni > 0) score++;
  if (currRoa > 0) score++;
  if (ocf > 0) score++;
  if (ocf > ni) score++;
  if (currLev < priorLev) score++;
  if (currCr > priorCr) score++;
  if (currShares <= priorShares) score++;
  if (currGm > priorGm) score++;
  if (currAt > priorAt) score++;
  return score;
}

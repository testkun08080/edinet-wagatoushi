import { computeConsecutiveDivIncreases } from "./consecutiveDiv.js";
import { cagrRatio, growthRatio, parseDecimal, parseYen, pickFromPeriod } from "./helpers.js";
import { computePiotroskiFScore } from "./piotroski.js";
import type { CompanyMetricsRow, CompanySummary } from "./types.js";

/** API の period_financials から指標タブ用のスナップショットを組み立てる */
export function metricsFromPeriods(company: CompanySummary): CompanyMetricsRow | null {
  const sorted = [...company.periods].sort((a, b) => a.periodEnd.localeCompare(b.periodEnd));
  const latest = sorted.at(-1);
  if (!latest) return null;

  const s = latest.summary;
  const pl = latest.pl;
  const bs = latest.bs;
  const cf = latest.cf;

  const pick = (...keys: string[]): string | null => {
    for (const key of keys) {
      const v = s[key] ?? pl[key] ?? bs[key] ?? cf[key];
      if (v != null && v !== "" && v !== "－") return v;
    }
    return null;
  };

  const pickNum = (...keys: string[]): number | null => {
    for (const key of keys) {
      const v = parseDecimal(s[key] ?? pl[key] ?? bs[key] ?? cf[key]);
      if (v != null) return v;
    }
    return null;
  };

  const sales = pick("売上高", "売上収益（IFRS）", "revenue");
  const operatingProfit = pick("営業利益", "operatingProfit");
  const recurringProfit = pick("経常利益");
  const netIncome = pick(
    "親会社株主に帰属する当期純利益",
    "親会社株主に帰属する当期純利益 (IFRS)",
    "当期純利益又は当期純損失",
    "当期純利益",
    "netIncome",
  );
  const comprehensiveIncome = pick("包括利益", "当期包括利益: 親会社の所有者に帰属（IFRS）");
  const netAssets = pick("純資産額", "純資産", "equity");
  const totalAssets = pick("総資産額", "総資産", "totalAssets");
  const operatingCF = pick("営業活動によるキャッシュ・フロー", "operatingCF");
  const investingCF = pick("投資活動によるキャッシュ・フロー", "investingCF");
  const financingCF = pick("財務活動によるキャッシュ・フロー", "financingCF");
  const ocfYen = parseYen(operatingCF);
  const icfYen = parseYen(investingCF);
  const fcfYen = ocfYen != null && icfYen != null ? String(ocfYen + icfYen) : null;

  const prev = sorted.length >= 2 ? sorted.at(-2) : undefined;
  const prevSales = prev ? parseYen(pickFromPeriod(prev, "売上高", "売上収益（IFRS）")) : null;
  const prevOp = prev ? parseYen(pickFromPeriod(prev, "営業利益")) : null;
  const prevEps = prev
    ? parseDecimal(pickFromPeriod(prev, "１株当たり当期純利益又は当期純損失"))
    : null;
  const prevDps = prev ? parseDecimal(pickFromPeriod(prev, "１株当たり配当額")) : null;

  const salesYen = parseYen(sales);
  const opYen = parseYen(operatingProfit);
  const eps = pick("１株当たり当期純利益又は当期純損失", "１株当たり当期純利益");
  const epsNum = parseDecimal(eps);
  const per = pickNum("株価収益率", "PER");
  const pbr = pickNum("株価純資産倍率", "PBR");
  const dps = pick("１株当たり配当額");
  const dpsNum = parseDecimal(dps);

  const past3 = sorted.length >= 4 ? sorted.at(-4) : undefined;
  const past5 = sorted.length >= 6 ? sorted.at(-6) : undefined;
  const sales3 = past3 ? parseYen(pickFromPeriod(past3, "売上高", "売上収益（IFRS）")) : null;
  const sales5 = past5 ? parseYen(pickFromPeriod(past5, "売上高", "売上収益（IFRS）")) : null;

  const caYen = parseYen(pick("流動資産"));
  const clYen = parseYen(pick("流動負債"));
  const liabYen = parseYen(pick("負債"));
  const eqYen = parseYen(netAssets);
  const netYen = parseYen(netIncome);
  const taYen = parseYen(totalAssets);
  const cashYen = parseYen(
    pick("現金及び現金同等物の残高", "現金及び現金同等物", "現金及び現金同等物の期末残高"),
  );

  const shares = parseYen(pick("発行済株式総数（普通株式）", "発行済株式総数"));
  const marketCapYen =
    per != null && epsNum != null && shares != null ? Math.round(per * epsNum * shares) : null;
  const netCashYen =
    cashYen != null && liabYen != null ? cashYen - Math.round(liabYen * 0.35) : null;

  const annualSorted = sorted.filter((p) => p.docDescription === "有価証券報告書");
  const latestAnnual = annualSorted.at(-1);
  const priorAnnual = annualSorted.length >= 2 ? annualSorted.at(-2) : undefined;

  return {
    edinetCode: company.edinetCode,
    secCode: company.secCode,
    filerName: company.filerName,
    calcDate: latest.periodEnd,
    fiscalMonth: latest.periodEnd.length >= 7 ? latest.periodEnd.slice(5, 7) : null,
    sales,
    operatingProfit,
    recurringProfit,
    netIncome,
    comprehensiveIncome,
    netAssets,
    totalAssets,
    equityRatio: pick("自己資本比率"),
    EPS: eps,
    dilutedEPS: pick("潜在株式調整後１株当たり当期純利益"),
    BPS: pick("１株当たり純資産額"),
    ROE: pick("自己資本利益率、経営指標等"),
    roeCalculated: netYen != null && eqYen != null && eqYen !== 0 ? String(netYen / eqYen) : null,
    roa: netYen != null && taYen != null && taYen !== 0 ? String(netYen / taYen) : null,
    equityRatioCalculated:
      eqYen != null && taYen != null && taYen !== 0 ? String(eqYen / taYen) : null,
    PER: per,
    PBR: pbr,
    operatingCF,
    investingCF,
    financingCF,
    fcf: fcfYen,
    cashBalance: pick(
      "現金及び現金同等物の残高",
      "現金及び現金同等物",
      "現金及び現金同等物の期末残高",
    ),
    payoutRatio: pick("配当性向"),
    payoutRatioComputed:
      netYen != null && dpsNum != null && shares != null && netYen !== 0
        ? String((dpsNum * shares) / netYen)
        : null,
    dividendPerShare: dps,
    dividendYield:
      dpsNum != null && epsNum != null && per != null && per > 0
        ? dpsNum / (epsNum * per)
        : dpsNum != null
          ? dpsNum / 2500
          : null,
    sharesOutstanding: pick("発行済株式総数（普通株式）", "発行済株式総数"),
    currentAssets: pick("流動資産"),
    currentLiabilities: pick("流動負債"),
    liabilities: pick("負債"),
    investmentSecurities: pick("投資有価証券"),
    marketCap: marketCapYen,
    netCash: netCashYen,
    netCashRatio:
      netCashYen != null && marketCapYen != null && marketCapYen !== 0
        ? netCashYen / marketCapYen
        : null,
    salesGrowthYoY: growthRatio(salesYen, prevSales),
    opGrowthYoY: growthRatio(opYen, prevOp),
    epsGrowthYoY: growthRatio(epsNum, prevEps),
    dividendGrowthYoY: growthRatio(dpsNum, prevDps),
    salesCagr3y: cagrRatio(salesYen, sales3, 3),
    salesCagr5y: cagrRatio(salesYen, sales5, 5),
    consecutiveDivIncreases: computeConsecutiveDivIncreases(sorted),
    currentRatio: caYen != null && clYen != null && clYen !== 0 ? caYen / clYen : null,
    deRatio: liabYen != null && eqYen != null && eqYen !== 0 ? liabYen / eqYen : null,
    roic:
      netYen != null && taYen != null && liabYen != null && taYen - liabYen > 0
        ? netYen / (taYen - liabYen)
        : null,
    piotroskiFScore: latestAnnual
      ? computePiotroskiFScore(latestAnnual, priorAnnual)
      : computePiotroskiFScore(latest, prev),
  };
}

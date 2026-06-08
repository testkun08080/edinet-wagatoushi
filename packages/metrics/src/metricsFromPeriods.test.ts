import { describe, expect, it } from "vitest";
import { metricsFromPeriods } from "./metricsFromPeriods.js";
import type { CompanySummary } from "./types.js";

const ANNUAL_FY = [2021, 2022, 2023, 2024, 2025];
const mult = [0.75, 0.82, 0.88, 0.94, 1.0];

function yen(n: number): string {
  return String(Math.round(n));
}

function buildBlocks(scale: number, perShareScale = scale) {
  const sales = 1_000_000_000_000 * scale;
  const op = 120_000_000_000 * scale;
  const ord = 115_000_000_000 * scale;
  const net = 80_000_000_000 * scale;
  const comp = 82_000_000_000 * scale;
  const ta = 2_500_000_000_000 * scale;
  const eq = 1_200_000_000_000 * scale;
  const liab = 1_300_000_000_000 * scale;
  const ca = 900_000_000_000 * scale;
  const cl = 500_000_000_000 * scale;
  const ocf = 150_000_000_000 * scale;
  const icf = -60_000_000_000 * scale;
  const fcf = -40_000_000_000 * scale;
  const cash = 200_000_000_000 * scale;
  const invSec = 45_000_000_000 * scale;
  const cogs = 700_000_000_000 * scale;
  const gross = 300_000_000_000 * scale;
  const sga = 180_000_000_000 * scale;
  const eps = (185.5 * perShareScale).toFixed(2);
  const bps = (2180 * Math.cbrt(scale)).toFixed(2);
  const dps = (50 * perShareScale).toFixed(2);
  const shares = 430_000_000;
  const equityRatio = (eq / ta).toFixed(4);
  const roe = (net / eq).toFixed(4);
  const payout = (0.3 + (scale - 0.75) * 0.15).toFixed(4);
  const per = (14 + (scale - 0.75) * 8).toFixed(2);
  const pbr = (1.05 + (scale - 0.75) * 0.5).toFixed(2);

  return {
    summary: {
      売上高: yen(sales),
      経常利益: yen(ord),
      包括利益: yen(comp),
      親会社株主に帰属する当期純利益: yen(net),
      純資産額: yen(eq),
      総資産額: yen(ta),
      "１株当たり純資産額": bps,
      "１株当たり当期純利益又は当期純損失": eps,
      自己資本比率: equityRatio,
      "自己資本利益率、経営指標等": roe,
      株価収益率: per,
      株価純資産倍率: pbr,
      営業活動によるキャッシュ・フロー: yen(ocf),
      投資活動によるキャッシュ・フロー: yen(icf),
      財務活動によるキャッシュ・フロー: yen(fcf),
      現金及び現金同等物の残高: yen(cash),
      配当性向: payout,
      "１株当たり配当額": dps,
      "発行済株式総数（普通株式）": yen(shares),
    },
    pl: {
      売上高: yen(sales),
      売上原価: yen(cogs),
      "売上総利益又は売上総損失（△)": yen(gross),
      販売費及び一般管理費: yen(sga),
      営業利益: yen(op),
      経常利益: yen(ord),
      親会社株主に帰属する当期純利益: yen(net),
    },
    bs: {
      総資産: yen(ta),
      流動資産: yen(ca),
      負債: yen(liab),
      純資産: yen(eq),
      流動負債: yen(cl),
      現金及び現金同等物: yen(cash),
      投資有価証券: yen(invSec),
    },
    cf: {
      営業活動によるキャッシュ・フロー: yen(ocf),
      投資活動によるキャッシュ・フロー: yen(icf),
      財務活動によるキャッシュ・フロー: yen(fcf),
      現金及び現金同等物の期末残高: yen(cash),
    },
  };
}

function buildGoldenCompany(): CompanySummary {
  const periods: CompanySummary["periods"] = [];
  for (let i = 0; i < ANNUAL_FY.length; i++) {
    const fy = ANNUAL_FY[i];
    const m = mult[i];
    const blocks = buildBlocks(m, m);
    periods.push({
      periodStart: `${fy - 1}-04-01`,
      periodEnd: `${fy}-03-31`,
      docID: `SAMPLE-ANNUAL-${fy}`,
      docDescription: "有価証券報告書",
      submitDateTime: `${fy}-06-28T09:00:00Z`,
      ...blocks,
    });
  }
  return {
    edinetCode: "E00000",
    secCode: "9999",
    filerName: "サンプル株式会社",
    periods,
  };
}

describe("metricsFromPeriods", () => {
  it("computes golden fixture sales, ROE, EPS from sample 9999", () => {
    const company = buildGoldenCompany();
    const row = metricsFromPeriods(company);
    expect(row).not.toBeNull();
    expect(row!.sales).toBe("1000000000000");
    expect(row!.ROE).toBe("0.0667");
    expect(row!.EPS).toBe("185.50");
    expect(row!.secCode).toBe("9999");
    expect(row!.calcDate).toBe("2025-03-31");
  });

  it("computes consecutiveDivIncreases from rising DPS (not hardcoded 5)", () => {
    const company = buildGoldenCompany();
    const row = metricsFromPeriods(company);
    expect(row!.consecutiveDivIncreases).toBe(4);
    expect(row!.consecutiveDivIncreases).not.toBe(5);
  });

  it("computes piotroskiFScore from financials (not hardcoded 7)", () => {
    const company = buildGoldenCompany();
    const row = metricsFromPeriods(company);
    expect(row!.piotroskiFScore).not.toBe(7);
    expect(row!.piotroskiFScore).toBeTypeOf("number");
    expect(row!.piotroskiFScore).toBeGreaterThanOrEqual(0);
    expect(row!.piotroskiFScore).toBeLessThanOrEqual(9);
  });

  it("returns null for computed metrics when insufficient periods", () => {
    const company: CompanySummary = {
      edinetCode: "E00000",
      secCode: "9999",
      filerName: "サンプル株式会社",
      periods: [
        {
          ...buildBlocks(1.0),
          periodStart: "2024-04-01",
          periodEnd: "2025-03-31",
          docID: "ONE",
          docDescription: "有価証券報告書",
          submitDateTime: "2025-06-28T09:00:00Z",
        },
      ],
    };
    const row = metricsFromPeriods(company);
    expect(row!.consecutiveDivIncreases).toBeNull();
    expect(row!.piotroskiFScore).toBeNull();
  });
});

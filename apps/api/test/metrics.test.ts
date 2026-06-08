import { beforeEach, describe, expect, it, vi } from "vitest";
import app from "../src/index.js";

const sampleMetricsRow = {
  secCode: "9999",
  edinetCode: "E00000",
  filerName: "サンプル株式会社",
  calcDate: "2025-03-31",
  fiscalMonth: "03",
  metricsJson: JSON.stringify({
    edinetCode: "E00000",
    secCode: "9999",
    filerName: "サンプル株式会社",
    calcDate: "2025-03-31",
    fiscalMonth: "03",
    sales: "1000000000000",
    ROE: "0.0667",
    EPS: "185.50",
    equityRatio: "0.4800",
    operatingProfit: "120000000000",
    recurringProfit: "115000000000",
    netIncome: "80000000000",
    netAssets: "1200000000000",
    totalAssets: "2500000000000",
    comprehensiveIncome: "82000000000",
    BPS: "2180.00",
    operatingCF: "150000000000",
    investingCF: "-60000000000",
    financingCF: "-40000000000",
    cashBalance: "200000000000",
    payoutRatio: "0.3000",
    dividendPerShare: "50.00",
    sharesOutstanding: "430000000",
    currentAssets: "900000000000",
    currentLiabilities: "500000000000",
    liabilities: "1300000000000",
    investmentSecurities: "45000000000",
    PER: 14,
    PBR: 1.05,
    dividendYield: 0.02,
  }),
  sales: 1_000_000_000_000,
  roe: 0.0667,
  equityRatio: 0.48,
  totalAssets: 2_500_000_000_000,
  updatedAt: "2025-06-28T00:00:00.000Z",
};

vi.mock("@edinet/db/queries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@edinet/db/queries")>();
  return {
    ...actual,
    getCompanyMetrics: vi.fn(),
    countCompanyMetrics: vi.fn(),
    getAllCompanyMetrics: vi.fn(),
  };
});

import * as queries from "@edinet/db/queries";

const env = {
  EDINET_DB: undefined as unknown as D1Database,
  CORS_ORIGIN: "http://localhost:3000",
  API_VERSION: "test",
  INTERNAL_API_KEY: "test-secret",
  NODE_ENV: "development",
};

const authHeaders = { "X-Internal-Api-Key": "test-secret" };

describe("GET /api/metrics", () => {
  beforeEach(() => {
    vi.mocked(queries.getCompanyMetrics).mockReset();
    vi.mocked(queries.countCompanyMetrics).mockReset();
    vi.mocked(queries.getAllCompanyMetrics).mockReset();
  });

  it("returns sales and ROE when company_metrics is populated", async () => {
    vi.mocked(queries.getCompanyMetrics).mockResolvedValue([sampleMetricsRow]);
    vi.mocked(queries.countCompanyMetrics).mockResolvedValue(1);

    const res = await app.request("/api/metrics?limit=10", { headers: authHeaders }, env);
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      rows: Array<Record<string, unknown>>;
      total: number;
      schemaVersion: string;
      columns: unknown[];
    };

    expect(body.total).toBe(1);
    expect(body.schemaVersion).toBe("v2");
    expect(body.columns.length).toBeGreaterThan(0);
    expect(body.rows).toHaveLength(1);
    expect(body.rows[0].sales).toBe("1000000000000");
    expect(body.rows[0].ROE).toBe("0.0667");
    expect(body.rows[0].secCode).toBe("9999");
  });

  it("returns empty rows when company_metrics is empty", async () => {
    vi.mocked(queries.getCompanyMetrics).mockResolvedValue([]);
    vi.mocked(queries.countCompanyMetrics).mockResolvedValue(0);

    const res = await app.request("/api/metrics", { headers: authHeaders }, env);
    expect(res.status).toBe(200);

    const body = (await res.json()) as { rows: unknown[]; total: number };
    expect(body.rows).toEqual([]);
    expect(body.total).toBe(0);
  });
});

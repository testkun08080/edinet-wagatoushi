import { beforeEach, describe, expect, it, vi } from "vitest";
import app from "../src/index.js";

const sampleDbRow = {
  secCode: "1302",
  edinetCode: "E00002",
  filerName: "ライオンロジスティクス株式会社",
  calcDate: "2025-03-31",
  fiscalMonth: "03",
  metricsJson: JSON.stringify({
    edinetCode: "E00002",
    secCode: "1302",
    filerName: "ライオンロジスティクス株式会社",
    sales: "500000000000",
    ROE: "0.1200",
    equityRatio: "0.4000",
    totalAssets: "1200000000000",
  }),
  sales: 500_000_000_000,
  roe: 0.12,
  equityRatio: 0.4,
  totalAssets: 1_200_000_000_000,
  updatedAt: "2025-06-28T00:00:00.000Z",
};

vi.mock("@edinet/db/queries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@edinet/db/queries")>();
  return {
    ...actual,
    queryCompanyMetrics: vi.fn(),
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

describe("GET /api/metrics/query", () => {
  beforeEach(() => {
    vi.mocked(queries.queryCompanyMetrics).mockReset();
  });

  it("returns filtered page with total", async () => {
    vi.mocked(queries.queryCompanyMetrics).mockResolvedValue({
      rows: [sampleDbRow],
      total: 1,
      page: 1,
      pageSize: 50,
    });

    const res = await app.request(
      "/api/metrics/query?minRoe=0.1&sort=roe&order=desc&page=1&pageSize=50",
      { headers: authHeaders },
      env,
    );
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      rows: Array<Record<string, unknown>>;
      total: number;
      page: number;
      pageSize: number;
      schemaVersion: string;
    };

    expect(body.total).toBe(1);
    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(50);
    expect(body.schemaVersion).toBe("v2");
    expect(body.rows[0]?.ROE).toBe("0.1200");
    expect(body.rows[0]?.secCode).toBe("1302");

    expect(queries.queryCompanyMetrics).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ minRoe: 0.1 }),
      expect.objectContaining({ field: "roe", order: "desc" }),
      expect.objectContaining({ page: 1, pageSize: 50 }),
    );
  });

  it("defaults sort to filer_name asc", async () => {
    vi.mocked(queries.queryCompanyMetrics).mockResolvedValue({
      rows: [],
      total: 0,
      page: 1,
      pageSize: 50,
    });

    const res = await app.request("/api/metrics/query", { headers: authHeaders }, env);
    expect(res.status).toBe(200);

    expect(queries.queryCompanyMetrics).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ field: "filer_name", order: "asc" }),
      expect.anything(),
    );
  });
});

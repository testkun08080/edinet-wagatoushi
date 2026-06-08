import Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { flattenMetricsRow } from "@edinet/metrics";
import * as schema from "./schema.js";
import { queryCompanyMetrics, type DB } from "./queries.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

const sampleMetricsJson = JSON.stringify({
  edinetCode: "E00000",
  secCode: "9999",
  filerName: "サンプル株式会社",
  calcDate: "2025-03-31",
  fiscalMonth: "03",
  sales: "1000000000000",
  ROE: "0.0667",
  equityRatio: "0.4800",
  totalAssets: "2500000000000",
});

function insertMetric(
  db: Database.Database,
  row: {
    secCode: string;
    edinetCode: string;
    filerName: string;
    sales: number | null;
    roe: number | null;
    equityRatio?: number | null;
    totalAssets?: number | null;
  },
) {
  db.prepare(
    `INSERT INTO company_metrics (
      sec_code, edinet_code, filer_name, calc_date, fiscal_month,
      metrics_json, sales, roe, equity_ratio, total_assets, updated_at
    ) VALUES (?, ?, ?, '2025-03-31', '03', ?, ?, ?, ?, ?, '2025-06-28T00:00:00.000Z')`,
  ).run(
    row.secCode,
    row.edinetCode,
    row.filerName,
    sampleMetricsJson,
    row.sales,
    row.roe,
    row.equityRatio ?? 0.48,
    row.totalAssets ?? 2_500_000_000_000,
  );
}

describe("queryCompanyMetrics", () => {
  let sqlite: Database.Database;
  let db: DB;

  beforeAll(() => {
    sqlite = new Database(":memory:");
    sqlite.exec(readFileSync(join(root, "packages/db/migrations/0000_init.sql"), "utf8"));
    sqlite.exec(readFileSync(join(root, "packages/db/migrations/0001_company_metrics.sql"), "utf8"));

    sqlite.prepare(
      `INSERT INTO companies (edinet_code, sec_code, filer_name, listed_category, industry, updated_at)
       VALUES ('E00000', '9999', 'サンプル株式会社', '上場', '情報', '2025-01-01')`,
    ).run();
    sqlite.prepare(
      `INSERT INTO companies (edinet_code, sec_code, filer_name, listed_category, industry, updated_at)
       VALUES ('E00002', '1302', 'ライオンロジスティクス株式会社', '上場', '陸運', '2025-01-01')`,
    ).run();
    sqlite.prepare(
      `INSERT INTO companies (edinet_code, sec_code, filer_name, listed_category, industry, updated_at)
       VALUES ('E00003', '1303', 'ペンギンソリューションズ株式会社', '上場', 'サービス', '2025-01-01')`,
    ).run();

    insertMetric(sqlite, {
      secCode: "9999",
      edinetCode: "E00000",
      filerName: "サンプル株式会社",
      sales: 1_000_000_000_000,
      roe: 0.0667,
    });
    insertMetric(sqlite, {
      secCode: "1302",
      edinetCode: "E00002",
      filerName: "ライオンロジスティクス株式会社",
      sales: 500_000_000_000,
      roe: 0.12,
    });
    insertMetric(sqlite, {
      secCode: "1303",
      edinetCode: "E00003",
      filerName: "ペンギンソリューションズ株式会社",
      sales: 200_000_000_000,
      roe: 0.05,
    });

    db = drizzle(sqlite, { schema }) as unknown as DB;
  });

  afterAll(() => {
    sqlite.close();
  });

  it("filters by q on filer_name", async () => {
    const result = await queryCompanyMetrics(
      db,
      { q: "ライオン" },
      { field: "filer_name", order: "asc" },
      { page: 1, pageSize: 50 },
    );
    expect(result.total).toBe(1);
    expect(result.rows[0]?.secCode).toBe("1302");
  });

  it("filters by minRoe and sorts desc", async () => {
    const result = await queryCompanyMetrics(
      db,
      { minRoe: 0.08 },
      { field: "roe", order: "desc" },
      { page: 1, pageSize: 50 },
    );
    expect(result.total).toBe(1);
    expect(result.rows[0]?.secCode).toBe("1302");
  });

  it("paginates results", async () => {
    const page1 = await queryCompanyMetrics(db, {}, { field: "filer_name", order: "asc" }, { page: 1, pageSize: 2 });
    const page2 = await queryCompanyMetrics(db, {}, { field: "filer_name", order: "asc" }, { page: 2, pageSize: 2 });
    expect(page1.total).toBe(3);
    expect(page1.rows).toHaveLength(2);
    expect(page2.rows).toHaveLength(1);
  });

  it("flattenMetricsRow preserves sales and ROE", async () => {
    const [row] = await db
      .select()
      .from(schema.companyMetrics)
      .where(eq(schema.companyMetrics.secCode, "9999"))
      .all();
    expect(row).toBeDefined();
    const flat = flattenMetricsRow(row!);
    expect(flat.sales).toBe("1000000000000");
    expect(flat.ROE).toBe("0.0667");
  });
});

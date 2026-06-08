import {
  countCompanyMetrics,
  getAllCompanyMetrics,
  getCompanyMetrics,
  queryCompanyMetrics,
  type CompanyMetricsSortField,
} from "@edinet/db/queries";
import { METRICS_SCHEMA_VERSION, flattenMetricsRow, getScreenerColumns } from "@edinet/metrics";
import type { MetricsQueryResponse, MetricsResponse, MetricsRow } from "@edinet/types";
import { Hono } from "hono";
import type { Context } from "hono";
import type { AppEnv } from "../env.js";
import { getDb } from "../middleware/db.js";

const SORT_ALLOWLIST = new Set<CompanyMetricsSortField>([
  "roe",
  "sales",
  "total_assets",
  "filer_name",
  "calc_date",
  "equity_ratio",
]);

function parseOptionalFloat(value: string | undefined): number | undefined {
  if (value == null || value === "") return undefined;
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : undefined;
}

function parseSortField(value: string | undefined): CompanyMetricsSortField {
  if (value && SORT_ALLOWLIST.has(value as CompanyMetricsSortField)) {
    return value as CompanyMetricsSortField;
  }
  return "filer_name";
}

const KV_KEY = `screener:metrics:${METRICS_SCHEMA_VERSION}`;

type MetricsCachePayload = {
  rows: MetricsRow[];
  total: number;
  generatedAt: string;
};

function clampInt(value: string | undefined, fallback: number, max: number): number {
  const n = Number.parseInt(value ?? "", 10);
  if (Number.isNaN(n) || n < 0) return fallback;
  return Math.min(n, max);
}

async function loadMetricsSnapshot(c: Context<AppEnv>): Promise<MetricsCachePayload> {
  const kv = c.env.EDINET_CACHE;
  if (kv) {
    const cached = await kv.get(KV_KEY, "json");
    if (cached && typeof cached === "object" && cached !== null && "rows" in cached) {
      return cached as MetricsCachePayload;
    }
  }

  const db = getDb(c);
  const dbRows = await getAllCompanyMetrics(db);
  const rows = dbRows.map((r) => flattenMetricsRow(r));
  const total = rows.length;
  const generatedAt = new Date().toISOString();
  const payload: MetricsCachePayload = { rows, total, generatedAt };

  if (kv) {
    await kv.put(KV_KEY, JSON.stringify(payload));
  }
  return payload;
}

export const metricsRoutes = new Hono<AppEnv>()
  .get("/query", async (c) => {
    const page = Math.max(1, clampInt(c.req.query("page"), 1, 10_000));
    const pageSize = Math.max(1, clampInt(c.req.query("pageSize"), 50, 500));
    const sort = parseSortField(c.req.query("sort"));
    const order = c.req.query("order") === "desc" ? "desc" : "asc";

    const db = getDb(c);
    const result = await queryCompanyMetrics(
      db,
      {
        q: c.req.query("q"),
        minRoe: parseOptionalFloat(c.req.query("minRoe")),
        maxRoe: parseOptionalFloat(c.req.query("maxRoe")),
        minSales: parseOptionalFloat(c.req.query("minSales")),
        maxSales: parseOptionalFloat(c.req.query("maxSales")),
        minEquityRatio: parseOptionalFloat(c.req.query("minEquityRatio")),
        maxEquityRatio: parseOptionalFloat(c.req.query("maxEquityRatio")),
        minTotalAssets: parseOptionalFloat(c.req.query("minTotalAssets")),
        maxTotalAssets: parseOptionalFloat(c.req.query("maxTotalAssets")),
      },
      { field: sort, order },
      { page, pageSize },
    );

    const body: MetricsQueryResponse = {
      rows: result.rows.map((r) => flattenMetricsRow(r)),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      generatedAt: new Date().toISOString(),
      schemaVersion: METRICS_SCHEMA_VERSION,
    };
    return c.json(body);
  })
  .get("/", async (c) => {
  const limit = clampInt(c.req.query("limit"), 500, 5000);
  const offset = clampInt(c.req.query("offset"), 0, 1_000_000);

  const kv = c.env.EDINET_CACHE;
  let rows: MetricsRow[];
  let total: number;
  let generatedAt: string;

  if (kv) {
    const snapshot = await loadMetricsSnapshot(c);
    rows = snapshot.rows.slice(offset, offset + limit);
    total = snapshot.total;
    generatedAt = snapshot.generatedAt;
  } else {
    const db = getDb(c);
    const dbRows = await getCompanyMetrics(db, { limit, offset });
    rows = dbRows.map((r) => flattenMetricsRow(r));
    total = await countCompanyMetrics(db);
    generatedAt = new Date().toISOString();
  }

  const body: MetricsResponse = {
    rows,
    total,
    columns: getScreenerColumns(),
    generatedAt,
    schemaVersion: METRICS_SCHEMA_VERSION,
  };
  return c.json(body);
});

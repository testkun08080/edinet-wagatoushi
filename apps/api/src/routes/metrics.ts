import { getLatestMetrics } from "@edinet/db/queries";
import type { MetricsResponse, MetricsRow } from "@edinet/types";
import { Hono } from "hono";
import type { AppEnv } from "../env.js";
import { getDb } from "../middleware/db.js";

function clampInt(value: string | undefined, fallback: number, max: number): number {
  const n = Number.parseInt(value ?? "", 10);
  if (Number.isNaN(n) || n < 0) return fallback;
  return Math.min(n, max);
}

export const metricsRoutes = new Hono<AppEnv>().get("/", async (c) => {
  const limit = clampInt(c.req.query("limit"), 500, 2000);
  const offset = clampInt(c.req.query("offset"), 0, 1_000_000);

  const db = getDb(c);
  const rows = await getLatestMetrics(db, { limit, offset });

  const body: MetricsResponse = {
    rows: rows.map(
      (r): MetricsRow => ({
        secCode: r.secCode,
        edinetCode: r.edinetCode,
        filerName: r.filerName,
        latestPeriodEnd: r.latestPeriodEnd,
        latestSubmitDateTime: r.latestSubmitDateTime ?? null,
        industry: r.industry ?? null,
        listedCategory: r.listedCategory ?? null,
      }),
    ),
    columns: [],
    generatedAt: new Date().toISOString(),
  };
  return c.json(body);
});

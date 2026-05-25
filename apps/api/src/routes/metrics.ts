import { getLatestMetrics } from "@edinet/db/queries";
import type { MetricsResponse, MetricsRow } from "@edinet/types";
import { Hono } from "hono";
import type { AppEnv } from "../env.js";
import { getDb } from "../middleware/db.js";

export const metricsRoutes = new Hono<AppEnv>().get("/", async (c) => {
  const limit = Math.min(Number(c.req.query("limit") ?? "500"), 2000);
  const offset = Number(c.req.query("offset") ?? "0");

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

import { getSummaryBySecCode } from "@edinet/db/queries";
import type { FinancialBlock, PeriodFinancialView, SummaryResponse } from "@edinet/types";
import { Hono } from "hono";
import type { AppEnv } from "../env.js";
import { getDb } from "../middleware/db.js";

export const summariesRoutes = new Hono<AppEnv>().get("/:secCode", async (c) => {
  const secCode = c.req.param("secCode");
  const db = getDb(c);
  const rows = await getSummaryBySecCode(db, secCode);

  if (rows.length === 0) {
    return c.json({ error: "summary_not_found", secCode }, 404);
  }

  const periods: PeriodFinancialView[] = rows.map((r) => ({
    edinetCode: r.edinetCode,
    secCode: r.secCode,
    docId: r.docId,
    docType: r.docType,
    periodStart: r.periodStart,
    periodEnd: r.periodEnd,
    submitDateTime: r.submitDateTime,
    filerName: r.filerName,
    summary: safeParse(r.summaryJson),
    pl: safeParse(r.plJson),
    bs: safeParse(r.bsJson),
    cf: safeParse(r.cfJson),
  }));

  const body: SummaryResponse = { secCode, periods };
  return c.json(body);
});

function safeParse(s: string | null): FinancialBlock {
  if (!s) return {};
  try {
    return JSON.parse(s) as FinancialBlock;
  } catch {
    return {};
  }
}

import { searchCompanies } from "@edinet/db/queries";
import type { SearchResponse } from "@edinet/types";
import { Hono } from "hono";
import type { AppEnv } from "../env.js";
import { getDb } from "../middleware/db.js";

export const searchRoutes = new Hono<AppEnv>().get("/", async (c) => {
  const q = (c.req.query("q") ?? "").trim();

  if (q.length < 2) {
    const empty: SearchResponse = { query: q, results: [] };
    return c.json(empty);
  }

  const db = getDb(c);
  const rows = await searchCompanies(db, q, 20);

  const body: SearchResponse = {
    query: q,
    results: rows.map((r) => ({
      type: "company" as const,
      secCode: r.secCode,
      edinetCode: r.edinetCode,
      filerName: r.filerName,
    })),
  };
  return c.json(body);
});

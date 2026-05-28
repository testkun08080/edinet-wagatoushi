import { getCompanyByEdinetCode, getCompanyBySecCode, listCompanies } from "@edinet/db/queries";
import type { CompanyListResponse } from "@edinet/types";
import { Hono } from "hono";
import type { AppEnv } from "../env.js";
import { getDb } from "../middleware/db.js";

function clampInt(value: string | undefined, fallback: number, min: number, max: number): number {
  const n = Number.parseInt(value ?? "", 10);
  if (Number.isNaN(n) || n < min) return fallback;
  return Math.min(n, max);
}

export const companiesRoutes = new Hono<AppEnv>()
  .get("/", async (c) => {
    const page = clampInt(c.req.query("page"), 1, 1, 1_000_000);
    const pageSize = clampInt(c.req.query("pageSize"), 100, 1, 500);
    const industry = c.req.query("industry") ?? undefined;

    const db = getDb(c);
    const rows = await listCompanies(db, {
      limit: pageSize,
      offset: (page - 1) * pageSize,
      industry,
    });

    const body: CompanyListResponse = {
      companies: rows,
      total: rows.length,
      page,
      pageSize,
    };
    return c.json(body);
  })
  .get("/:secCode", async (c) => {
    const secCode = c.req.param("secCode");
    const db = getDb(c);

    const company =
      (await getCompanyBySecCode(db, secCode)) ?? (await getCompanyByEdinetCode(db, secCode));

    if (!company) {
      return c.json({ error: "company_not_found", secCode }, 404);
    }
    return c.json({ company });
  });

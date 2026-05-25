import {
  getCompanyByEdinetCode,
  getCompanyBySecCode,
  listCompanies,
} from "@edinet/db/queries";
import type { CompanyListResponse } from "@edinet/types";
import { Hono } from "hono";
import type { AppEnv } from "../env.js";
import { getDb } from "../middleware/db.js";

export const companiesRoutes = new Hono<AppEnv>()
  .get("/", async (c) => {
    const page = Number(c.req.query("page") ?? "1");
    const pageSize = Math.min(Number(c.req.query("pageSize") ?? "100"), 500);
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

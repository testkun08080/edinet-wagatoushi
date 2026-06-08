import { getShareholdersBySecCode } from "@edinet/db/queries";
import type { ShareholderEntry, ShareholdersResponse } from "@edinet/types";
import { Hono } from "hono";
import type { AppEnv } from "../env.js";
import { getDb } from "../middleware/db.js";

export const shareholdersRoutes = new Hono<AppEnv>().get("/:secCode", async (c) => {
  const secCode = c.req.param("secCode");
  const db = getDb(c);
  const rows = await getShareholdersBySecCode(db, secCode);

  const body: ShareholdersResponse = {
    secCode,
    snapshots: rows.map((r) => ({
      periodEnd: r.periodEnd,
      entries: JSON.parse(r.entriesJson) as ShareholderEntry[],
    })),
  };
  return c.json(body);
});

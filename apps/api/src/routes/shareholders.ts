import type { ShareholdersResponse } from "@edinet/types";
import { Hono } from "hono";
import type { AppEnv } from "../env.js";

export const shareholdersRoutes = new Hono<AppEnv>().get("/:secCode", (c) => {
  const secCode = c.req.param("secCode");
  const body: ShareholdersResponse = {
    secCode,
    snapshots: [],
  };
  return c.json(body);
});

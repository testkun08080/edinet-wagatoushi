import { getScreenerColumns, METRICS_SCHEMA_VERSION } from "@edinet/metrics";
import type { ManifestResponse } from "@edinet/types";
import { Hono } from "hono";
import type { AppEnv } from "../env.js";

export const manifestRoutes = new Hono<AppEnv>().get("/", (c) => {
  const body: ManifestResponse = {
    columns: getScreenerColumns(),
    generatedAt: new Date().toISOString(),
    schemaVersion: c.env.API_VERSION ?? METRICS_SCHEMA_VERSION,
  };
  return c.json(body);
});

import type { HealthResponse } from "@edinet/types";
import { Hono } from "hono";
import type { AppEnv } from "../env.js";

export const healthRoutes = new Hono<AppEnv>().get("/", (c) => {
  const body: HealthResponse = {
    ok: true,
    service: "edinet-api",
    version: c.env.API_VERSION,
    timestamp: new Date().toISOString(),
  };
  return c.json(body);
});

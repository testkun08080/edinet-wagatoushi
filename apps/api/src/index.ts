import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { requestId } from "hono/request-id";
import type { AppEnv } from "./env.js";
import { apiKeyMiddleware } from "./middleware/apiKey.js";
import { dbMiddleware } from "./middleware/db.js";
import { companiesRoutes } from "./routes/companies.js";
import { healthRoutes } from "./routes/health.js";
import { manifestRoutes } from "./routes/manifest.js";
import { metricsRoutes } from "./routes/metrics.js";
import { searchRoutes } from "./routes/search.js";
import { shareholdersRoutes } from "./routes/shareholders.js";
import { summariesRoutes } from "./routes/summaries.js";

const app = new Hono<AppEnv>()
  .use("*", logger())
  .use("*", requestId())
  .use("*", (c, next) =>
    cors({
      origin: c.env.CORS_ORIGIN ?? "*",
      allowMethods: ["GET", "OPTIONS"],
      maxAge: 600,
    })(c, next),
  )
  .use("/api/*", apiKeyMiddleware)
  .use("/api/*", dbMiddleware)
  .route("/api/health", healthRoutes)
  .route("/api/companies", companiesRoutes)
  .route("/api/summaries", summariesRoutes)
  .route("/api/metrics", metricsRoutes)
  .route("/api/search", searchRoutes)
  .route("/api/shareholders", shareholdersRoutes)
  .route("/api/manifest", manifestRoutes)
  .notFound((c) => c.json({ error: "not_found", path: c.req.path }, 404))
  .onError((err, c) => {
    console.error("[api] unhandled", err);
    return c.json({ error: "internal_error", message: err.message }, 500);
  });

export type AppType = typeof app;
export default app;

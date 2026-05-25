/**
 * Type-only test: verify hc<AppType> preserves the RPC path tree.
 * If Hono's middleware chaining ever flattens our types, the lines
 * below will fail to compile. Run via `pnpm --filter @edinet/api typecheck`.
 */
import { hc } from "hono/client";
import type { AppType } from "../src/index.js";

const client = hc<AppType>("http://localhost:8787");

// Each of these must resolve to a real .$get on the chained Hono RPC tree.
// We don't call them at runtime — type-checking is the test.
void (async () => {
  await client.api.health.$get();
  await client.api.companies.$get({ query: { page: "1" } });
  await client.api.companies[":secCode"].$get({ param: { secCode: "73180" } });
  await client.api.summaries[":secCode"].$get({ param: { secCode: "73180" } });
  await client.api.metrics.$get({ query: { limit: "100" } });
  await client.api.search.$get({ query: { q: "トヨタ" } });
  await client.api.shareholders[":secCode"].$get({ param: { secCode: "73180" } });
  await client.api.manifest.$get();
});

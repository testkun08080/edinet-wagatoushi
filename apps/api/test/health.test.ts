import { describe, expect, it } from "vitest";
import app from "../src/index.js";

const env = {
  EDINET_DB: undefined as unknown as D1Database,
  CORS_ORIGIN: "*",
  API_VERSION: "test",
};

describe("api", () => {
  it("GET /api/health returns ok", async () => {
    const res = await app.request("/api/health", {}, env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; service: string };
    expect(body.ok).toBe(true);
    expect(body.service).toBe("edinet-api");
  });

  it("GET /api/unknown returns 404 with structured body", async () => {
    const res = await app.request("/api/unknown", {}, env);
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("not_found");
  });

  it("GET /api/search with q<2 returns empty results", async () => {
    const res = await app.request("/api/search?q=a", {}, env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { results: unknown[] };
    expect(body.results).toEqual([]);
  });

  it("GET /api/manifest returns manifest stub", async () => {
    const res = await app.request("/api/manifest", {}, env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { schemaVersion: string };
    expect(body.schemaVersion).toBe("test");
  });
});

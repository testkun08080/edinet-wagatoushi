import { describe, expect, it } from "vitest";
import app from "../src/index.js";

const env = {
  EDINET_DB: undefined as unknown as D1Database,
  CORS_ORIGIN: "http://localhost:3000",
  API_VERSION: "test",
  INTERNAL_API_KEY: "test-secret",
};

const authHeaders = { "X-Internal-Api-Key": "test-secret" };

describe("api", () => {
  it("GET /api/health returns ok without api key", async () => {
    const res = await app.request("/api/health", {}, env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; service: string };
    expect(body.ok).toBe(true);
    expect(body.service).toBe("edinet-api");
  });

  it("GET /api/manifest without api key returns 401", async () => {
    const res = await app.request("/api/manifest", {}, env);
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("unauthorized");
  });

  it("GET /api/manifest with api key returns manifest stub", async () => {
    const res = await app.request("/api/manifest", { headers: authHeaders }, env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { schemaVersion: string };
    expect(body.schemaVersion).toBe("test");
  });

  it("GET /api/unknown returns 404 with structured body", async () => {
    const res = await app.request("/api/unknown", { headers: authHeaders }, env);
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("not_found");
  });

  it("GET /api/search with q<2 returns empty results", async () => {
    const res = await app.request("/api/search?q=a", { headers: authHeaders }, env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { results: unknown[] };
    expect(body.results).toEqual([]);
  });
});

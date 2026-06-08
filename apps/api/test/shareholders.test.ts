import { beforeEach, describe, expect, it, vi } from "vitest";
import app from "../src/index.js";

const sampleSnapshots = [
  {
    secCode: "9999",
    periodEnd: "2025-03-31",
    docId: "SAMPLE-ANNUAL-2025",
    entriesJson: JSON.stringify([
      { name: "サンプルホールディングス株式会社", shares: 128600000, ratio: 0.2991 },
      { name: "日本サンプル年金基金", shares: 43000000, ratio: 0.1 },
    ]),
    updatedAt: "2025-06-28T00:00:00.000Z",
  },
];

vi.mock("@edinet/db/queries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@edinet/db/queries")>();
  return {
    ...actual,
    getShareholdersBySecCode: vi.fn(),
  };
});

import * as queries from "@edinet/db/queries";

const env = {
  EDINET_DB: undefined as unknown as D1Database,
  CORS_ORIGIN: "http://localhost:3000",
  API_VERSION: "test",
  INTERNAL_API_KEY: "test-secret",
  NODE_ENV: "development",
};

const authHeaders = { "X-Internal-Api-Key": "test-secret" };

describe("GET /api/shareholders/:secCode", () => {
  beforeEach(() => {
    vi.mocked(queries.getShareholdersBySecCode).mockReset();
  });

  it("returns snapshots from D1 rows", async () => {
    vi.mocked(queries.getShareholdersBySecCode).mockResolvedValue(sampleSnapshots);

    const res = await app.request("/api/shareholders/9999", { headers: authHeaders }, env);
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      secCode: string;
      snapshots: Array<{ periodEnd: string; entries: Array<{ name: string; shares: number }> }>;
    };

    expect(body.secCode).toBe("9999");
    expect(body.snapshots).toHaveLength(1);
    expect(body.snapshots[0]?.entries[0]?.name).toBe("サンプルホールディングス株式会社");
    expect(body.snapshots[0]?.entries[0]?.shares).toBe(128600000);
  });

  it("returns empty snapshots when none exist", async () => {
    vi.mocked(queries.getShareholdersBySecCode).mockResolvedValue([]);

    const res = await app.request("/api/shareholders/0000", { headers: authHeaders }, env);
    expect(res.status).toBe(200);

    const body = (await res.json()) as { secCode: string; snapshots: unknown[] };
    expect(body.secCode).toBe("0000");
    expect(body.snapshots).toEqual([]);
  });
});

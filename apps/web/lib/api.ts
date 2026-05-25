/**
 * Type-safe API client built on hono/client.
 *
 * The `AppType` import gives end-to-end type inference from the API routes
 * defined in apps/api/src/index.ts. No hand-maintained DTOs.
 *
 * During the v1 → v2 migration this client coexists with the static-JSON
 * pipeline; callers opt in by switching from `fetch("/data/...")` to
 * `api.companies.$get(...)`.
 */
import { hc } from "hono/client";
import type { AppType } from "@edinet/api";

const DEFAULT_API_URL =
  typeof process !== "undefined" && process.env?.PUBLIC_ENV__API_URL
    ? process.env.PUBLIC_ENV__API_URL
    : (import.meta as { env?: Record<string, string | undefined> }).env
        ?.PUBLIC_ENV__API_URL ?? "http://localhost:8787";

export const apiBaseUrl = DEFAULT_API_URL;
export const api = hc<AppType>(apiBaseUrl);

/** Helper for the common JSON-or-throw pattern. */
export async function fetchJson<T>(promise: Promise<Response>): Promise<T> {
  const res = await promise;
  if (!res.ok) {
    throw new Error(`API ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

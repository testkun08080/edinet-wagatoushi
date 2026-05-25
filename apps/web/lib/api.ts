import type { AppType } from "@edinet/api";
import { hc } from "hono/client";

const DEFAULT_API_URL =
  typeof process !== "undefined" && process.env?.PUBLIC_ENV__API_URL
    ? process.env.PUBLIC_ENV__API_URL
    : ((import.meta as { env?: Record<string, string | undefined> }).env?.PUBLIC_ENV__API_URL ??
      "http://localhost:8787");

export const apiBaseUrl = DEFAULT_API_URL;
export const api = hc<AppType>(apiBaseUrl);

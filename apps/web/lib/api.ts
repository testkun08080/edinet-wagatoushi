import type { AppType } from "@edinet/api";
import { hc } from "hono/client";

/** Same-origin BFF proxy on the web Worker (`/api/*` → upstream API with secret). */
export const apiBaseUrl = "";
export const api = hc<AppType>(apiBaseUrl);

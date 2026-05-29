import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "../env.js";

const API_KEY_HEADER = "x-internal-api-key";

function readProvidedKey(req: Request): string | null {
  const fromHeader = req.headers.get(API_KEY_HEADER);
  if (fromHeader) return fromHeader;

  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice("Bearer ".length);

  return null;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export const apiKeyMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (c.req.path === "/api/health") {
    return next();
  }

  const expected = c.env.INTERNAL_API_KEY;
  if (!expected) {
    if (c.env.NODE_ENV === "development") {
      return next();
    }
    return c.json({ error: "misconfigured", message: "INTERNAL_API_KEY is not set" }, 503);
  }

  const provided = readProvidedKey(c.req.raw);
  if (!provided || !timingSafeEqual(provided, expected)) {
    return c.json({ error: "unauthorized" }, 401);
  }

  return next();
};

import * as schema from "@edinet/db/schema";
import { drizzle } from "drizzle-orm/d1";
import type { Context, MiddlewareHandler } from "hono";
import type { AppEnv } from "../env.js";

export type DB = ReturnType<typeof drizzle<typeof schema>>;

declare module "hono" {
  interface ContextVariableMap {
    db: DB;
  }
}

export const dbMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  const db = drizzle(c.env.EDINET_DB, { schema });
  c.set("db", db);
  await next();
};

export function getDb(c: Context<AppEnv>): DB {
  return c.get("db") as DB;
}

import type * as schema from "@edinet/db/schema";
import type { DrizzleD1Database } from "drizzle-orm/d1";

export interface Bindings {
  EDINET_DB: D1Database;
  EDINET_CACHE?: KVNamespace;
  EDINET_DATA?: R2Bucket;
  CORS_ORIGIN: string;
  API_VERSION: string;
}

export type DB = DrizzleD1Database<typeof schema>;

export interface Variables {
  requestId: string;
  db: DB;
}

export type AppEnv = { Bindings: Bindings; Variables: Variables };

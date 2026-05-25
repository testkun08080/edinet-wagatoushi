export interface Bindings {
  EDINET_DB: D1Database;
  EDINET_CACHE?: KVNamespace;
  EDINET_DATA?: R2Bucket;
  CORS_ORIGIN: string;
  API_VERSION: string;
}

export interface Variables {
  requestId: string;
}

export type AppEnv = { Bindings: Bindings; Variables: Variables };

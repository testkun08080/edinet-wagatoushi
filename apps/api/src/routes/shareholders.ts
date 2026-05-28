import type { ShareholdersResponse } from "@edinet/types";
import { Hono } from "hono";
import type { AppEnv } from "../env.js";
import sample9999 from "../sample/shareholders-9999.json";

const SAMPLE_BY_SEC_CODE: Record<string, ShareholdersResponse> = {
  "9999": sample9999 as ShareholdersResponse,
};

export const shareholdersRoutes = new Hono<AppEnv>().get("/:secCode", (c) => {
  const secCode = c.req.param("secCode");
  const sample = SAMPLE_BY_SEC_CODE[secCode];
  if (sample) {
    return c.json(sample);
  }
  const body: ShareholdersResponse = {
    secCode,
    snapshots: [],
  };
  return c.json(body);
});

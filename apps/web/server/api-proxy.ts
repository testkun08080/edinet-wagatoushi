import { enhance } from "@universal-middleware/core";
import { env } from "cloudflare:workers";

const API_KEY_HEADER = "X-Internal-Api-Key";
const PROXY_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function apiProxyMiddleware() {
  return enhance(
    async (request) => {
      const url = new URL(request.url);
      if (!url.pathname.startsWith("/api/") || !PROXY_METHODS.has(request.method)) {
        return;
      }

      const upstreamBase = env.API_UPSTREAM_URL?.replace(/\/$/, "");
      const apiKey = env.INTERNAL_API_KEY;

      if (!upstreamBase || !apiKey) {
        return new Response(
          JSON.stringify({
            error: "proxy_misconfigured",
            message: "Set API_UPSTREAM_URL and INTERNAL_API_KEY in .dev.vars or Worker secrets",
          }),
          { status: 503, headers: { "Content-Type": "application/json" } },
        );
      }

      const target = `${upstreamBase}${url.pathname}${url.search}`;
      const headers = new Headers(request.headers);
      headers.set(API_KEY_HEADER, apiKey);
      headers.delete("host");

      return fetch(target, {
        method: request.method,
        headers,
        body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
      });
    },
    {
      name: "api-proxy",
      order: -100,
    },
  );
}

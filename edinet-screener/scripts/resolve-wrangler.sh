#!/usr/bin/env bash

resolve_wrangler() {
  local screener_root="${1:-}"
  if [ -z "$screener_root" ]; then
    echo "resolve_wrangler requires the edinet-screener root path" >&2
    return 1
  fi

  if [ -n "${WRANGLER_BIN:-}" ]; then
    echo "$WRANGLER_BIN"
    return 0
  fi

  if [ -x "$screener_root/node_modules/.bin/wrangler" ]; then
    echo "$screener_root/node_modules/.bin/wrangler"
    return 0
  fi

  if command -v wrangler >/dev/null 2>&1; then
    command -v wrangler
    return 0
  fi

  echo "Wrangler not found. Run npm ci in edinet-screener or set WRANGLER_BIN." >&2
  return 1
}

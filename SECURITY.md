# Security Policy

## Supported Versions

Only the latest `main` branch and the most recent published Worker on
Cloudflare are supported with security updates.

| Version | Supported |
|---------|-----------|
| `main`  | ✅ |
| v2.x    | ✅ |
| v1.x    | ⚠️ best-effort during migration |

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security-sensitive reports.

Instead, use GitHub's private vulnerability reporting:
https://github.com/testkun08080/edinet-wagatoushi/security/advisories/new

Include:

- a description of the issue and the impact you're worried about
- steps to reproduce (or a minimal proof of concept)
- the commit hash / version where you found it
- (optional) suggested mitigation

We aim to acknowledge reports within **3 business days** and provide a fix
or mitigation timeline within **14 days** for high-severity issues.

## Scope

In scope:

- The `apps/api` Worker (`/api/*` endpoints)
- The `apps/web` Vike SSR Worker
- The `apps/wrapper` Python ingestion pipeline (e.g. SSRF, command injection)
- The build / deploy pipelines (workflows under `.github/workflows/`)

Out of scope:

- Issues in third-party services (Cloudflare, EDINET API, Sentry, GA)
- Static-data exposure in `apps/web/public/data/` (public by design)
- DoS via large query inputs (we cache + rate-limit at the edge, but bursts
  exceeding free-tier quotas are expected)

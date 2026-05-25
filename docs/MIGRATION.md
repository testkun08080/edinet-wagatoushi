# MIGRATION

旧 (v1) 構造から現在 (v2) 構造への移行マップ。新リポジトリに移行した時点のスナップショットとして残す。

## v1 → v2 ディレクトリ対応

| v1 | v2 | 備考 |
|---|---|---|
| `edinet-screener/` | `apps/web/` | Vike + React on Workers。pnpm workspace `@edinet/web` |
| `edinet-wrapper/` | `apps/wrapper/` | Python (uv 管理、pnpm workspace 外) |
| — | `apps/api/` | **新規**。Hono on Workers、REST API |
| — | `packages/db/` | **新規**。drizzle schema + 共通クエリ |
| — | `packages/types/` | **新規**。API/Web 共通 TS 型 |
| — | `infra/` | **新規**。compose / setup-fork |
| `docker-compose.yml` (root) | `infra/compose.yml` | dev / prod 分離 |

## v1 → v2 データフロー

```
v1:
  EDINET API
    → edinet-wrapper (Python)
    → build_screener_data.py
    → edinet-screener/public/data/*.json (484MB を git commit)
    → edinet-screener (Vike が静的 JSON を fetch)

v2:
  EDINET API
    → apps/wrapper (Python)
    → ローカル SQLite
    → wrangler d1 execute で D1 へ delta apply
    → apps/api (Hono が drizzle で D1 を読む)
    → apps/web (hono/client で API を呼ぶ)
```

## 廃止したもの

| 廃止 | 理由 / 後継 |
|---|---|
| `edinet-screener/public/data/*.json` (484MB) | D1 + API に移行。git commit は不要 |
| `edinet-wrapper/scripts/frontend/build_screener_data.py` (1198行) | 指標計算は `metrics.py` に抽出、JSON 生成は API がリアルタイムで行うため不要 |
| `edinet-wrapper/scripts/pipeline/ingest_daily_*` 群 (5 本) | `apps/wrapper/scripts/ingest_daily.py` + `publish_to_d1.py` の 2 本に集約 |
| D1 export ↔ ローカル SQLite ↔ D1 import の往復同期 | `ingest_daily` がローカル SQLite に書き、`publish_to_d1` が delta だけを D1 へ流す一方通行に |
| `wrangler.jsonc` のハードコード `database_id` | `wrangler.{toml,jsonc}.template` + `setup-fork.sh` で動的生成 |
| 旧 GitHub Actions (`daily-refresh.yml` 旧版、`edinet_*.yml` 4 本、`download_company_10years.yml`) | `ci.yml` / `deploy.yml` / `daily-refresh.yml` (新版) / `release.yml` に再編 |
| `edinet-wrapper/sql/d1_schema.sql` (手書き SQL) | `packages/db/migrations/0000_init.sql` (drizzle-kit 生成) |
| `landing/` (静的 HTML LP) | `apps/web/pages/index/` (Vike SSR) |
| docs 21 本 (`PROJECT_FLOW.md`, `D1_HYBRID_OPERATIONS.md` 等) | 本ファイルに集約 |

## 新規追加

| ファイル / 仕組み | 役割 |
|---|---|
| `apps/api/` | Hono on Workers の REST API (8 ルート) |
| `apps/api/wrangler.toml.template` | D1 / KV / R2 binding を placeholder 化 |
| `apps/web/wrangler.jsonc.template` | 同上 |
| `apps/web/lib/api.ts` | `hc<AppType>` の型安全クライアント |
| `apps/web/lib/metricsLoader.ts` | UI が叩く API 呼び出しの薄いラッパ |
| `packages/db/src/schema.ts` | drizzle で D1 / SQLite 共通の schema |
| `packages/db/src/queries.ts` | listCompanies / getSummaryBySecCode 等の共通クエリ |
| `packages/types/src/index.ts` | API レスポンス型 |
| `apps/wrapper/src/edinet_wrapper/metrics.py` | ROE / ROA / margins / FCF / 成長率 を分離 |
| `apps/wrapper/src/edinet_wrapper/db.py` | SQLite UPSERT + delta export ヘルパ |
| `apps/wrapper/scripts/ingest_daily.py` | 日次取得 → ローカル SQLite |
| `apps/wrapper/scripts/publish_to_d1.py` | SQLite 差分 → D1 |
| `apps/wrapper/scripts/backfill.py` | 過去 N 年バルク取得 |
| `infra/compose.yml` | docker compose で API + Web + サンプル DB |
| `infra/setup-fork.sh` | フォーク利用者向けワンショット D1 / KV / R2 作成 |
| `infra/init/fetch-sample-data.sh` | GH Release からサンプル DB を取得 |
| `pnpm-workspace.yaml` / `turbo.json` | モノレポ管理 |
| `biome.json` / `ruff.toml` / `lefthook.yml` | Lint + pre-commit |
| `.changeset/config.json` | リリース管理 |
| `CONTRIBUTING.md` / `CODE_OF_CONDUCT.md` / `SECURITY.md` | OSS 整備 |

## 維持しているもの

| 項目 | 場所 |
|---|---|
| EDINET API クライアント | `apps/wrapper/src/edinet_wrapper/downloader.py` |
| TSV パース | `apps/wrapper/src/edinet_wrapper/parser.py` |
| XBRL element id 辞書 | `apps/wrapper/src/edinet_wrapper/element_id_table.py` |
| Vike ルーティング (`pages/`) | `apps/web/pages/` |
| shadcn/ui コンポーネント | `apps/web/components/ui/` |
| React Context 4 種 | `apps/web/components/{Filter,Favorites,ColumnVisibility,RecentCompanies}Context.tsx` |
| Sentry + GA 統合 | `apps/web/sentry.browser.config.ts` 等 |
| OGP 生成 | `apps/web/scripts/generate-ogp.tsx` |

## フォーク利用者の最初の 30 分

```bash
# 1. fork & clone
gh repo fork <owner>/<this-repo> --clone
cd <this-repo>

# 2. ローカル動作確認
docker compose -f infra/compose.yml up
# → http://localhost:3000

# 3. 自分の Cloudflare アカウントへセットアップ
pnpm install
npx wrangler login
bash infra/setup-fork.sh
# → D1 / KV / R2 を作成し wrangler.{toml,jsonc} を生成
#   GitHub Secrets と Variables も自動セット

# 4. push で初回デプロイ
git push
# → https://edinet-api-<account>.workers.dev
# → https://edinet-web-<account>.workers.dev
```

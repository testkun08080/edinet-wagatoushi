# V2 再設計プラン

> ステータス: **proposal**（未着手）
> 提案日: 2026-05-25
> 対象: edinet-wagatoushi 全体（モノレポ化・API 化・Cloudflare Workers 一本化）
>
> このドキュメントは設計提案であり、現コードベースの動作には影響しない。
> 実装は本ドキュメントを基に別 PR で Phase 0〜6 に分けて段階的に行う。
> 新リポジトリへ移行する場合は本ブランチを clone / cherry-pick することでプランごと持ち出せる。

---

## Context — なぜ全面再設計するか

現状の edinet-wagatoushi は以下の構造的負債を抱えている。

1. **484MB の静的 JSON を Git にコミット**して Cloudflare の Git 連携でデプロイしており、リポジトリが肥大化する典型的アンチパターン。
2. **D1（クラウド SQLite）と静的 JSON が二重化**しており、`daily-refresh.yml` が「D1 export → ローカル SQLite → ingest → D1 へ delta apply → JSON 再生成 → git push」という複雑な往復を毎日実行している。
3. `build_screener_data.py` が 1,198 行に肥大化し、データ変換・指標計算・出力が密結合。増分処理が困難。
4. **Docker Compose は 10 行のみ**で screener しか定義されておらず、wrapper（Python）はローカル実行前提。
5. **wrangler.jsonc に D1 database_id がハードコード**されており、フォーク利用者は wrangler 設定を手で書き換える必要がある。
6. **テスト・Lint・pre-commit が皆無**で OSS 公開には不十分。
7. ローカルで「動く UI を見る」までに 5〜6 ステップ・数時間〜数日のデータ取得が必要。

確定した方針:

- **完全 API 方式**: Hono on Cloudflare Workers をバックエンド API に据え、フロントは fetch するだけ。静的 JSON 配布は廃止。
- **データホスト**: Cloudflare R2（本番）+ GitHub Release（フォーク向けサンプル）。
- **デプロイ先**: Cloudflare Workers 専用（API も Web も Workers）。
- **ローカル起動**: `docker compose up` 一発で wrapper + API + Web + サンプルデータ自動取得まで完結。

最終的にこのリポジトリは OSS として公開し、フォーク利用者が 30 分以内に自分の Cloudflare アカウントへデプロイできることをゴールとする。

---

## 1. 新リポジトリ構造（モノレポ）

```
edinet-wagatoushi/
├── apps/
│   ├── api/                  # Hono on CF Workers — REST API
│   │   ├── src/
│   │   │   ├── index.ts      # Hono app entry, ルート定義
│   │   │   ├── routes/
│   │   │   │   ├── companies.ts
│   │   │   │   ├── summaries.ts
│   │   │   │   ├── metrics.ts
│   │   │   │   └── search.ts
│   │   │   ├── middleware/   # cors, cache, logger
│   │   │   └── env.ts        # CF Bindings 型定義
│   │   ├── wrangler.toml     # database_id を vars/env で注入
│   │   └── package.json
│   │
│   ├── web/                  # React + Vike on CF Workers — UI
│   │   ├── pages/            # 既存ルーティングを流用
│   │   ├── components/       # 既存 shadcn/ui + 独自を流用
│   │   ├── lib/api.ts        # hono/client で型安全に API 呼び出し
│   │   ├── contexts/         # 既存 Context 4 種を維持
│   │   └── wrangler.toml
│   │
│   └── wrapper/              # Python EDINET 取得・解析（既存資産を移植）
│       ├── src/edinet_wrapper/
│       │   ├── downloader.py        # 既存をそのまま流用
│       │   ├── parser.py            # 既存をそのまま流用
│       │   ├── element_id_table.py  # 既存をそのまま流用
│       │   ├── schema.py            # 既存をそのまま流用
│       │   ├── metrics.py           # 新規: ROE/PER/PBR/FCF/成長率 計算を分離
│       │   └── db.py                # 新規: SQLite/D1 への投入を一元化
│       ├── scripts/
│       │   ├── ingest_daily.py      # EDINET → SQLite 日次取り込み（簡素化）
│       │   ├── backfill.py          # 過去 N 年一括取り込み
│       │   └── publish_to_d1.py     # 差分 SQL を D1 へ反映
│       ├── tests/                   # 新規: pytest
│       ├── Dockerfile               # 新規
│       └── pyproject.toml
│
├── packages/
│   ├── db/                   # D1/SQLite 共通スキーマ + クエリ層
│   │   ├── schema.ts         # drizzle ORM schema
│   │   ├── queries.ts        # 共通クエリ関数
│   │   ├── migrations/       # drizzle-kit で生成
│   │   └── package.json
│   │
│   └── types/                # API/Web 共通 TS 型 + OpenAPI 型
│       └── src/index.ts
│
├── infra/
│   ├── compose.yml           # ローカル開発: api + web + wrapper + sqlite
│   ├── compose.prod.yml      # 本番相当のスモークテスト用
│   ├── init/                 # 初回起動時のサンプルデータ取得スクリプト
│   │   └── fetch-sample-data.sh
│   └── setup-fork.sh         # フォーク利用者向けセットアップ自動化
│
├── .github/
│   ├── workflows/
│   │   ├── ci.yml            # 新規: lint + test + typecheck（PR 全件）
│   │   ├── deploy.yml        # 新規: main push で staging/production 自動デプロイ
│   │   ├── daily-refresh.yml # 簡素化版（後述）
│   │   └── release.yml       # changesets リリース
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug.yml
│   │   └── feature.yml
│   └── pull_request_template.md
│
├── docs/                     # 既存 docs/ を整理（user/developer/architecture 分割）
├── .changeset/
├── biome.json                # JS/TS Lint+Format（ESLint+Prettier の代替）
├── ruff.toml                 # Python Lint+Format
├── lefthook.yml              # pre-commit hooks（多言語対応）
├── pnpm-workspace.yaml
├── turbo.json                # Turborepo タスクパイプライン
├── package.json              # root, scripts 集約
├── CONTRIBUTING.md           # 新規
├── CODE_OF_CONDUCT.md        # 新規
├── SECURITY.md               # 新規
├── CHANGELOG.md              # changesets が自動生成
├── LICENSE                   # 既存 MIT を維持
└── README.md                 # 全面改訂
```

**選定理由**:

| 選択 | 採用 | 理由 |
|---|---|---|
| パッケージマネージャ | **pnpm** | workspace ネイティブ対応、CF Workers との相性、CI 高速 |
| ビルドツール | **Turborepo** | リモートキャッシュ無料、変更検知が高速 |
| ORM | **drizzle** | D1 公式推奨、TypeScript ファースト、SQLite と D1 を同一 schema で扱える |
| Lint/Format (TS) | **Biome** | ESLint + Prettier の置換、設定 1 ファイル、桁違いに高速 |
| Lint/Format (Py) | **Ruff** | Black + isort + flake8 を置換、設定 1 ファイル |
| pre-commit | **lefthook** | Go 製で高速、Python と TS を同時管理可能 |
| フロント FW | **Vike を維持** | 既存資産流用、CF Workers + SSR 実績あり |
| API クライアント | **hono/client** | Hono 公式、型推論が API 定義から自動連携 |

Python と TS の同居は「`apps/wrapper` だけ Python、それ以外は TS」と明快に分離。pnpm workspace は wrapper を無視（package.json を置かない）。

---

## 2. データパイプライン

### 既存資産の評価

| ファイル | 行数 | 扱い | 理由 |
|---|---|---|---|
| `downloader.py` | 377 | **そのまま流用** | EDINET API クライアントとして完成度が高い |
| `parser.py` | 199 | **そのまま流用** | Polars ベースの TSV パース、安定 |
| `element_id_table.py` | 391 | **そのまま流用** | XBRL Element ID マッピングは資産価値が高い |
| `schema.py` | 86 | **そのまま流用** | `FinancialData` / `Response` / `Result` |
| `build_screener_data.py` | 1,198 | **約 80% 削除** | API 化により JSON 生成ロジックの大半が不要。指標計算（ROE/PER/PBR/FCF/成長率）のみ抽出して `wrapper/src/edinet_wrapper/metrics.py` に切り出し |
| `scripts/pipeline/ingest_daily_*` | 多数 | **統廃合** | 5 本 → `ingest_daily.py` 1 本に集約。D1 export → SQLite ingest → D1 delta apply の往復をやめる |
| `sql/d1_schema.sql` | - | **drizzle schema に移植** | `packages/db/schema.ts` から `wrangler d1 migrations` で適用 |

### 新フロー

```
EDINET API
  └─[apps/wrapper/scripts/ingest_daily.py]
       1. EDINET documents.json → 当日提出書類リスト取得
       2. 各書類の TSV ダウンロード (downloader.py)
       3. parser.py で財務データ抽出
       4. metrics.py で指標計算
       5. ローカル SQLite (data/edinet.db) に UPSERT
  └─[apps/wrapper/scripts/publish_to_d1.py]
       6. SQLite の差分を SQL ファイル化
       7. wrangler d1 execute で D1 へ反映
       8. R2 へ SQLite ファイルを丸ごと backup（ロールバック用）

Cloudflare D1
  └─[apps/api (Hono)] が drizzle で読み取り
       └─[apps/web (Vike)] が hono/client で API 呼び出し
```

**重要な簡素化**:

現状の `daily-refresh.yml` は「D1 から SQL export → ローカルで全 schema 再構築 → ingest → 全 schema 再 export → delta 抽出 → D1 へ apply」と往復しているが、これは「ローカル SQLite と D1 の状態同期」のためにやっている。

新パイプラインは **「ローカル SQLite は state を持たず、最後に D1 へ書くだけ」** に変える。日次ジョブの SQLite は毎回ゼロから作成し、差分検出は EDINET API の docID で行う（既に取り込み済みかどうかは D1 に問い合わせる）。これにより:

- D1 export を毎日やる必要がなくなる
- ローカル SQLite が肥大化しない
- pipeline コードが半分以下に

### migrations

`packages/db/migrations/` に drizzle-kit が生成する SQL を置き、CI で `wrangler d1 migrations apply` を実行。ローカルは `pnpm db:migrate:local` で同じ SQL を SQLite に適用。

---

## 3. API 設計（Hono on Workers）

### エンドポイント

| Method | Path | 用途 |
|---|---|---|
| GET | `/api/companies` | 全企業一覧（ページネーション、フィルタ・ソート対応） |
| GET | `/api/companies/:secCode` | 企業詳細（最新スナップショット） |
| GET | `/api/summaries/:secCode` | 時系列財務データ（periods 配列） |
| GET | `/api/metrics` | 一覧表用スナップショット（カラム選択可） |
| GET | `/api/search?q=` | 企業名・証券コード横断検索 |
| GET | `/api/shareholders/:secCode` | 大株主情報 |
| GET | `/api/manifest` | カラム定義（既存 column_manifest を API 化） |
| GET | `/api/health` | ヘルスチェック |

### 実装方針

```typescript
// apps/api/src/index.ts
import { Hono } from "hono";
import { cors } from "hono/cors";
import { cache } from "hono/cache";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "@edinet/db/schema";

type Bindings = {
  EDINET_DB: D1Database;
  EDINET_CACHE: KVNamespace;
  CORS_ORIGIN: string;
};

const app = new Hono<{ Bindings: Bindings }>();
app.use("*", cors({ origin: (origin, c) => c.env.CORS_ORIGIN }));
app.get("/api/companies", cache({ cacheName: "companies", cacheControl: "max-age=300" }), ...);

export default app;
```

### キャッシュ戦略

- 一覧系（`/companies`, `/metrics`）: Cache API で 5 分キャッシュ
- 詳細系（`/summaries/:secCode`）: KV（EDINET_CACHE）に 1 時間キャッシュ、daily-refresh 後に invalidate
- 検索（`/search`）: キャッシュなし（クエリが無数）

### `packages/db` の役割

```typescript
// packages/db/schema.ts
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const companies = sqliteTable("companies", {
  edinetCode: text("edinet_code").primaryKey(),
  secCode: text("sec_code"),
  filerName: text("filer_name").notNull(),
  // ...
});

export const periodFinancials = sqliteTable("period_financials", { ... });

// packages/db/queries.ts
export async function getCompanyBySecCode(db: DrizzleD1, secCode: string) {
  return db.select().from(companies).where(eq(companies.secCode, secCode)).get();
}
```

API も wrapper の `publish_to_d1.py` も、この `packages/db` を介してアクセス（wrapper 側は drizzle-kit が生成した SQL を直接実行するため Python から TS を呼ぶ必要はない）。

---

## 4. フロントエンド

### Vike を維持

理由:

- 既存の `pages/` `+Page.tsx` `+Layout.tsx` 構造をそのまま使える
- vike-photon で CF Workers 上の SSR 実績あり
- 移行コストが最小

### 変更点

| 既存 | 新 |
|---|---|
| `+data.ts` で `public/data/*.json` を fs.readFile | `+data.ts` で API クライアントを呼ぶ |
| `fetch("/data/company_metrics.json")` (client side) | `hono/client` 経由で `/api/metrics` を呼ぶ |
| `public/data/` をビルドに含める | 完全削除、API 経由のみ |

### API クライアント

```typescript
// apps/web/lib/api.ts
import { hc } from "hono/client";
import type { AppType } from "@edinet/api";

const apiBase = import.meta.env.PUBLIC_ENV__API_URL ?? "/api";
export const api = hc<AppType>(apiBase);

// 使用例
const { data } = await api.companies.$get({ query: { page: "1" } });
```

`AppType` は `apps/api` 側で `export type AppType = typeof app;` するだけで型同期される。

### 維持する Context

- `FilterContext` / `FavoritesContext` / `ColumnVisibilityContext` / `RecentCompaniesContext` は全て維持
- localStorage 連携もそのまま

### Sentry / OGP

- Sentry: 維持（`PUBLIC_ENV__SENTRY_DSN`）
- OGP: satori + resvg のスクリプトは維持。ただしビルド前提のデータが API に変わるため、ビルド時に API（or 直接 DB）を呼ぶ

---

## 5. Docker Compose

### `infra/compose.yml`（開発用）

```yaml
services:
  db-init:
    image: alpine:3
    volumes:
      - ./data:/data
      - ./infra/init:/init:ro
    command: /init/fetch-sample-data.sh
    # 初回のみ R2 / GitHub Release からサンプル edinet.db を /data に展開

  api:
    build: ./apps/api
    depends_on:
      db-init:
        condition: service_completed_successfully
    volumes:
      - ./data:/app/data
    environment:
      - DB_PATH=/app/data/edinet.db
    ports:
      - "8787:8787"
    command: pnpm dev  # wrangler dev with local SQLite

  web:
    build: ./apps/web
    depends_on: [api]
    environment:
      - PUBLIC_ENV__API_URL=http://localhost:8787/api
    ports:
      - "3000:3000"
    command: pnpm dev

  wrapper:
    build: ./apps/wrapper
    profiles: ["ingest"]  # 通常起動では立ち上げない
    volumes:
      - ./data:/app/data
      - ./apps/wrapper:/app
    env_file: .env
    command: uv run python scripts/ingest_daily.py
```

`docker compose up` だけで:

1. サンプルデータ自動 DL → `data/edinet.db` 配置
2. API（wrangler dev）起動、SQLite を読む
3. Web 起動、API を叩く

`docker compose --profile ingest run wrapper` で EDINET 取得を手動実行できる。

### `infra/init/fetch-sample-data.sh`

```bash
#!/bin/sh
set -e
if [ -f /data/edinet.db ]; then
  echo "Sample data already exists."
  exit 0
fi
echo "Fetching sample data from GitHub Release..."
wget -O /tmp/sample.db.gz \
  "https://github.com/testkun08080/edinet-wagatoushi/releases/latest/download/sample-edinet.db.gz"
gunzip -c /tmp/sample.db.gz > /data/edinet.db
echo "Sample data ready: $(du -h /data/edinet.db)"
```

### `infra/compose.prod.yml`

R2 の本番データを使ったスモークテスト用。CI でも使う。

---

## 6. CI/CD・デプロイ容易性

### `infra/setup-fork.sh`（フォーク利用者向けワンショット）

```bash
#!/usr/bin/env bash
set -euo pipefail

echo "=== edinet-wagatoushi セットアップ ==="

# 1. CF アカウント確認
wrangler whoami || (echo "wrangler login が必要"; exit 1)

# 2. D1 作成（staging + production）
echo "▶ D1 データベース作成..."
STAGING_ID=$(wrangler d1 create edinet-staging | grep database_id | awk '{print $NF}' | tr -d '"')
PROD_ID=$(wrangler d1 create edinet-production | grep database_id | awk '{print $NF}' | tr -d '"')

# 3. R2 バケット作成
echo "▶ R2 バケット作成..."
wrangler r2 bucket create edinet-data || true

# 4. wrangler.toml に書き戻し（テンプレートから生成）
echo "▶ wrangler 設定生成..."
sed -e "s/__STAGING_D1__/$STAGING_ID/" \
    -e "s/__PROD_D1__/$PROD_ID/" \
    apps/api/wrangler.toml.template > apps/api/wrangler.toml

# 5. migrations 適用
pnpm db:migrate:staging
pnpm db:migrate:production

# 6. GitHub Secrets 案内
echo "▶ 次の GitHub Secrets を設定してください:"
echo "  gh secret set CLOUDFLARE_API_TOKEN"
echo "  gh secret set CLOUDFLARE_ACCOUNT_ID"
echo "  gh secret set EDINET_API_KEY"

echo "✅ 完了！pnpm dev でローカル起動できます。"
```

### `apps/api/wrangler.toml.template`

```toml
name = "edinet-api"
main = "src/index.ts"
compatibility_date = "2025-09-06"

[[env.staging.d1_databases]]
binding = "EDINET_DB"
database_name = "edinet-staging"
database_id = "__STAGING_D1__"

[[env.production.d1_databases]]
binding = "EDINET_DB"
database_name = "edinet-production"
database_id = "__PROD_D1__"

[[env.production.r2_buckets]]
binding = "EDINET_DATA"
bucket_name = "edinet-data"
```

実際の `wrangler.toml` は `.gitignore`、template だけ git 管理。

### `.github/workflows/ci.yml`

```yaml
on: [pull_request, push]
jobs:
  lint-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v5
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo lint test typecheck
      - uses: astral-sh/setup-uv@v7
      - run: cd apps/wrapper && uv sync && uv run pytest && uv run ruff check .
```

### `.github/workflows/deploy.yml`

```yaml
on:
  push:
    branches: [main]
jobs:
  deploy-api:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @edinet/api build
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          workingDirectory: apps/api
          command: deploy --env production
  deploy-web:
    needs: deploy-api
    # similar
```

### 簡素化版 `daily-refresh.yml`

```yaml
on:
  schedule: [{ cron: "10 20 * * *" }]
  workflow_dispatch:
jobs:
  ingest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: astral-sh/setup-uv@v7
      - run: cd apps/wrapper && uv sync
      - name: Fetch already-ingested doc IDs from D1
        run: |
          wrangler d1 execute edinet-production --remote \
            --command "SELECT doc_id FROM documents" --json > /tmp/known.json
      - name: Ingest new docs only
        env: { EDINET_API_KEY: ${{ secrets.EDINET_API_KEY }} }
        run: |
          cd apps/wrapper
          uv run python scripts/ingest_daily.py \
            --known-docs /tmp/known.json \
            --output /tmp/new.db
      - name: Publish delta to D1
        run: |
          cd apps/wrapper
          uv run python scripts/publish_to_d1.py \
            --source /tmp/new.db \
            --env production
      - name: Backup full D1 snapshot to R2
        run: wrangler d1 export edinet-production --remote --output /tmp/snapshot.sql
          && wrangler r2 object put edinet-data/snapshots/$(date +%F).sql --file /tmp/snapshot.sql
```

現状の往復が消え、明快な「取得 → 差分 publish → backup」になる。

### Preview Deployment

PR ごとに wrangler の `--name edinet-api-pr-${{ pr_number }}` でデプロイし、PR コメントに URL を貼る GitHub Action を追加（CF 公式 action でテンプレートあり）。

---

## 7. OSS 整備

### 新規追加ファイル

- `CONTRIBUTING.md` — セットアップ手順、PR ルール、コミットメッセージ規約（Conventional Commits）
- `CODE_OF_CONDUCT.md` — Contributor Covenant v2.1
- `SECURITY.md` — 脆弱性報告窓口（GitHub Security Advisories 推奨）
- `CHANGELOG.md` — changesets が自動生成
- `.changeset/config.json`
- `.github/ISSUE_TEMPLATE/bug.yml` / `feature.yml`
- `.github/pull_request_template.md`
- `.github/FUNDING.yml`（任意）

### Lint / Format / pre-commit

`biome.json`:

```json
{ "linter": { "enabled": true }, "formatter": { "enabled": true, "indentStyle": "space" } }
```

`ruff.toml`:

```toml
line-length = 100
target-version = "py312"
[lint] select = ["E", "F", "I", "B", "UP"]
```

`lefthook.yml`:

```yaml
pre-commit:
  commands:
    biome:
      glob: "*.{ts,tsx,js,jsx}"
      run: pnpm biome check --apply {staged_files}
    ruff:
      glob: "*.py"
      run: uv run ruff check --fix {staged_files} && uv run ruff format {staged_files}
```

### テスト戦略

- **apps/api**: vitest + `@cloudflare/vitest-pool-workers`（Workers ランタイムで実テスト）
- **apps/web**: vitest + Testing Library（Component テスト）+ Playwright（E2E、最低限のスモーク 2-3 本）
- **apps/wrapper**: pytest（既存の `parser.py` に対するスナップショットテスト、`downloader` はモック）
- **packages/db**: better-sqlite3 でローカル SQLite に対するクエリテスト

### リリース管理

changesets で `pnpm changeset` → PR にバージョン bump → main マージで自動リリース。

---

## 8. 移行ステップ（フェーズ分け）

### Phase 0: 準備（1〜2 日）

- 現状の `public/data/` を git history から除去（`git filter-repo` で BFG 的に。**破壊的なので別ブランチで実施**）
- `data-set/` `state/` `raw/` の扱いを `.gitignore` で再確認
- 既存 7 workflow のうち、daily-refresh 以外を新構造でどう代替するか棚卸し

### Phase 1: モノレポ化（3〜5 日）

- pnpm + turborepo セットアップ
- `apps/web` に `edinet-screener/` を移動
- `apps/wrapper` に `edinet-wrapper/` を移動
- `packages/db` を新規作成、`sql/d1_schema.sql` を drizzle schema に翻訳
- `packages/types` を新規作成
- 既存の動作を壊さないこと（compose は後回しでも可）

### Phase 2: API 化（5〜7 日）

- `apps/api` を Hono で新規作成
- 既存の `build_screener_data.py` の指標計算ロジックだけを wrapper 側に残し、JSON 生成ロジックを削除
- `wrapper/scripts/ingest_daily.py` / `publish_to_d1.py` を新規作成し、既存の複雑なパイプラインを置換
- API のエンドポイントを実装、drizzle で D1 / SQLite 両対応
- フロントの fetch 部分を hono/client へ置換

### Phase 3: ローカル DX（2〜3 日）

- `infra/compose.yml` 作成
- `infra/init/fetch-sample-data.sh` 作成
- サンプル SQLite（数十社・5 年分、~20MB）を GitHub Release に上げる
- `docker compose up` だけで UI が見えることを確認

### Phase 4: CI/CD 再構築（2〜3 日）

- `ci.yml` / `deploy.yml` / `daily-refresh.yml` を新規作成
- 旧 workflow を削除
- `wrangler.toml.template` 方式に切り替え
- `setup-fork.sh` 作成・動作確認

### Phase 5: OSS 整備（1〜2 日）

- CONTRIBUTING / CoC / SECURITY 等を追加
- README を全面改訂（フォーク手順を最上部に）
- biome / ruff / lefthook 設定
- 最低限のテスト追加（カバレッジ目標は低めで OK）

### Phase 6: 公開（1 日）

- 既存リポジトリの履歴整理
- v1.0.0 タグ・GitHub Release（サンプル DB 同梱）
- アナウンス

**合計**: 約 2〜3 週間（フルタイム想定）。

---

## 9. リスクとトレードオフ

| リスク | 影響 | 緩和策 |
|---|---|---|
| 完全 API 化で静的ホスト不可 | フォーク利用者は必ず CF アカウントが必要 | README で「無料枠で十分」を明示。Vercel/Netlify 等への adapter は将来課題として明記 |
| Vike + Workers の SSR が将来動かなくなる | デプロイ不能 | Vike を維持しつつ、`pages/` ルーティングだけ独立性を保ち、最悪 Tanstack Router へ載せ替え可能にしておく |
| D1 の read 1 日 5M req 無料枠 | スケール時に課金発生 | KV キャッシュで吸収、`/api/metrics` などホットパスは Cache API で 5 分キャッシュ |
| R2 はエグレス無料だが操作は課金 | 不要な R2 アクセスがコスト化 | 日次 snapshot 以外は R2 を呼ばない設計 |
| 既存 `build_screener_data.py` の指標計算の細部が失われる | フロントの一部メトリクスが消える可能性 | 移行前にスナップショットテスト（既存出力 JSON と新 API レスポンスの diff）を作って差分ゼロを保証 |
| 484MB の git 履歴除去は破壊的 | 既存 fork / PR が壊れる | 別ブランチで filter-repo → 新リポジトリに force push、旧リポを archive |
| pnpm + turborepo + biome + drizzle と新規導入が多い | 学習コスト | 各ツールは設定 1 ファイルで完結する単純なものを選定済み |

---

## 10. 「フォーク利用者の最初の 30 分」シナリオ

```bash
# 1. Fork → Clone（5 分）
gh repo fork testkun08080/edinet-wagatoushi --clone
cd edinet-wagatoushi

# 2. ローカル起動（5 分、Docker のみ必要）
docker compose -f infra/compose.yml up
# → http://localhost:3000 でサンプルデータの UI が動く

# 3. 自分の CF アカウントへセットアップ（10 分）
pnpm install
wrangler login                # ブラウザで OAuth
bash infra/setup-fork.sh      # D1 + R2 自動作成、wrangler.toml 生成

# 4. GitHub Secrets 設定（5 分）
gh secret set CLOUDFLARE_API_TOKEN
gh secret set CLOUDFLARE_ACCOUNT_ID
gh secret set EDINET_API_KEY

# 5. 初回 deploy（5 分）
git add apps/api/wrangler.toml apps/web/wrangler.toml
git commit -m "chore: setup my fork"
git push                       # GitHub Actions が自動 deploy
# → https://edinet-api-<your-account>.workers.dev
# → https://edinet-web-<your-account>.workers.dev

# 6. (任意) 本物のデータを取り込み（夜中に自動）
gh workflow run daily-refresh.yml
```

合計 **30 分** で「自分専用の EDINET スクリーナーが本番運用される」状態。

---

## 11. 検証方法（実装完了後の end-to-end テスト）

1. **クリーンな環境で fork → clone → docker compose up** を実行し、UI でサンプル企業の財務データが見えることを確認
2. `pnpm turbo lint test typecheck` が全 workspace でグリーン
3. `apps/wrapper` で `uv run pytest` がグリーン
4. `setup-fork.sh` を新規 CF アカウントで実行し、`wrangler deploy` まで通ることを確認
5. API のレスポンスを既存の `public/data/*.json` と diff し、フィールドの欠落がないこと
6. `daily-refresh.yml` をテスト dispatch で実行、D1 へ 1 日分の差分が入ること
7. Lighthouse で web の Performance / Accessibility / Best Practices / SEO がすべて 90 点以上
8. R2 への snapshot backup が日次で正常完了していること（過去 7 日分）
9. PR を立ててプレビューデプロイが PR コメントに URL を貼ること
10. `pnpm changeset` → PR → main マージで自動リリースされること

---

## 12. 最終ワークフレーム全体図

### 12-A. レイヤード・アーキテクチャ（縦の依存関係）

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            データソース層                                   │
│                                                                             │
│                    ┌─────────────────────────┐                              │
│                    │   EDINET 公式 API       │                              │
│                    │  (金融庁: documents.json│                              │
│                    │   + TSV/XBRL/PDF)       │                              │
│                    └────────────┬────────────┘                              │
└─────────────────────────────────┼───────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       取得・解析層 (Python)                                 │
│                                                                             │
│   apps/wrapper/                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │ src/edinet_wrapper/                                                 │   │
│   │   downloader.py ─── API クライアント (リトライ・rate limit)         │   │
│   │   parser.py ─────── TSV→Polars→FinancialData                        │   │
│   │   element_id_table── XBRL 要素 ID 辞書                              │   │
│   │   metrics.py ────── ROE/PER/PBR/FCF/成長率 計算                     │   │
│   │   db.py ─────────── SQLite UPSERT (drizzle schema と整合)           │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │ scripts/                                                            │   │
│   │   ingest_daily.py ── 当日分のみ取得・SQLite に書き込み              │   │
│   │   backfill.py ────── 過去 N 年バルク取得                            │   │
│   │   publish_to_d1.py ─ ローカル SQLite → D1 へ差分 apply              │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                  ┌───────────────┴────────────────┐
                  ▼                                ▼
┌─────────────────────────┐          ┌────────────────────────────┐
│   ローカル SQLite       │          │   Cloudflare D1 (本番)     │
│   data/edinet.db        │          │   edinet-production        │
│                         │          │                            │
│   - companies           │          │   同一スキーマ             │
│   - documents           │   sync   │   (drizzle schema が       │
│   - period_financials   │ ───────▶ │    両方を生成)             │
│   - daily_metrics       │          │                            │
│                         │          │   + R2 snapshot backup     │
└────────────┬────────────┘          └──────────────┬─────────────┘
             │ (compose: dev)                       │ (production)
             │                                      │
             ▼                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        永続化層 (packages/db)                               │
│                                                                             │
│   packages/db/                                                              │
│     schema.ts ───── drizzle schema (D1/SQLite 共通)                         │
│     queries.ts ──── 型安全なクエリ関数 (apps/api が import)                 │
│     migrations/ ── drizzle-kit 生成 SQL (CI で両環境に apply)               │
│                                                                             │
│   packages/types/                                                           │
│     index.ts ───── API レスポンス型・OpenAPI 由来型 (web が import)         │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       API 層 (Hono on Workers)                              │
│                                                                             │
│   apps/api/                                                                 │
│     src/index.ts ── Hono app, CORS, cache middleware                        │
│     src/routes/                                                             │
│       companies.ts ── GET /api/companies, /api/companies/:secCode           │
│       summaries.ts ── GET /api/summaries/:secCode  (時系列)                 │
│       metrics.ts ─── GET /api/metrics (一覧表用スナップショット)            │
│       search.ts ──── GET /api/search?q=                                     │
│       shareholders.ts                                                       │
│       manifest.ts ── GET /api/manifest (カラム定義)                         │
│                                                                             │
│   Bindings:                                                                 │
│     EDINET_DB   (D1Database)                                                │
│     EDINET_CACHE (KVNamespace)                                              │
│     EDINET_DATA  (R2Bucket — 監査ログ・スナップショット用)                  │
│                                                                             │
│   export type AppType = typeof app;  // web が型推論で参照                  │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │ HTTPS (CORS or same-origin)
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                  フロントエンド層 (Vike + React on Workers)                 │
│                                                                             │
│   apps/web/                                                                 │
│     pages/                                                                  │
│       index/ ───── マーケティング LP                                        │
│       screener/ ── 一覧テーブル (+data.ts で SSR 時に API 呼出)             │
│       screener/analyze/@secCode/ ─ 企業詳細・チャート                       │
│     lib/api.ts ─── hc<AppType>(API_URL)  ← 型安全クライアント               │
│     components/ ── shadcn/ui + CompanyTable + SummaryCharts                 │
│     contexts/ ──── Filter/Favorites/ColumnVisibility/RecentCompanies        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 12-B. データの流れ（横の時系列）

```
日次 05:10 JST (GitHub Actions: daily-refresh.yml)
══════════════════════════════════════════════════════════════════════════
  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌─────────┐
  │ EDINET API   │───▶│ wrapper      │───▶│ ローカル     │───▶│   D1    │
  │ documents    │    │ ingest_daily │    │ SQLite       │    │ (差分の │
  │ + TSV        │    │ + metrics    │    │ (一時)       │    │  み)    │
  └──────────────┘    └──────────────┘    └──────┬───────┘    └────┬────┘
                                                 │                  │
                                                 ▼                  ▼
                                          ┌──────────────┐  ┌──────────────┐
                                          │   pytest     │  │ R2 snapshot  │
                                          │   バリデート │  │ backup       │
                                          └──────────────┘  └──────────────┘

ユーザーアクセス (リアルタイム)
══════════════════════════════════════════════════════════════════════════
  ┌─────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
  │ Browser │───▶│ Web Worker   │───▶│ API Worker   │───▶│      D1      │
  │ (React) │    │ (SSR/Vike)   │    │ (Hono+drizzle│    │   読み取り   │
  │         │◀───│              │◀───│  +KV cache)  │◀───│              │
  └─────────┘    └──────────────┘    └──────────────┘    └──────────────┘
                                          │ ▲
                                          ▼ │ HIT
                                     ┌──────────┐
                                     │ KV Cache │  (一覧系は 5min)
                                     └──────────┘
```

### 12-C. ローカル開発時の構成（compose.yml）

```
              ┌──────────────────────────────────────────────────┐
              │                docker compose up                 │
              └──────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌──────────────┐           ┌──────────────┐           ┌──────────────┐
│   db-init    │           │     api      │           │     web      │
│   (一回限り) │ completed │ wrangler dev │           │   pnpm dev   │
│              │──────────▶│ + miniflare  │           │ Vike SSR     │
│ GH Release   │           │ + SQLite     │           │              │
│ → sample.db  │           │              │           │ http://...   │
│ → /data/     │           │ :8787        │◀──────────│ :3000        │
└──────┬───────┘           └──────┬───────┘           └──────────────┘
       │                          │
       └──────────► volumes ──────┘
                ./data:/app/data
                (sample SQLite)

  オプション (profile=ingest):
  ┌──────────────┐
  │   wrapper    │  docker compose --profile ingest run wrapper
  │   (Python)   │  → EDINET API から実データ取得
  │   uv run ... │  → /app/data/edinet.db に書き込み
  └──────────────┘
```

### 12-D. CI/CD パイプライン全体

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Pull Request                                                            │
├─────────────────────────────────────────────────────────────────────────┤
│  ci.yml ──┬─ pnpm turbo lint test typecheck (api/web/db/types 並列)     │
│           ├─ uv run pytest + ruff (wrapper)                             │
│           └─ playwright スモーク E2E                                    │
│                                                                         │
│  preview.yml ── wrangler deploy --name edinet-api-pr-${{ number }}      │
│              ── PR コメントに preview URL を貼る                        │
└─────────────────────────────────────────────────────────────────────────┘
                                  │ merge to main
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ main push                                                               │
├─────────────────────────────────────────────────────────────────────────┤
│  deploy.yml ──┬─ db migrations apply (D1 production)                    │
│               ├─ apps/api deploy (Workers production)                   │
│               └─ apps/web  deploy (Workers production)                  │
│                                                                         │
│  release.yml ── changesets が version PR を作成 / merge で tag + GH Rel │
└─────────────────────────────────────────────────────────────────────────┘
                                  │ daily 05:10 JST
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ daily-refresh.yml                                                       │
├─────────────────────────────────────────────────────────────────────────┤
│  1. D1 から既取得 doc_id 一覧を取得                                     │
│  2. wrapper/ingest_daily.py — 新規分のみ取得 → ローカル SQLite         │
│  3. wrapper/publish_to_d1.py — D1 へ INSERT/UPDATE                      │
│  4. R2 へ full snapshot backup (rollback 用)                            │
│  5. Slack/Discord 通知 (任意)                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

### 12-E. フォーク利用者の視点（5 ステップ）

```
   ┌─────────────────────────────────────────────────────────────────┐
   │  Step 1: fork & clone                                           │
   │  gh repo fork testkun08080/edinet-wagatoushi --clone            │
   └─────────────────────────────────────────────────────────────────┘
                                ▼
   ┌─────────────────────────────────────────────────────────────────┐
   │  Step 2: ローカルでサンプル UI を確認                           │
   │  docker compose up  →  http://localhost:3000                    │
   │  (GH Release の sample.db を自動取得して即起動)                 │
   └─────────────────────────────────────────────────────────────────┘
                                ▼
   ┌─────────────────────────────────────────────────────────────────┐
   │  Step 3: 自分の CF アカウントに resources 作成                  │
   │  wrangler login && bash infra/setup-fork.sh                     │
   │  → D1 staging/production, R2 bucket, wrangler.toml 自動生成     │
   └─────────────────────────────────────────────────────────────────┘
                                ▼
   ┌─────────────────────────────────────────────────────────────────┐
   │  Step 4: GitHub Secrets 設定                                    │
   │  gh secret set CLOUDFLARE_API_TOKEN                             │
   │  gh secret set CLOUDFLARE_ACCOUNT_ID                            │
   │  gh secret set EDINET_API_KEY                                   │
   └─────────────────────────────────────────────────────────────────┘
                                ▼
   ┌─────────────────────────────────────────────────────────────────┐
   │  Step 5: push → GitHub Actions が自動 deploy                    │
   │  git commit -am "setup my fork" && git push                     │
   │  → https://edinet-web-<account>.workers.dev                     │
   └─────────────────────────────────────────────────────────────────┘
```

### 12-F. 「何を捨てて、何を残して、何を新規作成するか」一覧

```
┌─────────────────────────────────┬──────────────────────────────────────┐
│ 残す (Reuse)                    │ 捨てる (Drop)                        │
├─────────────────────────────────┼──────────────────────────────────────┤
│ ✓ downloader.py                 │ ✗ public/data/ の git コミット運用   │
│ ✓ parser.py                     │ ✗ build_screener_data.py の JSON生成 │
│ ✓ element_id_table.py           │ ✗ D1↔SQLite 往復同期パイプライン     │
│ ✓ schema.py                     │ ✗ wrangler.jsonc の固有 ID ハードコ  │
│ ✓ sql/d1_schema.sql (→drizzle)  │ ✗ 7 本の workflow の重複部分         │
│ ✓ Vike pages/ 構造              │ ✗ data_source=dataset|d1 の分岐      │
│ ✓ shadcn/ui コンポーネント群    │ ✗ DATA_SET_URL の zip 配布           │
│ ✓ 4 種の React Context          │ ✗ 484MB の git 履歴                  │
│ ✓ Sentry + GA 統合              │                                      │
│ ✓ OGP 生成スクリプト            │                                      │
├─────────────────────────────────┴──────────────────────────────────────┤
│ 新規作成 (New)                                                         │
├────────────────────────────────────────────────────────────────────────┤
│ ＋ apps/api/ (Hono on Workers)                                         │
│ ＋ packages/db/ (drizzle schema + queries + migrations)                │
│ ＋ packages/types/ (共通型)                                            │
│ ＋ apps/wrapper/src/edinet_wrapper/metrics.py (指標計算独立)           │
│ ＋ apps/wrapper/src/edinet_wrapper/db.py (SQLite UPSERT)               │
│ ＋ apps/wrapper/scripts/ingest_daily.py / publish_to_d1.py             │
│ ＋ apps/wrapper/tests/ (pytest)                                        │
│ ＋ infra/compose.yml + compose.prod.yml + init/fetch-sample-data.sh    │
│ ＋ infra/setup-fork.sh                                                 │
│ ＋ pnpm-workspace.yaml / turbo.json / biome.json / ruff.toml           │
│ ＋ lefthook.yml (pre-commit)                                           │
│ ＋ .github/workflows/{ci,deploy,daily-refresh,release}.yml             │
│ ＋ .github/ISSUE_TEMPLATE/ + pull_request_template.md                  │
│ ＋ CONTRIBUTING / CODE_OF_CONDUCT / SECURITY / CHANGELOG               │
│ ＋ wrangler.toml.template (database_id を gitignore)                   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 13. 重要な決定（押さえておくべき non-obvious な選択）

- **Vike 維持**: 移行コスト最小化のため。ただし `vike-photon` の将来性は要監視。
- **Python は monorepo 内で同居するが pnpm workspace には入れない**: `apps/wrapper` には package.json を置かず、uv 単体で完結。turbo.json から `uv run` を呼ぶ形に。
- **drizzle 採用**: 生 SQL でも書けるが、D1 と SQLite の差分（D1 にはトリガーがない等）を抽象化してくれる ORM があるとフォーク利用者が触りやすい。
- **R2 は本番運用のみ、フォーク利用者には GitHub Release のサンプル DB**: R2 は CF アカウント固有で fork 不可なため、初学者の試用には Release のアセットだけで十分。
- **wrangler.toml は git 管理外、template だけ管理**: フォーク利用者が誤って公式の database_id を上書きする事故を防ぐ。
- **既存の 484MB JSON データの git 履歴は filter-repo で消す**: 残すと clone が永続的に重くなる。

---

## 付録: 新リポジトリへの移行手順

このプランを別リポジトリ（例: `edinet-wagatoushi-v2`）にクローンして実装着手する場合は、以下のいずれか:

### Option A: ブランチごと clone

```bash
git clone -b claude/festive-cori-Od2Ow \
  https://github.com/testkun08080/edinet-wagatoushi.git edinet-wagatoushi-v2
cd edinet-wagatoushi-v2
git remote set-url origin <new-repo-url>
git push -u origin main
```

### Option B: ドキュメントだけ cherry-pick

```bash
cd <new-repo>
git remote add upstream https://github.com/testkun08080/edinet-wagatoushi.git
git fetch upstream claude/festive-cori-Od2Ow
git checkout upstream/claude/festive-cori-Od2Ow -- docs/V2_REDESIGN_PLAN.md docs/README.md
git commit -m "docs: import V2 redesign plan from upstream"
```

どちらの場合も、本ドキュメントを Phase 0 → 1 → 2 ... と順に消化していけば、最終形に到達できる。

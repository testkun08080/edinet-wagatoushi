# Architecture

一目で全体構造がわかるように、レイヤ・依存関係・データフローをまとめる。
モジュール個別の詳細は [`docs/modules/`](./modules/) を参照。

## ディレクトリ構成（注釈付き）

```
edinet-wagatoushi/
├── apps/
│   ├── api/                  Hono on Workers — REST API        → modules/api.md
│   │   ├── src/
│   │   │   ├── index.ts        app 本体・ミドルウェア・ルート集約・AppType export
│   │   │   ├── env.ts          Bindings (D1/KV/R2) と Variables の型
│   │   │   ├── middleware/db.ts  drizzle(D1) を c.var.db に注入
│   │   │   └── routes/         health / companies / summaries / metrics /
│   │   │                       search / shareholders / manifest
│   │   ├── test/             vitest スモーク + 型レベル RPC テスト
│   │   └── wrangler.toml.template  D1/KV/R2 binding の placeholder
│   │
│   ├── web/                  Vike + React on Workers — UI       → modules/web.md
│   │   ├── pages/            Vike ルーティング (screener / analyze / index ...)
│   │   ├── components/       CompanyTable / SummaryCharts / shadcn-ui ...
│   │   ├── lib/              api.ts (hono/client) / metricsLoader.ts ...
│   │   ├── contexts/         Filter / Favorites / ColumnVisibility / Recent
│   │   └── wrangler.jsonc.template
│   │
│   └── wrapper/              Python — EDINET 取得・解析          → modules/wrapper.md
│       ├── src/edinet_wrapper/
│       │   ├── downloader.py   EDINET API クライアント
│       │   ├── parser.py       TSV → Polars → FinancialData
│       │   ├── element_id_table.py  XBRL element ID 辞書
│       │   ├── schema.py       データモデル
│       │   ├── metrics.py      ROE/ROA/margins/FCF/成長率
│       │   └── db.py           SQLite UPSERT + delta export
│       ├── scripts/          ingest_daily / publish_to_d1 / backfill
│       └── tests/            pytest
│
├── packages/
│   ├── db/                   drizzle schema + 共通クエリ        → modules/db.md
│   │   ├── src/schema.ts       7 テーブル定義 (D1/SQLite 共通)
│   │   ├── src/queries.ts      listCompanies / getSummaryBySecCode ...
│   │   └── migrations/         drizzle-kit 生成 SQL (schema 正本)
│   └── types/                API/Web 共通 TS 型                 → modules/types.md
│       └── src/index.ts        Company / MetricsRow / SummaryResponse ...
│
├── infra/                    ローカル開発・デプロイ補助          → modules/infra.md
│   ├── compose.yml             api + web + sample DB
│   ├── compose.prod.yml        本番相当スモーク
│   ├── init/fetch-sample-data.sh
│   └── setup-fork.sh           D1/KV/R2 作成 + wrangler 設定生成
│
├── docs/                     本ドキュメント群
│   ├── ARCHITECTURE.md         ← これ
│   ├── MIGRATION.md            旧構造からの移行マップ
│   └── modules/*.md            モジュール別詳細
│
└── (root)                    pnpm-workspace.yaml / turbo.json /
                              biome.json / ruff.toml / lefthook.yml
```

## レイヤと責務

| レイヤ | モジュール | 言語 / FW | 責務 |
|---|---|---|---|
| 取得・解析 | `apps/wrapper` | Python | EDINET から取得・XBRL/TSV パース・指標計算・SQLite 書込 |
| 永続化 | Cloudflare D1 + `packages/db` | SQLite / drizzle | スキーマ定義・マイグレーション・共通クエリ |
| API | `apps/api` | Hono / Workers | D1 を読み JSON を返す REST API |
| 型共有 | `packages/types` | TypeScript | API レスポンス型を api/web で共有 |
| UI | `apps/web` | Vike + React / Workers | スクリーナー表示・型安全に API 呼び出し |
| 基盤 | `infra` | Docker / bash | ローカル起動・フォークセットアップ |

## 依存グラフ（ビルド時）

```
packages/types ◄──────────────┐
      ▲                        │
      │                        │
packages/db ◄── apps/api ──────┤
                   ▲           │
                   │ (型のみ)   │
                apps/web ──────┘

apps/wrapper (Python・pnpm workspace 外、D1 へは生成 SQL 経由で疎結合)
```

- `apps/web` は `apps/api` を **型 (`AppType`) のみ** import（実行時依存なし）
- `apps/wrapper` は TS を一切 import せず、drizzle 生成 SQL を読んで SQLite を作るだけ
- 循環依存なし

## データフロー

### 取り込み（日次 / バックフィル）

```
EDINET API
  │  downloader.py
  ▼
TSV / XBRL
  │  parser.py → metrics.py
  ▼
FinancialData
  │  db.py (UPSERT)
  ▼
ローカル SQLite (data/edinet.db)
  │  publish_to_d1.py (updated_at で delta 抽出 → SQL)
  ▼
wrangler d1 execute
  ▼
Cloudflare D1
```

### 配信（リクエスト時）

```
Browser
  │
  ▼
apps/web (Vike SSR / CSR)
  │  lib/api.ts: hc<AppType>
  ▼
apps/api (Hono)
  │  middleware/db.ts: drizzle(D1)
  │  packages/db/queries.ts
  ▼
Cloudflare D1
```

型は `apps/api` の `export type AppType = typeof app` を `apps/web` が `hc<AppType>` で受けるため、エンドポイントの追加・変更がコンパイル時に web 側へ伝播する。

## CI/CD

| workflow | トリガ | 内容 |
|---|---|---|
| `ci.yml` | PR / push | biome + turbo typecheck/test + ruff/pytest |
| `deploy.yml` | main push / 手動 | wrangler.toml をテンプレ生成 → api/web を Workers へ |
| `daily-refresh.yml` | cron / 手動 | ingest_daily → publish_to_d1 → D1 → R2 snapshot |
| `release.yml` | main push | changesets で version bump + tag |

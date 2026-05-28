# apps/wrapper — Python EDINET 取得・解析

EDINET からデータを取得・パースし、指標を計算してローカル SQLite に書き、差分を D1 へ送る。`uv` 管理で **pnpm workspace 外**。

パッケージ名: `edinet-wrapper` (Python)

## ファイル構成

```
apps/wrapper/
├── src/edinet_wrapper/
│   ├── downloader.py        EDINET API クライアント（リトライ・rate limit）
│   ├── parser.py            TSV → Polars → FinancialData
│   ├── element_id_table.py  XBRL element ID → 日本語ラベル辞書 (BS/PL/CF/SUMMARY)
│   ├── schema.py            Metadata / Result / FinancialData データモデル
│   ├── metrics.py           指標計算（純粋関数・単体テスト対象）
│   └── db.py                SQLite UPSERT + updated_at ベースの delta export
├── scripts/
│   ├── ingest_daily.py      当日提出分を取得 → ローカル SQLite
│   ├── publish_to_d1.py     SQLite 差分 → D1 用 SQL ファイル
│   └── backfill.py          過去 N 年バルク取り込み
├── config/
│   └── screener_columns.json  UI カラム定義（manifest 用、API へ移植予定）
├── tests/
│   └── test_metrics.py      pytest スモーク
├── pyproject.toml           deps + pytest 設定
└── Dockerfile
```

## 主要モジュール

### metrics.py — `compute_core_metrics(pl, bs, cf, prior_pl=None)`

| 指標 | 式 |
|---|---|
| ROE | net_income / equity × 100 |
| ROA | net_income / total_assets × 100 |
| operating_margin | operating_income / revenue × 100 |
| net_margin | net_income / revenue × 100 |
| equity_ratio | equity / total_assets × 100 |
| fcf | op_cf + inv_cf（inv_cf は通常負） |
| revenue_growth | (revenue − prior) / prior × 100 |
| op_income_growth | 同上（営業利益） |

XBRL element ID の表記揺れに備え、`_num()` が複数キーをフォールバック探索する（`NetSales` / `NetSalesSummaryOfBusinessResults` / IFRS 系など）。分母 0・欠損は `None`。

### db.py

- `open_db(path)` / `apply_schema(conn)` — `packages/db/migrations/0000_init.sql` を読んで初期化
- `upsert_company / upsert_document / upsert_period_financial`
- `export_inserts_after(conn, since_ts)` — `updated_at >= since` の行を `INSERT OR REPLACE` 文として yield（publish_to_d1 が利用）

## スクリプト

```bash
# 日次取り込み
EDINET_API_KEY=... uv run python scripts/ingest_daily.py \
    --date 2026-05-25 --output data/edinet.db

# D1 用 delta SQL 生成（CF 認証不要）
uv run python scripts/publish_to_d1.py \
    --source data/edinet.db --since 2026-05-24T00:00:00 --output /tmp/delta.sql

# D1 へ反映（リポジトリルートから）
wrangler d1 execute edinet-production --remote --file /tmp/delta.sql

# 過去 N 年
uv run python scripts/backfill.py --years 5 --output data/edinet.db
```

> `ingest_daily.py` / `backfill.py` は downloader+parser の実配線部分が TODO。EDINET 実データで動かして `metrics.py` のキーフォールバックを実測値に合わせる作業が残っている。

## 開発

```bash
cd apps/wrapper
uv sync
uv run pytest
uv run ruff check . && uv run ruff format --check .
```

## 設計上のポイント

- スキーマ正本は `packages/db`（drizzle）。Python は生成 SQL を読むだけで TS に依存しない。
- ローカル SQLite は ephemeral。状態は D1 が持ち、差分は `updated_at` で抽出する一方通行。

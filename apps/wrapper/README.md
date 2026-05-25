# @edinet/wrapper

[EDINET](https://disclosure2.edinet-fsa.go.jp) のデータ取得・パース用 Python パッケージ。`uv` で管理する。

## モジュール

| ファイル | 役割 |
|---|---|
| `src/edinet_wrapper/downloader.py` | EDINET API クライアント (リトライ付き) |
| `src/edinet_wrapper/parser.py` | TSV → Polars → FinancialData |
| `src/edinet_wrapper/element_id_table.py` | XBRL element ID 辞書 |
| `src/edinet_wrapper/schema.py` | データモデル |
| `src/edinet_wrapper/metrics.py` | ROE / ROA / margins / FCF / 成長率 計算 |
| `src/edinet_wrapper/db.py` | SQLite UPSERT + delta export |

## スクリプト

| スクリプト | 用途 |
|---|---|
| `scripts/ingest_daily.py` | 当日分の EDINET 取得 → ローカル SQLite |
| `scripts/publish_to_d1.py` | SQLite 差分 → Cloudflare D1 用 SQL 出力 |
| `scripts/backfill.py` | 過去 N 年バルク取り込み |

## 開発

```bash
uv sync
uv run pytest
uv run ruff check .
uv run ruff format .
```

## 使用例

```bash
# 日次取り込み
EDINET_API_KEY=... uv run python scripts/ingest_daily.py --date 2026-05-25 --output data/edinet.db

# D1 用 delta SQL を生成
uv run python scripts/publish_to_d1.py --source data/edinet.db --since 2026-05-24T00:00:00 --output /tmp/delta.sql

# D1 へ反映 (リポジトリルートから)
wrangler d1 execute edinet-production --remote --file /tmp/delta.sql
```

`.env` に `EDINET_API_KEY` を設定する。

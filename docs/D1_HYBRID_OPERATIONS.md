# D1 Production Operations

## 目的

既存の `public/data` 配信を維持したまま、Cloudflare D1 を本番DBの正本として運用し、そこから配信用 JSON を生成する。

## テーブル設計（最小）

- `companies`: 企業マスタ（`edinet_code` 主キー）
- `documents`: 書類メタ（`doc_id` 主キー）
- `period_financials`: パース済み財務データ（`(edinet_code, period_end, doc_type)` 主キー）
- `raw_files_index`: 生ファイル索引（`doc_id + file_type` 一意）
- `pipeline_runs`: 実行履歴（再実行・障害解析）
- `daily_metrics`: 前日比較の件数監視

DDL は `edinet-wrapper/sql/d1_schema.sql` を正とする。

## 初回シード

`edinet-wrapper/data` を初期コーパスとして D1 に投入する。通常のローカル検証では production seed は不要。

```bash
cd edinet-screener
npm run d1:seed:staging
```

production はライブ D1 への一回限りの初期投入時だけ実行する。

```bash
cd edinet-screener
npm run d1:seed:production
```

事前に `wrangler.jsonc` の `EDINET_DB` binding に実際の D1 `database_id` を設定し、Cloudflare 認証を済ませる。

## ローカル日次実行

```bash
cd edinet-wrapper
uv run python scripts/pipeline/ingest_daily_edinet_to_db.py \
  --doc_types "annual,quarterly,semiannual,large_holding" \
  --db_path state/edinet_pipeline.db \
  --schema_path sql/d1_schema.sql \
  --raw_root raw \
  --scope daily-refresh \
  --touched_doc_ids_out state/touched_doc_ids.txt
uv run python scripts/pipeline/materialize_daily_aggregates.py --db_path state/edinet_pipeline.db
```

指定日で再実行:

```bash
cd edinet-wrapper
uv run python scripts/pipeline/ingest_daily_edinet_to_db.py \
  --target_date 2026-04-23 \
  --doc_types "annual,quarterly,semiannual,large_holding" \
  --db_path state/edinet_pipeline.db \
  --schema_path sql/d1_schema.sql \
  --raw_root raw \
  --scope daily-refresh \
  --touched_doc_ids_out state/touched_doc_ids.txt
uv run python scripts/pipeline/materialize_daily_aggregates.py --db_path state/edinet_pipeline.db
```

## JSON 生成（ローカルDBから）

```bash
cd edinet-wrapper
uv run python scripts/pipeline/build_public_data_from_db.py \
  --db_path state/edinet_pipeline.db \
  --output ../edinet-screener/public/data
```

## Cloudflare 日次反映

1. D1 スキーマ適用（初回・変更時）
  - `cd edinet-screener && npm run d1:apply-schema:staging`
  - `cd edinet-screener && npm run d1:apply-schema:production`
2. `.github/workflows/daily-refresh.yml` を `data_source=d1` で実行
3. Workflow は remote D1 を export してローカルSQLiteへ復元し、日次差分を取り込み、差分SQLを D1 にUPSERTする
4. D1全体から `public/data` を生成し、品質ゲート通過後に commit/push する
5. 成果物 commit/push 後、Cloudflare Git integration で自動配信

## スケール時の方針

- 生ファイルは R2（`raw/...`）を正本にし、D1 は検索・配信向けメタ/集計を保持
- 重い集計は `materialize_daily_aggregates.py` による事前計算テーブルへ分離
- インデックス最適化は `period_financials(sec_code, period_end)` と `documents(doc_type, submit_date_time)` を起点に実施


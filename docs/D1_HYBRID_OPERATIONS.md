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

### data-set が corpus 互換でない場合

`data-set` が `edinet_corpus-annual-2025/.../E00007/S100....tsv` のような分割ディレクトリでも、seed スクリプトは自動で import-root 互換に変換して取り込む。

```bash
cd edinet-screener
DATA_ROOT=../data-set npm run d1:seed:staging
```

必要に応じて以下を調整:

- `IMPORT_ROOT`（デフォルト: `edinet-wrapper/state/import-root`）
- `DATA_LINK_MODE=symlink|hardlink|copy`（デフォルト: `symlink`）
- `D1_SQL_CHUNK_ROWS`（デフォルト: `25`）
- `MAX_D1_CHUNKS_PER_RUN`（デフォルト: `5000`）

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

### ローカル: リモート D1 エクスポート + コーパス DB をマージ

Cloudflare から復元した `d1_from_remote.db` を **ベース**、data-set / パイプラインの `edinet_pipeline_full_merged.db` を **オーバーレイ**（同一主キーはオーバーレイ＝コーパス優先）として結合し、その後 JSON を生成する。

```bash
cd edinet-wrapper
uv run python scripts/pipeline/merge_two_pipeline_dbs.py \
  --dst state/d1_remote_corpus_merged.db \
  --base_db state/d1_from_remote.db \
  --overlay_db state/edinet_pipeline_full_merged.db \
  --reset
uv run python scripts/pipeline/materialize_daily_aggregates.py --db_path state/d1_remote_corpus_merged.db
uv run python scripts/pipeline/build_public_data_from_db.py \
  --db_path state/d1_remote_corpus_merged.db \
  --output ../edinet-screener/public/data
```

## Cloudflare 日次反映

- D1 スキーマ適用（初回・変更時）
  - `cd edinet-screener && npm run d1:apply-schema:staging`
  - `cd edinet-screener && npm run d1:apply-schema:production`
- `.github/workflows/daily-refresh.yml` を `data_source=d1` で実行（手動バックフィルは `workflow_dispatch` の **`target_date`**（空欄＝昨日 JST）を利用）
- 本番反映の前に staging で同じ日付をローカル検証する手順: [DAILY_REFRESH_LOCAL_DEBUG.md](./DAILY_REFRESH_LOCAL_DEBUG.md) の「5.1 GHA（production）実行前のチェック」
- Workflow は remote D1 を export してローカルSQLiteへ復元し、日次差分を取り込み、差分SQLを D1 にUPSERTする
- D1全体から `public/data` を生成し、品質ゲート通過後に commit/push する
- 成果物 commit/push 後、Cloudflare Git integration で自動配信

## Cloudflare 無料枠を守る運用

- 初回 seed 後はフル再 seed を常用しない（障害復旧時のみ手動承認）。
- 日次反映は `touched_doc_ids.txt` に基づく差分 UPSERT のみ実行する。
- 差分 SQL は小チャンク（目安 `25` 行）に分割する。
- 1 回の更新で適用する chunk 数に上限を持たせる（workflow では `MAX_D1_CHUNKS_PER_RUN=250`）。
- chunk 上限超過時は失敗として停止し、翌日に繰り越して無料枠の急消費を防ぐ。

## スケール時の方針

- 生ファイルは R2（`raw/...`）を正本にし、D1 は検索・配信向けメタ/集計を保持
- 重い集計は `materialize_daily_aggregates.py` による事前計算テーブルへ分離
- インデックス最適化は `period_financials(sec_code, period_end)` と `documents(doc_type, submit_date_time)` を起点に実施

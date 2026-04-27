# Daily Refresh ローカル検証ランブック

GitHub Actions の `daily-refresh` が成功しているのに、Cloudflare D1 側のデータ更新が反映されていない疑いがあるときに、ローカルで同一フローを手動実行して詰まり箇所を特定するための手順書です。

## 0. 前提と安全運用

- まず `staging` で検証し、`production` は原因が特定できてから実施する
- 実行順は `.github/workflows/daily-refresh.yml` と揃える
- 参照する主な入力:
  - `edinet-wrapper/sql/d1_schema.sql`
  - `edinet-wrapper/state/d1-export.sql`（実行時に生成）
  - `edinet-wrapper/state/touched_doc_ids.txt`（実行時に生成）

必要な環境変数:

```bash
export EDINET_API_KEY="..."
export CLOUDFLARE_API_TOKEN="..."
export CLOUDFLARE_ACCOUNT_ID="..."
```

## 1. 依存関係セットアップ

```bash
cd edinet-wrapper
uv sync

cd ../edinet-screener
npm ci
```

期待値:

- `uv sync` / `npm ci` がエラーなく完了する

失敗時の主な原因:

- Python/Node バージョン不整合
- lockfile 更新漏れ

## 2. D1 スキーマ適用（Actions 相当）

```bash
cd edinet-screener
bash scripts/d1-apply-schema.sh staging
```

期待値:

- `Applied D1 schema to env=staging` が出力される

失敗時の主な原因:

- `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` の不足
- `wrangler.jsonc` の環境定義ミス

## 3. remote D1 を SQL export

```bash
cd edinet-screener
WRANGLER_BIN="$(bash -c 'source scripts/resolve-wrangler.sh; resolve_wrangler "$PWD"')"
"$WRANGLER_BIN" d1 export EDINET_DB \
  --env staging \
  --remote \
  --no-schema \
  --output ../edinet-wrapper/state/d1-export.sql
```

期待値:

- `edinet-wrapper/state/d1-export.sql` が生成される
- ファイルサイズが 0 バイトでない

失敗時の主な原因:

- ターゲット環境違い（`staging`/`production` の取り違え）
- 対象 D1 DB バインディング誤り

確認:

```bash
cd ../edinet-wrapper
ls -lh state/d1-export.sql
```

## 4. SQL dump をローカル SQLite に復元

```bash
cd edinet-wrapper
uv run python scripts/pipeline/load_sql_dump_to_sqlite.py \
  --sql_path state/d1-export.sql \
  --db_path state/edinet_pipeline.db \
  --schema_path sql/d1_schema.sql \
  --reset
```

期待値:

- `Loaded SQL dump into SQLite DB: state/edinet_pipeline.db` が出る
- `state/edinet_pipeline.db` が生成される

失敗時の主な原因:

- export された SQL ファイルが空
- 破損 SQL / 途中で切れた SQL

## 5. EDINET 日次取り込み（ローカルDBへ）

```bash
cd edinet-wrapper
uv run python scripts/pipeline/ingest_daily_edinet_to_db.py \
  --doc_types "annual,quarterly,semiannual,large_holding" \
  --db_path state/edinet_pipeline.db \
  --schema_path sql/d1_schema.sql \
  --raw_root raw \
  --scope daily-refresh \
  --touched_doc_ids_out state/touched_doc_ids.txt
```

必要に応じて対象日固定（再現性確保）:

```bash
uv run python scripts/pipeline/ingest_daily_edinet_to_db.py \
  --target_date 2026-04-25 \
  --doc_types "annual,quarterly,semiannual,large_holding" \
  --db_path state/edinet_pipeline.db \
  --schema_path sql/d1_schema.sql \
  --raw_root raw \
  --scope daily-refresh \
  --touched_doc_ids_out state/touched_doc_ids.txt
```

期待値:

- 最後に `Pipeline completed status=...` が出る
- `state/touched_doc_ids.txt` が生成される

失敗時の主な原因:

- `EDINET_API_KEY` 無効
- EDINET 側の一時障害
- `touched_doc_ids.txt` が空（その日は対象提出が無い or フィルタ条件が厳しすぎる）

## 6. 日次集計テーブル更新

```bash
cd edinet-wrapper
uv run python scripts/pipeline/materialize_daily_aggregates.py --db_path state/edinet_pipeline.db
```

補足（daily-refresh の取得物）:

- `ingest_daily_edinet_to_db.py` は daily-refresh 用途では **TSV + JSON のみ** を `raw/` 配下に保存する
- PDF は daily-refresh では利用しない（`period_financials` 生成は TSV パースのみで完結）
- これにより API 呼び出し回数と保存容量を抑えられる

期待値:

- エラー終了しない

失敗時の主な原因:

- 入力テーブル不整合
- 事前ステップ（取り込み）未完了

## 7. D1 反映用差分 SQL を生成

```bash
cd edinet-wrapper
rm -rf state/d1-delta-sql
uv run python scripts/pipeline/export_db_to_d1_sql.py \
  --db_path state/edinet_pipeline.db \
  --output_dir state/d1-delta-sql \
  --where_doc_ids_file state/touched_doc_ids.txt \
  --chunk_rows 50
```

期待値:

- `state/d1-delta-sql/manifest.txt` が生成される
- `Wrote N D1 SQL chunk(s)` が出力される

失敗時の主な原因:

- `touched_doc_ids.txt` が空または未生成
- 参照テーブルに差分がない

確認:

```bash
cd edinet-wrapper
ls -lh state/d1-delta-sql
```

## 8. 差分 SQL を remote D1 へ適用

```bash
cd edinet-screener
bash scripts/d1-execute-sql-dir.sh staging ../edinet-wrapper/state/d1-delta-sql
```

期待値:

- `[d1] applying ...` が連続して出る
- エラーなく終了する

失敗時の主な原因:

- manifest はあるが SQL chunk の途中でエラー（型・制約違反など）
- 実行対象の `staging`/`production` 取り違え

再開実行（失敗chunkから）:

```bash
cd edinet-screener
bash scripts/d1-execute-sql-dir.sh staging ../edinet-wrapper/state/d1-delta-sql 0003_documents_0001.sql
```

## 9. 更新確認（ローカルDB / remote D1）

### 9-1. touched_doc_ids の件数

```bash
cd edinet-wrapper
wc -l state/touched_doc_ids.txt
```

### 9-2. ローカル SQLite 側の更新件数確認

```bash
cd edinet-wrapper
uv run python - <<'PY'
import sqlite3
conn = sqlite3.connect("state/edinet_pipeline.db")
for table in ["documents", "period_financials", "daily_metrics", "pipeline_runs"]:
    c = conn.execute(f"select count(*) from {table}").fetchone()[0]
    print(f"{table}: {c}")
for file_type in ["tsv", "json", "pdf"]:
    c = conn.execute("select count(*) from raw_files_index where file_type = ?", (file_type,)).fetchone()[0]
    print(f"raw_files_index[{file_type}]: {c}")
row = conn.execute("select run_id, status, target_date, finished_at from pipeline_runs order by finished_at desc limit 1").fetchone()
print("latest_run:", row)
conn.close()
PY
```

### 9-3. remote D1 側の更新確認

```bash
cd edinet-screener
WRANGLER_BIN="$(bash -c 'source scripts/resolve-wrangler.sh; resolve_wrangler "$PWD"')"
"$WRANGLER_BIN" d1 execute EDINET_DB --env staging --remote --command "SELECT COUNT(*) AS c FROM documents;"
"$WRANGLER_BIN" d1 execute EDINET_DB --env staging --remote --command "SELECT COUNT(*) AS c FROM period_financials;"
"$WRANGLER_BIN" d1 execute EDINET_DB --env staging --remote --command "SELECT run_id,status,target_date,finished_at FROM pipeline_runs ORDER BY finished_at DESC LIMIT 3;"
```

判定:

- ローカルは増えているが remote D1 が増えていない: Step 8 の適用漏れ/失敗の可能性が高い
- remote D1 は増えているが画面データが変わらない: `generate-data` 経路（`DATA_SOURCE` や参照DB）を確認

## 10. 原因特定テンプレート（実行記録）

以下を都度埋めると、どこで止まったかを 1 回で共有しやすくなります。

```md
## Daily Refresh Debug Log

- 実施日時:
- 実施環境: staging / production
- target_date:
- 実行者:

### Step結果
- Step 2 (schema apply): success / fail
- Step 3 (d1 export): success / fail
- Step 4 (sqlite restore): success / fail
- Step 5 (ingest daily): success / fail
- Step 6 (materialize): success / fail
- Step 7 (delta export): success / fail
- Step 8 (d1 apply): success / fail
- Step 9 (verification): success / fail

### 生成物
- state/d1-export.sql:
- state/edinet_pipeline.db:
- state/touched_doc_ids.txt:
- state/d1-delta-sql/manifest.txt:

### 件数確認
- touched_doc_ids 行数:
- local documents count:
- local period_financials count:
- remote documents count:
- remote period_financials count:

### 観測されたエラー
- コマンド:
- エラーメッセージ:
- 直前に成功したステップ:

### 次アクション
- 
```

## 11. 原因別の最短復旧アクション

- `d1 export` 失敗:
  - Cloudflare 認証情報再確認
  - `wrangler.jsonc` の `EDINET_DB` binding が対象環境に正しく紐付いているか確認
- `ingest` 成功だが `touched_doc_ids.txt` が空:
  - `--target_date` 指定で再実行し、提出がある日で確認
  - `--doc_types` の絞り込みが厳しすぎないか確認
- `delta sql` が 0 chunk:
  - Step 5 実行ログで `fetched/ingested` を確認
  - `state/touched_doc_ids.txt` の中身を確認
- `d1-execute-sql-dir.sh` 途中失敗:
  - 失敗 chunk 名を控えて `start-from-chunk` で再開
  - 失敗SQLの内容を見て制約違反/型不整合を切り分け
- remote D1 更新済みだが公開データ未反映:
  - `npm run generate-data` 実行時の `DATA_SOURCE` が `d1` になっているか確認
  - `D1_DB_PATH` の参照先誤りがないか確認

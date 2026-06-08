# 人間確認チェックリスト

自動テストとローカル seed でロジックは検証済みです。以下の項目はブラウザまたはリモート Cloudflare 環境で人間が確認します。

---

## スクリーナー（Phase B / C）

### 事前準備

```bash
# ローカル D1 に schema + seed + company_metrics を投入（初回のみ）
bash infra/init/prepare-local-d1.sh

# API をローカル D1 で起動（--remote を外す）
cd apps/api && pnpm exec wrangler dev --port 8787

# 別タブで Web を起動
pnpm --filter @edinet/web dev
```

### 確認項目

- [ ] `http://localhost:3000/screener` を開き、指標列（ROE、売上高、EPS 等）に数値が表示される
- [ ] フィルタ（ROE・売上高・会社名）を入力するとテーブルが絞り込まれる（`VITE_SCREENER_MODE=all` デフォルト）
- [ ] `apps/web/.env.local` に `VITE_SCREENER_MODE=server` を追加して Web を再起動 → テーブルが 1 ページのみ読込み、フィルタ／ソート変更時にブラウザ開発ツール Network タブで `/api/metrics/query` リクエストが飛ぶ

---

## 大株主（Phase E）

### 事前準備

ローカル D1 に `prepare-local-d1.sh` が完了していれば `shareholder_snapshots` に 9999 のサンプルが入っています。

### 確認項目

- [ ] `http://localhost:3000/screener/analyze/9999` を開き「大株主」タブにスナップショット（株主名・保有比率）が表示される

---

## リモート backfill とキャッシュ（staging → production）

### staging で少量テスト

> `wrangler dev --env staging --remote` する前に `apps/api/wrangler.toml` の staging を実際の D1 名に合わせること。  
> KV の `__STAGING_KV_ID__` がプレースホルダーのままだと起動失敗する（KV 未使用なら `[[env.staging.kv_namespaces]]` をコメントアウト）。

```bash
cd apps/api
D1_NAME=edisuku-db-staging

# migration 適用（未適用の場合のみ）
pnpm exec wrangler d1 execute "$D1_NAME" --remote --env staging \
  --file ../../packages/db/migrations/0001_company_metrics.sql

# staging からエクスポート → --limit 10 で SQL 生成
pnpm exec wrangler d1 export "$D1_NAME" --remote --env staging --output /tmp/staging-corpus.sql
rm -f /tmp/staging-corpus.db   # 既存ファイルがあると UNIQUE 制約エラーになる
sqlite3 /tmp/staging-corpus.db < /tmp/staging-corpus.sql
# リポジトリルートで実行
cd ../..
LIMIT=10 pnpm db:backfill:metrics -- /tmp/staging-corpus.db /tmp/staging-metrics.sql --limit 10

# D1 に投入
pnpm exec wrangler d1 execute "$D1_NAME" --remote --env staging \
  --file /tmp/staging-metrics.sql

# 件数確認
pnpm exec wrangler d1 execute "$D1_NAME" --remote --env staging \
  --command "SELECT COUNT(*) FROM company_metrics"
```

- [ ] staging `company_metrics` に 10 件前後の行が入り、`/api/metrics` で `sales`・`ROE` が返ってくる

### 本番（edisuku-db）への全件 backfill

> `apps/api/wrangler.toml` の production は `edisuku-db` / KV コメントアウト済みであること。  
> GitHub Secret `D1_PRODUCTION_NAME=edisuku-db` を推奨（未設定時 daily-refresh は `edinet-production` にフォールバック）。

```bash
cd apps/api
D1_NAME=edisuku-db

# 1) export（数分〜十数分）
pnpm exec wrangler d1 export "$D1_NAME" --remote --env production \
  --output /tmp/prod-corpus.sql

# 2) SQLite 化（必ず rm してから）
rm -f /tmp/prod-corpus.db
sqlite3 /tmp/prod-corpus.db < /tmp/prod-corpus.sql

# 3) 全件 metrics SQL 生成（リポジトリルート）
cd ../..
pnpm db:backfill:metrics -- /tmp/prod-corpus.db /tmp/prod-company_metrics.sql

# 4) 本番投入
cd apps/api
pnpm exec wrangler d1 execute "$D1_NAME" --remote --env production \
  --file /tmp/prod-company_metrics.sql

pnpm exec wrangler d1 execute "$D1_NAME" --remote --env production \
  --command "SELECT COUNT(*) AS n FROM company_metrics"
```

- [ ] `company_metrics` が ~3900 件前後

### Phase 2: local + remote で本番 D1 検証

```bash
cd apps/api
pnpm exec wrangler dev --env production --remote --port 8787

# 別タブ: apps/web/.dev.vars → API_UPSTREAM_URL=http://127.0.0.1:8787
pnpm --filter @edinet/web dev
```

- [ ] `curl -H "X-Internal-Api-Key: ..." http://127.0.0.1:8787/api/metrics?limit=3` で `total` ~3900
- [ ] http://localhost:3000/screener で指標列に数値

### Phase 3: 本番デプロイ URL

```bash
pnpm deploy:api:production
pnpm deploy:web:production
# または: gh workflow run deploy.yml -f env=production
```

- [ ] 本番 Web `/screener` で ~3900 社・指標列に数値

### KV キャッシュ更新

backfill 後、KV に古いスナップショットが残っている場合は削除する（次回リクエストで自動再生成）。

```bash
pnpm exec wrangler kv key delete "screener:metrics:v2" \
  --namespace-id "<KV_PRODUCTION_ID>"
```

- [ ] daily-refresh または手動削除後、`/api/metrics?limit=1` で `generatedAt` が更新されていることを確認

---

## リリース

- [ ] ブラウザ確認がすべて通ったら git commit / PR を作成（PR1: Phase A、PR2: Phase B、PR3: Phase D、PR4: Phase C、PR5: Phase E の分割推奨）

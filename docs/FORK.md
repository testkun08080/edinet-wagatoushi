# フォーク・クローン利用者ガイド

このリポジトリをフォークして自分の Cloudflare アカウントで動かす手順です。**API キーは自動生成しません。** サンプルをコピーして、自分で値を決めて設定してください。

## 1. ローカルで UI を確認

サンプルキー `dev-local-key` は **開発専用** です（本番では使わない）。

```bash
# サンプルをコピー（任意 — compose でも自動コピーされます）
cp apps/api/.dev.vars.example apps/api/.dev.vars
cp apps/web/.dev.vars.example apps/web/.dev.vars

docker compose -f infra/compose.yml up
# → http://localhost:3000
```

ホストで `pnpm dev` する場合は `wrangler.*` もコピー:

```bash
cp apps/api/wrangler.toml.template apps/api/wrangler.toml
cp apps/web/wrangler.jsonc.template apps/web/wrangler.jsonc
pnpm dev
```

## 2. Cloudflare リソースの作成

```bash
pnpm install
npx wrangler login
bash infra/setup-fork.sh
```

`setup-fork.sh` が行うこと:

- D1 / KV / R2 の作成（既存があれば再利用）
- あなたの `workers.dev` サブドメインに合わせた `wrangler.toml` / `wrangler.jsonc` の生成
- GitHub Secrets（`gh` 利用時）: D1/KV ID、`WORKERS_SUBDOMAIN` など

**行わないこと:** `INTERNAL_API_KEY` の生成・Cloudflare への自動登録

## 3. INTERNAL_API_KEY を自分で設定（本番必須）

api Worker と web Worker で **同じ値** にします。

### 手順

```bash
# 1) サンプルをコピーして、プレースホルダを自分の秘密文字列に置き換える
cp .internal-api-key.example .internal-api-key
$EDITOR .internal-api-key
# 例: my-fork-secret-8f3a...  （your-internal-api-key-change-me は使わない）

# 2) Cloudflare に登録（staging + production、api + web）
bash infra/apply-internal-api-key.sh

# 3) 任意 — GitHub に同じ値を記録（CI 用メモ。ランタイムは Worker secret）
gh secret set INTERNAL_API_KEY --body "$(grep -v '^#' .internal-api-key | head -1)"
```

### 1 環境だけ手動で登録する場合

```bash
# staging の例（production も同様に --env production）
printf '%s' 'あなたの秘密文字列' | (cd apps/api && wrangler secret put INTERNAL_API_KEY --env staging)
printf '%s' 'あなたの秘密文字列' | (cd apps/web && wrangler secret put INTERNAL_API_KEY --env staging)
```

### 認証の流れ

```
ブラウザ → web Worker (/api/*)
         → BFF が X-Internal-Api-Key を付与
         → api Worker（不一致なら 401）
```

## 4. デプロイ

```bash
git push
```

[deploy ワークフロー](../.github/workflows/deploy.yml) が Worker をデプロイします。デプロイ**前**に手順 3 を完了してください。

## 環境ごとの設定まとめ

| 環境 | ファイル / コマンド | サンプル値 |
|------|---------------------|------------|
| ローカル | `apps/api/.dev.vars` | `INTERNAL_API_KEY=dev-local-key` |
| ローカル | `apps/web/.dev.vars` | 同上 + `API_UPSTREAM_URL=http://127.0.0.1:8787` |
| Cloudflare | `.internal-api-key` → `apply-internal-api-key.sh` | **自分で決める**（example はプレースホルダのみ） |

## GitHub Secrets（CI）

| Secret | 誰が設定するか |
|--------|----------------|
| `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` | あなた |
| `WORKERS_SUBDOMAIN` | `setup-fork.sh`（`gh`）または手動 |
| `D1_*` / `KV_*` | `setup-fork.sh`（`gh`）または手動 |
| `INTERNAL_API_KEY` | **あなた**（任意・記録用） |
| `EDINET_API_KEY` | あなた（daily-refresh 用） |

Worker URL:

```
https://edinet-api-staging.<WORKERS_SUBDOMAIN>.workers.dev
https://edinet-web-staging.<WORKERS_SUBDOMAIN>.workers.dev
```

## トラブルシュート

| 症状 | 確認 |
|------|------|
| スクリーナーが空 | `apply-internal-api-key.sh` 実行済みか、api/web でキーが同一か |
| `proxy_misconfigured` | web の Worker secret に `API_UPSTREAM_URL` / `INTERNAL_API_KEY` |
| API が 401 | キー不一致。プレースホルダ `your-internal-api-key-change-me` のままではないか |
| `apply-internal-api-key.sh` が失敗 | `.internal-api-key` を編集したか |

## 関連ドキュメント

- [infra モジュール](./modules/infra.md)
- [api モジュール](./modules/api.md)
- [web モジュール](./modules/web.md)

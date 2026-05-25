# Contributing to edinet-wagatoushi

ありがとうございます！このプロジェクトは EDINET の財務データを誰でも触れる形にすることを目指しています。

## 開発環境

| 要件 | 推奨バージョン |
|---|---|
| Node.js | 22 |
| pnpm | 9.12+ |
| uv (Python) | latest |
| Docker | 25+ |
| Cloudflare account | 無料枠で動作 |

### 初回セットアップ

```bash
git clone https://github.com/testkun08080/edinet-wagatoushi.git
cd edinet-wagatoushi
pnpm install
cd apps/wrapper && uv sync && cd ../..

# 最速で動くサンプルを起動
docker compose -f infra/compose.yml up
# http://localhost:3000
```

### 自分の Cloudflare へデプロイ

```bash
npx wrangler login
bash infra/setup-fork.sh
```

詳細は [docs/MIGRATION.md](./docs/MIGRATION.md) の「フォーク利用者の最初の 30 分」を参照。

### CI/CD で必要な Secrets / Variables

`infra/setup-fork.sh` を流すと自動セットされますが、手動で設定する場合の一覧:

| 種類 | 名前 | 用途 |
|---|---|---|
| Secret | `CLOUDFLARE_API_TOKEN` | Workers / D1 デプロイ |
| Secret | `CLOUDFLARE_ACCOUNT_ID` | 同上 |
| Secret | `EDINET_API_KEY` | EDINET 取り込みワークフロー |
| Secret | `D1_STAGING_ID` | staging D1 database id |
| Secret | `D1_PRODUCTION_ID` | production D1 database id |
| Secret | `KV_STAGING_ID` | staging KV namespace id |
| Secret | `KV_PRODUCTION_ID` | production KV namespace id |
| Variable | `PUBLIC_API_URL` | apps/web から見た API の公開 URL |

## ブランチ運用

- `main` — 常にデプロイ可能
- `feat/*`, `fix/*`, `docs/*`, `chore/*` — 機能/修正/ドキュメント/雑務
- PR は `main` 向けに作成

## コミットメッセージ

[Conventional Commits](https://www.conventionalcommits.org/) に従ってください。

```
<type>(<scope>): <subject>

[optional body]
```

- `type`: feat / fix / docs / chore / refactor / test / ci / perf
- `scope`: api / web / wrapper / db / types / infra など (任意)

例:
- `feat(api): add /api/metrics endpoint`
- `fix(web): correct ROE display when equity is 0`

## Pull Request

- 1 PR = 1 トピック
- `pnpm biome check .` と `pnpm -r typecheck` がグリーンであること
- 変更がランタイムに影響する場合は changeset を追加: `pnpm changeset`
- ユーザー体験に影響する変更は PR 説明にスクリーンショット添付

## Lint / Format

- TypeScript: [Biome](https://biomejs.dev/) — `pnpm lint:fix`
- Python: [Ruff](https://docs.astral.sh/ruff/) — `cd apps/wrapper && uv run ruff check --fix .`
- pre-commit に [lefthook](https://github.com/evilmartians/lefthook) を使用 — `pnpm lefthook install` (任意)

## テスト

```bash
pnpm turbo test                          # TypeScript
cd apps/wrapper && uv run pytest         # Python
```

## 開発を始める前のお願い

- 大きな変更は事前に Issue で議論してください
- データソース (EDINET) の利用規約を尊重してください
- 機密情報 (API キー、wrangler 上の database_id 等) をコミットに含めないでください

## Code of Conduct

[CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) に従ってください。

## 質問・サポート

- バグ報告: [Issues](https://github.com/testkun08080/edinet-wagatoushi/issues)
- 機能要望: Issue + `enhancement` label
- セキュリティ: [SECURITY.md](./SECURITY.md)

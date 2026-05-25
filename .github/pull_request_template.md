<!-- PR タイトルは Conventional Commits 形式で。例: feat(api): add /metrics endpoint -->

## Summary

<!-- 何を変えたか、なぜ変えたか (1-3 行) -->

## Scope

- [ ] `apps/web`
- [ ] `apps/api`
- [ ] `apps/wrapper`
- [ ] `packages/*`
- [ ] `infra/`
- [ ] `.github/workflows/`
- [ ] docs

## Test plan

<!-- 何を確認したか。チェックボックスで -->

- [ ] `pnpm biome check .`
- [ ] `pnpm -r typecheck`
- [ ] `pnpm turbo test`
- [ ] (該当する場合) `cd apps/wrapper && uv run pytest`
- [ ] (該当する場合) `docker compose -f infra/compose.yml up` で UI 確認

## Changeset

- [ ] ランタイムに影響する変更なので `pnpm changeset` を追加した
- [ ] ドキュメント/CI/テストのみなので不要

## Screenshots / Logs (optional)

# EDINET 1日分取得（有報・大量保有）と運用

提出日（EDINET API の `date`）が同一暦日の書類だけを取得する。既存の [edinet_corpus.sh](../scripts/download/edinet_corpus.sh) を `START_DATE=END_DATE` で呼ぶ。

## 実行場所の選び方

| 方式 | 向いている用途 |
|------|----------------|
| **ローカル / 自前サーバ** | API キーを手元だけに置きたい、成果物をそのまま NFS/S3 に載せたい |
| **GitHub Actions** | リポジトリの `EDINET_API_KEY` secret で集中管理、Artifact で短期保管 |

どちらも同じ [edinet_fetch_one_day.sh](../scripts/download/edinet_fetch_one_day.sh) を使える。

## ローカル

```bash
cd edinet-wrapper
export EDINET_API_KEY=...
# 昨日（Asia/Tokyo）の annual + large_holding
./scripts/download/edinet_fetch_one_day.sh
# 日付指定
./scripts/download/edinet_fetch_one_day.sh 2026-04-11
```

任意: `SKIP_EXISTING_COMPANIES=1`、`EDINET_REQUEST_DELAY`、`EDINET_ONE_DAY_DOC_TYPES`（カンマ区切り）はシェルのコメント参照。

### cron の例（参考）

マシンのタイムゾーンを JST に合わせたうえで、例えば毎日 2:30 JST:

```cron
30 2 * * * cd /path/to/edinet-wrapper && EDINET_API_KEY=... ./scripts/download/edinet_fetch_one_day.sh
```

## GitHub Actions

- **日次（有報・大量保有）:** [.github/workflows/edinet_fetch_one_day.yml](../../.github/workflows/edinet_fetch_one_day.yml) — `workflow_dispatch` と `schedule`（UTC `0 17 * * *` ≒ 翌 02:00 JST）
- **週次（訂正）:** [.github/workflows/edinet_fetch_amended_weekly.yml](../../.github/workflows/edinet_fetch_amended_weekly.yml) — `annual_amended` / `large_holding_amended`、月曜 JST 付近

リポジトリに `EDINET_API_KEY`（Repository secret）が必要。成果物は Artifact（7 日）。長期保管は S3 等へ別途アップロードすること。

## タイムゾーン

スクリプトの「昨日」は **TZ=Asia/Tokyo** の暦日。Actions の cron は UTC のため、ワークフロー内コメントの JST 目安と合わせて調整できる。

# Production D1 Daily Checklist

`local data-set` 由来の段階投入を、無料枠を守って毎日再開するための実行メモ。

## 0) 事前設定（固定値）

- 実行ディレクトリ: `edinet-screener`
- SQL ディレクトリ: `../edinet-wrapper/state/d1-prod-rollout-sql-20260510_203514`
- 初期上限: `MAX_D1_CHUNKS_PER_RUN=50`（安定後 `100`）

## 1) 開始前チェック（1分）

```bash
cd edinet-screener
npx wrangler d1 execute EDINET_DB --env production --remote --command "SELECT (SELECT COUNT(*) FROM documents) AS documents_count, (SELECT COUNT(*) FROM period_financials) AS period_financials_count, (SELECT COUNT(*) FROM companies) AS companies_count;"
```

- この時点の `documents_count` をメモする（開始前基準値）。

## 2) 当日の投入実行

### 初回（先頭から）

```bash
cd edinet-screener
MAX_D1_CHUNKS_PER_RUN=50 bash scripts/d1-execute-sql-dir.sh production ../edinet-wrapper/state/d1-prod-rollout-sql-20260510_203514
```

### 再開（前回の続きから）

```bash
cd edinet-screener
MAX_D1_CHUNKS_PER_RUN=50 bash scripts/d1-execute-sql-dir.sh production ../edinet-wrapper/state/d1-prod-rollout-sql-20260510_203514 <START_FROM_CHUNK>
```

例: `<START_FROM_CHUNK>` に `0051_companies_0051.sql` を指定。

## 3) 実行後チェック（1分）

```bash
cd edinet-screener
npx wrangler d1 execute EDINET_DB --env production --remote --command "SELECT (SELECT COUNT(*) FROM documents) AS documents_count, (SELECT COUNT(*) FROM period_financials) AS period_financials_count, (SELECT COUNT(*) FROM companies) AS companies_count;"
```

- `documents_count` が増えていれば当日分は正常。
- エラー終了時は、失敗チャンク名を次回の `START_FROM_CHUNK` に使う。

## 4) 当日ログ（必須）

毎回、以下をテキストで残す:

- 実行日
- `MAX_D1_CHUNKS_PER_RUN` 値
- `START_FROM_CHUNK`（再開時のみ）
- 正常終了した最終 chunk 名
- 開始前/終了後の `documents_count`
- エラー有無

## 5) 翌日に回す判断

- 30分以内に終わらせたい: `MAX_D1_CHUNKS_PER_RUN=50` 継続
- 安定している: `MAX_D1_CHUNKS_PER_RUN=100` へ引き上げ
- 失敗が出た: 上限を下げる（`20-50`）+ `START_FROM_CHUNK` 再開

## 6) 完了条件

- `d1-prod-rollout-sql-20260510_203514` の全 chunk 適用完了
- 最終件数チェックで異常なし
- 必要なら `public/data` 再生成してローカル画面確認

# ドキュメント索引（`docs/`）

迷ったときの読み順です。内容が重なるファイルは、**下表の「正本」**を優先してください。

| 読む順 | ファイル | 内容 |
|--------|----------|------|
| 1 | [PROJECT_FLOW.md](./PROJECT_FLOW.md) | EDINET 取得 → `public/data` 生成 → スクリーナー表示までの**運用フロー** |
| 2 | [DATA_PIPELINE_AND_CALCULATIONS.md](./DATA_PIPELINE_AND_CALCULATIONS.md) | パーサ、指標の算出、フロントの表示換算、**`fetch` する JSON** など**実装準拠の正本** |
| 3 | [METRICS_UI_AND_DB_GAP.md](./METRICS_UI_AND_DB_GAP.md) | 列 ID・表示名・`company_metrics` キー・**DB にあって UI に出ないもの**の対応表 |
| — | [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) | リポジトリ直下のディレクトリ要約（入口） |
| — | [DATA_SET_ALTERNATIVES.md](./DATA_SET_ALTERNATIVES.md) | `data-set` の置き場・配布の方針 |
| — | [D1_HYBRID_OPERATIONS.md](./D1_HYBRID_OPERATIONS.md) | SQLite/D1 取り込みと `build_public_data_from_db` |
| — | [edinet-wrapper-使い方.md](./edinet-wrapper-使い方.md) | `edinet-wrapper` のコマンドとフロント連携メモ |
| — | [EDINET指標の分類.md](./EDINET指標の分類.md) | 開示項目とメトリクス表示のマッピング整理 |
| — | [ビルドとデータ品質のプラン.md](./ビルドとデータ品質のプラン.md) | 当初の設計メモ（**一部未導入**）。現状との差は上記 METRICS / DATA_PIPELINE を正とする |
| — | [EDINET_DB_VS_SCREENER.md](./EDINET_DB_VS_SCREENER.md) | EDINET DB と **edinet-screener** の機能比較表、および **§9 現行データで実装しうるギャップ**のピックアップ |
| — | [不足データまとめ.md](./不足データまとめ.md)、[DEPLOY_PIPELINE.md](./DEPLOY_PIPELINE.md) など | 調査・デプロイ用の補助資料 |
| — | [V2_REDESIGN_PLAN.md](./V2_REDESIGN_PLAN.md) | モノレポ + Hono API + R2 への全面再設計提案（**proposal**・未着手） |

**よくある誤解の整理**: `public/data/column_manifest.json` と `companies.json` はビルドで生成されるが、**現行の `edinet-screener` は実行時にこれらを `fetch` していない**。一覧・分析の主データは `company_metrics.json` と `summaries/{secCode}.json`（必要時 `raw_tsv/...`）。列 UI は `ColumnVisibilityContext` のハードコードが実態。

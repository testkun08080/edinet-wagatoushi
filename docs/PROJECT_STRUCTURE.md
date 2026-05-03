# プロジェクト構成（要約）

このドキュメントは、重複していた構成説明を短くまとめた「入口」です。  
**ドキュメント全体の見出し**は [README.md](./README.md)（`docs/` インデックス）。データフローの運用は [PROJECT_FLOW.md](./PROJECT_FLOW.md)、コード準拠の技術詳細は [DATA_PIPELINE_AND_CALCULATIONS.md](./DATA_PIPELINE_AND_CALCULATIONS.md) を参照してください。

## 目的

- EDINET データを収集し、スクリーナーで表示できる JSON に整形する
- `edinet-wrapper` と `edinet-screener` の責務を分離して運用する

## 現在の主要ディレクトリ

```text
edinet-wagatoushi/
├── README.md
├── docs/
│   ├── README.md                      # docs インデックス
│   ├── PROJECT_FLOW.md
│   ├── PROJECT_STRUCTURE.md
│   ├── DATA_PIPELINE_AND_CALCULATIONS.md
│   ├── METRICS_UI_AND_DB_GAP.md
│   └── DATA_SET_ALTERNATIVES.md
├── data-set/                  # 大容量データ（Git 管理外）
├── edinet-wrapper/            # 取得・パース・JSON 生成
│   ├── docs/
│   └── scripts/
└── edinet-screener/           # 表示アプリ（Vike + React）
    ├── docs/
    └── public/data/
```

## 参照順

1. リポジトリ直下 `README.md`（全体の入口）
2. `docs/README.md`（`docs/` の階層と正本の案内）
3. `docs/PROJECT_FLOW.md`（取得→ビルド→表示の運用フロー）
4. `docs/DATA_PIPELINE_AND_CALCULATIONS.md`（パイプライン・指標・表示換算のコード準拠正本）
5. `docs/METRICS_UI_AND_DB_GAP.md`（列・メトリクス・DB と UI の差分）
6. `docs/DATA_SET_ALTERNATIVES.md`（data-set 運用方針）
7. `edinet-wrapper/docs/` / `edinet-screener/docs/`（各コンポーネントの詳細）

## メモ

- 過去に含まれていた「将来構成の長文案」「外部比較メモ」は、現行運用と乖離しやすいため削除しました。
- 新しい運用ルールを追加する場合は、まず `docs/PROJECT_FLOW.md` を更新し、技術的な指標・`fetch` 経路の変更は `docs/DATA_PIPELINE_AND_CALCULATIONS.md` / `docs/METRICS_UI_AND_DB_GAP.md` を更新する。このファイルは要約だけを維持します。

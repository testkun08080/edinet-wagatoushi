# プロジェクト構成（要約）

このドキュメントは、重複していた構成説明を短くまとめた「入口」です。  
詳細なデータフローと運用手順は `docs/PROJECT_FLOW.md` を正本にしています。

## 目的

- EDINET データを収集し、スクリーナーで表示できる JSON に整形する
- `edinet-wrapper` と `edinet-screener` の責務を分離して運用する

## 現在の主要ディレクトリ

```text
edinet-wagatoushi/
├── README.md
├── docs/
│   ├── PROJECT_FLOW.md
│   ├── PROJECT_STRUCTURE.md
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

1. `README.md`（全体の入口）
2. `docs/PROJECT_FLOW.md`（処理フローの詳細）
3. `docs/DATA_SET_ALTERNATIVES.md`（data-set 運用方針）
4. `edinet-wrapper/docs/` / `edinet-screener/docs/`（各コンポーネントの詳細）

## メモ

- 過去に含まれていた「将来構成の長文案」「外部比較メモ」は、現行運用と乖離しやすいため削除しました。
- 新しい運用ルールを追加する場合は、まず `docs/PROJECT_FLOW.md` を更新し、このファイルは要約だけを維持します。

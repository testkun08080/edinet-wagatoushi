# EDINET Wagatoushi

EDINET の開示データを収集・整形し、`edinet-screener` で可視化するためのリポジトリです。  
現在は **EDINET データ中心**の運用で、株価連動データ（PER/PBR の市場値ベースなど）は対象外です。

## リポジトリ構成

- `edinet-wrapper`: EDINET データ取得・TSV パース・スクリーナー用 JSON 生成
- `edinet-wrapper/sql`: D1 互換スキーマ（SQLite/D1）
- `edinet-screener`: フロントエンド（Vike + React）
- `data-set`: 元データ置き場（Git 管理外）
- `docs`: 全体ドキュメント

## 最短セットアップ

1. Python 側準備

```bash
cd edinet-wrapper
uv sync
```

1. Node 側準備

```bash
cd ../edinet-screener
npm install
```

## 基本ワークフロー

1. **データ収集**
  `edinet-wrapper` のダウンロードスクリプトまたは GitHub Actions で EDINET コーパスを取得し、`data-set/` に配置
2. **スクリーナー用データ生成**
  `edinet-wrapper` から `companies.json` / `summaries/*.json` / `company_metrics.json` を生成
  （`DATA_SOURCE=hybrid` の場合は D1 互換 DB を優先）
3. **フロント起動・ビルド**
  `edinet-screener` で `npm run dev` または `npm run build`

## よく使うコマンド

### データ生成（`edinet-wrapper`）

```bash
cd edinet-wrapper
uv run python scripts/frontend/build_screener_data.py --mode sample E00004 E03606
uv run python scripts/frontend/build_screener_data.py --mode full
uv run python scripts/frontend/build_screener_data.py --metrics_only

# D1 Hybrid: 日次取得→DB投入→品質チェック
bash scripts/pipeline/run_daily_hybrid.sh

# D1 Hybrid: DBから public/data を生成
uv run python scripts/pipeline/build_public_data_from_db.py --db_path state/edinet_pipeline.db --output ../edinet-screener/public/data
```

### フロント（`edinet-screener`）

```bash
cd edinet-screener
npm run dev
npm run build
npm run build:app
npm run d1:apply-schema:staging
```

`DATA_SET_URL` を指定すると、リモートに置いたアーカイブから `data-set` を取得してビルドできます。
`DATA_SOURCE=d1|hybrid` を指定すると、`edinet-wrapper/state/edinet_pipeline.db`（D1互換DB）を優先して `public/data` を生成します。

## ドキュメント案内

- 全体フロー: `docs/PROJECT_FLOW.md`
- 構成ガイド（重複を整理した要約）: `docs/PROJECT_STRUCTURE.md`
- data-set の運用: `docs/DATA_SET_ALTERNATIVES.md`
- EDINET API 手動検証: `docs/EDINET_API_POSTMAN.md`
- wrapper 実運用ガイド: `docs/edinet-wrapper-使い方.md`
- wrapper 詳細資料: `edinet-wrapper/docs/`
- screener 詳細資料: `edinet-screener/docs/`


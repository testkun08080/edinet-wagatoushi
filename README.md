# EDINET 財務スクリーナー

EDINETから取得した有価証券報告書等を解析・可視化する財務データシステムです。
10年分の財務データを検索・比較できるWebスクリーナーを、無料のオープンソースとして提供します。

**ライセンス: MIT**

## システム構成

```
EDINET API
  → edinet-wrapper (Python): データ取得・TSV解析・JSON生成
  → edinet-screener/public/data/ (静的JSON)
  → edinet-screener (React/Vike): Webスクリーナー（Cloudflare Workersデプロイ可）
```

データは静的JSONとして配置され、バックエンドAPIなしで動作します。

## クイックスタート

### A: Docker（最速・サンプルデータ付き）

```bash
git clone https://github.com/testkun08080/edinet-wagatoushi.git
cd edinet-wagatoushi
docker compose up
```

http://localhost:3000 でサンプルデータ付きのスクリーナーが起動します。

### B: ローカル（フロントエンドのみ）

```bash
cd edinet-screener
npm install
npm run dev
```

### C: フルセットアップ（EDINET APIキー取得〜データ生成）

1. **EDINET APIキーを取得**: https://disclosure2.edinet-fsa.go.jp/

2. **バックエンド準備**

```bash
cd edinet-wrapper
cp .env.example .env          # EDINET_API_KEY を設定
uv sync
```

3. **データ取得**

```bash
# 単一企業（テスト用）
uv run python scripts/download/download_company_10years.py --edinet_code E02144 --file_type tsv --years 1

# スクリーナー用JSON生成（サンプル）
uv run python scripts/frontend/build_screener_data.py --mode sample E02144 E02367

# 全企業分（data-set/ 内の全データから生成）
uv run python scripts/frontend/build_screener_data.py --mode full
```

4. **フロントエンド起動**

```bash
cd edinet-screener
npm run dev
```

## 環境変数

### edinet-wrapper/.env

| 変数名 | 説明 | 必須 |
|---|---|---|
| `EDINET_API_KEY` | EDINET APIキー | ✓ |
| `EDINET_REQUEST_DELAY` | APIリクエスト間隔（秒）デフォルト3.0 | |

### edinet-screener/.env（オプション）

| 変数名 | 説明 |
|---|---|
| `PUBLIC_ENV__SITE_URL` | デプロイ先URL（OGP/canonical用） |
| `PUBLIC_ENV__GOOGLE_ANALYTICS` | Google Analytics測定ID |
| `PUBLIC_ENV__SENTRY_DSN` | Sentry DSN |

`.env.example` をコピーして設定してください。

## Cloudflareデプロイ（オプション）

```bash
cd edinet-screener
npm run build
npm run deploy
```

デプロイ前に `wrangler.jsonc` の `YOUR_D1_*_DATABASE_ID` を実際のD1データベースIDに置き換えてください。

## リポジトリ構成

```
edinet-wrapper/          # Python: データ取得・解析
  config/screener_columns.json   # カラム定義（バックエンド・フロント共通）
  scripts/frontend/              # JSON生成スクリプト
  scripts/download/              # EDINETダウンロード
edinet-screener/         # React/Vike: Webスクリーナー
  public/data/           # 生成済みJSON（サンプル付き）
  components/            # Reactコンポーネント
  pages/                 # Vikeルート
docs/                    # 技術ドキュメント
docker-compose.yml       # Docker起動（フロントのみ）
```

## ドキュメント

- [データパイプラインと計算ロジック](docs/DATA_PIPELINE_AND_CALCULATIONS.md)
- [edinet-wrapper 使い方ガイド](docs/EDINET_WRAPPER_USAGE_GUIDE.md)
- [EDINET指標の分類](docs/EDINET_METRICS_CLASSIFICATION.md)
- [データセット代替案](docs/DATA_SET_ALTERNATIVES.md)
- [プロジェクト全体フロー](docs/PROJECT_FLOW.md)

## コントリビューション

IssueやPull Requestを歓迎します。

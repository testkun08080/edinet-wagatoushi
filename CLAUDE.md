# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

EDINETから有価証券報告書等を取得・解析し、Webスクリーナーで可視化する財務データシステム。

- **edinet-wrapper** (Python): EDINETからデータ取得・TSV解析・JSON生成
- **edinet-screener** (React/Vike): 財務データのWebスクリーナー（Cloudflare Workersデプロイ）

## 開発コマンド

### Backend (edinet-wrapper)

```bash
cd edinet-wrapper
uv sync                                      # 依存関係インストール

# データ取得 (要: .envにEDINET_API_KEY)
uv run python scripts/download/download_company_10years.py --edinet_code E02144 --file_type tsv --years 1

# スクリーナー用JSON生成
uv run python scripts/frontend/build_screener_data.py --mode sample E00004 E03606  # サンプル
uv run python scripts/frontend/build_screener_data.py --mode full                   # 全社
uv run python scripts/frontend/build_screener_data.py --metrics_only               # メトリクスのみ再生成
```

### Frontend (edinet-screener)

```bash
cd edinet-screener
npm install

npm run dev          # 開発サーバー起動
npm run build        # データ生成 + ビルド (data-set/ が必要)
npm run build:app    # ビルドのみ (データ生成スキップ)
npm run preview      # プロダクションビルドのプレビュー
npm run lint         # ESLint
npm run deploy       # Cloudflare Workersへデプロイ
```

## アーキテクチャ

### データフロー

```
EDINET API
  → edinet-wrapper (Downloader → Parser → build_screener_data.py)
  → edinet-screener/public/data/ (companies.json, summaries/{secCode}.json, company_metrics.json)
  → edinet-screener (Vike SSR + React)
```

データは静的JSONとして配置され、バックエンドAPIなしで動作する。`data-set/` はGit管理外（S3/GitHub Releases/Hugging Faceでのホスティングも対応）。

### edinet-wrapper の構造

- `src/edinet_wrapper/downloader.py` - EDINET API クライアント（リトライ付き）
- `src/edinet_wrapper/parser.py` - TSV解析（BS/PL/CF）
- `src/edinet_wrapper/schema.py` - データモデル（`FinancialData`, `Response`, `Result`）
- `config/screener_columns.json` - フロントエンド向けカラム定義

### edinet-screener の構造

**Vikeのファイルシステムルーティング**:
- `+Page.tsx` - ルートのReactコンポーネント
- `+data.ts` - サーバーサイドデータローダー（SSR）
- `+config.ts` - ルートメタデータ
- `+Layout.tsx` / `+Head.tsx` - レイアウト・ヘッド

**主要ルート**:
- `pages/index/` - ホーム（スクリーナーテーブル）
- `pages/analyze/@secCode/` - 企業詳細分析

**グローバル状態（React Context）**:
- `ColumnVisibilityContext` - テーブルカラム表示切替
- `FavoritesContext` - お気に入り企業（localStorage）
- `FilterContext` - フィルタ状態
- `RecentCompaniesContext` - 閲覧履歴

**UIコンポーネント**:
- `components/ui/` - shadcn/ui（Radix UIベース、32コンポーネント）
- `components/CompanyTable.tsx` - メインスクリーナーテーブル
- `components/SummaryCharts.tsx` - 財務チャート（Recharts）

**パスエイリアス**: `@` → プロジェクトルート（`vite.config.ts`で設定）

### 出力JSONの構造

| ファイル | 内容 |
|---|---|
| `companies.json` | `{ companies: { secCode, edinetCode, name, ... }[] }` |
| `summaries/{secCode}.json` | 時系列財務データ（BS/PL/CF） |
| `company_metrics.json` | テーブル表示用の非正規化メトリクス |
| `column_manifest.json` | カラムメタデータ（screener_columns.jsonのコピー） |

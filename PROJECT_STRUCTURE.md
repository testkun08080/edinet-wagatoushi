# プロジェクト構成とゴール

## ゴール

1. **edinet2dataset のラッパー**でデータ取得を行う
2. 取得したデータを**フロントエンドで表示**し、ユーザーがわかりやすく操作できるようにする
3. （後回し）Google ログインでユーザー認証し、お気に入り銘柄の登録を可能にする

---

## サブモジュールの指し先（重要）

SakanaAI には **2 種類のリポジトリ**があります。

| リポジトリ         | URL                                        | 内容                                                                         | 本プロジェクトで使う    |
| ------------------ | ------------------------------------------ | ---------------------------------------------------------------------------- | ----------------------- |
| **edinet2dataset** | https://github.com/SakanaAI/edinet2dataset | データセット**構築**用。Downloader・Parser（`src/edinet2dataset/`）          | ✅ **こちらを使用**     |
| **EDINET-Bench**   | https://github.com/SakanaAI/EDINET-Bench   | ベンチマーク**評価**用（`src/edinet_bench/`）。Downloader・Parser は含まない | ❌ データ取得には不向き |

- **現状**: `.gitmodules` は `EDINET-Bench` を指しているため、ラッパーが期待する `edinet2dataset.parser` / `edinet2dataset.downloader` が存在しない。
- **対応**: サブモジュールの URL を **edinet2dataset（構築用リポジトリ）** に変更する必要がある（後述「サブモジュールの切り替え」参照）。

**edinet2dataset_old は使わない方針**で、サブモジュールで指定した **edinet2dataset** に統一する。

---

## データの流れ（方針）

- **ユーザー指定のたびにバックエンドで取得する運用はしない。**
- **事前にスクリプトで取得・パース**し、**ファイル（または DB）に保存**する。
- フロントは **その保存済みデータを参照する API / 静的ファイル** 経由でのみ利用する。

```
[ データ取得 ]  edinet-wrapper のスクリプト（定期 or 手動）
       ↓
[ 保存 ]  JSON / TSV / SQLite など（検索・絞り込み用に整形）
       ↓
[ 提供 ]  API または 静的 JSON + CDN
       ↓
[ 表示・操作 ]  edinet-screener（フロント）
```

---

## 検索・絞り込み特化のデータセット + フロントの構成例

「事前に用意したデータセットを、フロントから検索・絞り込みして表示・分析する」場合のよくある構造を整理する。

### 1. 静的 JSON + クライアント側検索（バックエンドなし）

- **構成**: ビルド時に検索用インデックス（JSON）を生成 → CDN/静的ホストで配信 → フロントで JavaScript が検索・フィルタ。
- **事例・ツール**:
  - [Pagefind](https://pagefind.app/) … 静的サイト向け。インデックスを生成し、帯域を抑えた検索。
  - [Lunr.js](https://lunrjs.com/) … クライアント側全文検索。静的 JSON を一度取得しブラウザで検索。
  - [FrontSearch.js](https://frontsearch.js.org/) … 単一の JSON を CDN に置き、フィルタ検索のみで使う構成。
- **向き**: データ量が中程度まで、検索・フィルタが主で、リアルタイム集計が不要な場合。

### 2. REST API + クエリパラメータ（フィルタ・ソート・ページネーション）

- **構成**: 事前集計済みデータを DB やファイルに格納し、薄い API が `?q=...&industry=...&sort=...&page=...` で返す。
- **事例**:
  - [REST API Design: Filtering, Sorting, and Pagination](https://www.moesif.com/blog/technical/api-design/REST-API-Design-Filtering-Sorting-and-Pagination/)
  - フィルタ例: `GET /companies?industry=輸送用機器&year=2024`
  - ソート例: `sort=+name,-revenue`
  - ページ: `page=1&pagesize=20`
- **向き**: 業種・年度・銘柄などで絞り込みたい、表ソート・ページングが必要な場合。

### 3. 金融系 API の構成例（事前集計データの提供）

- **構成**: 財務データをカテゴリ別にエンドポイント分割し、クエリで期間・銘柄などを指定。
- **事例**:
  - [Financial Datasets API](https://docs.financialdatasets.ai/) … 財務諸表・株価等を REST で提供。`ticker`, `period`, `limit` 等でフィルタ。
  - [Financial Modeling Prep](https://site.financialmodelingprep.com/developer/docs/dashboard) … ダッシュボード用に事前集計されたデータを API で提供。
- **共通点**: エンドポイントを「財務諸表」「銘柄一覧」「業種別」などに分け、クエリパラメータで絞り込み。

### 4. 本プロジェクト向けの推奨イメージ

- **データ層**
  - edinet-wrapper のスクリプトで取得・パースした結果を、**検索・絞り込みしやすい形**で保存する。
    - 例: 銘柄マスタ（EDINET コード・会社名・業種）、年度別サマリ（BS/PL/CF の主要項目）、業種一覧など。
  - 保存形式の例: `data/companies.json`, `data/summaries/{edinet_code}.json`, `data/industries.json` など。または SQLite で 1DB にまとめる。
- **提供層**
  - **Option A**: 上記ファイルをそのまま静的配置（Vike/Cloudflare 等）し、フロントから `fetch('/data/companies.json')` のように取得。絞り込み・検索はフロント（または Lunr 等）で実施。
  - **Option B**: 軽量 API（Cloudflare Workers / Vike の API ルート等）を用意し、`/api/companies?industry=...&q=...` のようにクエリで返す。中身は上記ファイルまたは SQLite を読むだけ。
- **フロント**
  - 企業名・EDINET コード検索、業種フィルタ、年度選択、BS/PL/CF 表示、年度比較、CSV エクスポートなどを実装。
  - ログイン・お気に入り銘柄は **全機能が一通りできたあと** に実装する想定。

---

## リポジトリ構成（目標）

```
edinet-wagatoushi/
├── edinet2dataset/          # サブモジュール（SakanaAI/edinet2dataset = 構築用）
│   ├── src/edinet2dataset/ # Downloader, Parser
│   ├── data/                # 取得した TSV 等（またはラッパー側に寄せる）
│   └── pyproject.toml
│
├── edinet-wrapper/          # ラッパー + データ取得スクリプト
│   ├── src/edinet_wrapper/  # edinet2dataset の再エクスポート
│   ├── scripts/             # ダウンロード・パース・データセット生成
│   └── （必要なら）data/ or 共通 data ディレクトリ
│
├── edinet-screener/         # フロント（Vike + React）
│   └── 表示・検索・絞り込み・（将来）ログイン・お気に入り
│
├── （Option B の場合）API 用のルート or Workers
└── PROJECT_STRUCTURE.md     # 本ドキュメント
```

- **edinet2dataset_old は使わない**。サブモジュールの **edinet2dataset** に統一する。

---

## サブモジュールの切り替え（edinet2dataset 構築用へ）

現在のサブモジュールは **EDINET-Bench** を指しています。**edinet2dataset（構築用）** に切り替える手順です。

```bash
# 1. 既存サブモジュールを削除（edinet2dataset ディレクトリは残る）
git submodule deinit -f edinet2dataset
git rm -f edinet2dataset  # パスだけ削除し、中身は残る場合あり

# 2. 構築用リポジトリをサブモジュールとして追加
git submodule add https://github.com/SakanaAI/edinet2dataset edinet2dataset

# 3. 初期化・取得
git submodule update --init --recursive
```

`.gitmodules` は次のようになります。

```ini
[submodule "edinet2dataset"]
	path = edinet2dataset
	url = https://github.com/SakanaAI/edinet2dataset
```

切り替え後は、edinet-wrapper の依存は `pip install -e ../edinet2dataset` で **このサブモジュール** を参照すればよい。

---

## 実装の優先順位（認識の共有）

1. ~~サブモジュールを **edinet2dataset（構築用）** に切り替え、edinet-wrapper がそのまま動くか確認する。~~ ✅ 完了
2. データ取得・パースのスクリプトで、**検索・絞り込み用のデータセット**（銘柄一覧・業種・年度別サマリ等）を出力する形に整える。
3. そのデータを **静的ファイル or 薄い API** でフロントに提供する。
4. フロントで **企業検索・業種絞り込み・BS/PL/CF 表示・年度比較・CSV 出力** を実装する。
5. 一通りできたあとに **Google ログインとお気に入り銘柄** を追加する。

---

## 次のステップ（チェックリスト）

### Step 2 の前: 動作確認（任意だが推奨）

- [ ] `cd edinet-wrapper && pip install -e ../edinet2dataset && pip install -e .`
- [ ] `python scripts/test_import.py` または `python scripts/example_usage.py` でラッパーが動くことを確認

### Step 2: 検索・絞り込み用データセットの生成

- [ ] **銘柄マスタ**を出力するスクリプト（EDINET コード・会社名・業種）→ 例: `data/companies.json`
- [ ] **業種一覧**を出力（マスタから抽出 or 別ソース）→ 例: `data/industries.json`
- [ ] **年度別サマリ**（BS/PL/CF 主要項目）を銘柄ごと or 一括で出力 → 例: `data/summaries/*.json` または 1 ファイル
- [ ] 上記の出力先を **edinet-screener から参照できる場所**（例: `edinet-screener/public/data/` や 共通 `data/`）に決める

### Step 3: データの提供方法を決める

- [ ] **Option A**: 静的 JSON を `edinet-screener` の public 等に配置し、`fetch('/data/...')` で取得
- [ ] **Option B**: Vike の API ルート or Cloudflare Functions で薄い API（`/api/companies?q=...`）を用意
- [ ] 選んだ方式に合わせて、Step 2 の出力先とフロントの取得パスを揃える

### Step 4: フロント実装

- [ ] 企業名・EDINET コードでの検索 UI
- [ ] 業種での絞り込み
- [ ] 年度選択
- [ ] BS/PL/CF の表示（表形式）
- [ ] 年度比較表示
- [ ] CSV エクスポート

### Step 5: 後回し

- [ ] Google ログイン
- [ ] お気に入り銘柄の登録・一覧

---

## 参照リンク

- [SakanaAI/edinet2dataset](https://github.com/SakanaAI/edinet2dataset)（データセット構築）
- [SakanaAI/EDINET-Bench](https://github.com/SakanaAI/EDINET-Bench)（ベンチマーク評価・本プロジェクトのデータ取得では未使用）
- [REST API Design: Filtering, Sorting, and Pagination](https://www.moesif.com/blog/technical/api-design/REST-API-Design-Filtering-Sorting-and-Pagination/)
- [Pagefind - Static search](https://pagefind.app/)
- [Lunr.js](https://lunrjs.com/)

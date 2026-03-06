# サンプルデータ作成コマンド

EDINET Screener 用のサンプルデータ（`companies.json` / `summaries/*.json`）を生成するコマンド集です。

## 前提

- `edinet-wrapper` で `uv run` が利用できること
- fetch_33_companies: `data-set/` に既存データが必要（ダウンロードは行わない）
- 既存 data-set から生成する場合: `data-set/` に EDINET コーパス（TSV + JSON）が配置されていること

**ビルド時の自動生成**: `edinet-screener` で `npm run build` を実行すると、プロジェクトルートに `data-set/` がある場合のみ `scripts/generate-data.sh` が走り、`fetch_33_companies.py` で `public/data` を生成してから Vike ビルドします。

---

## 0. サンプル vs 全件

- **サンプル（少数社）**: `uv run python scripts/build_screener_data.py --mode sample` … デフォルト11社 or 引数で EDINET コード指定
- **全件**: `uv run python scripts/build_screener_data.py --mode full` … data-set 内の全 EDINET コードを走査して一括生成

---

## 0b. 6社サンプルでスクリーナー用データを生成（推奨・2024）

data-set に 2024 年分の**大量報告書・四半期・有価証券・半期**の4種が揃っている場合、その4種すべてがある企業から 6 社を選び、その 6 社分だけで `public/data` を生成できます。

```bash
cd edinet-wrapper

# 4種すべてある企業から6社を選び、サンプルコーパスをリポジトリルートにコピー（edinet_corpus-quarterly-2024 等）
uv run python scripts/create_corpus_sample.py --auto_pick --year 2024

# 選ばれた6社の EDINET コードでスクリーナー用データを生成（sample_auto_pick_2024.json のコードを使用）
uv run python scripts/build_screener_data.py --mode sample --data_set ../data-set --output ../edinet-screener/public/data --list scripts/sample_auto_pick_2024.json
```

`sample_auto_pick_2024.json` に保存されたコードをそのまま使う場合（例: 6社が E00007, E00008, E00011, E00012, E00014, E00015 のとき）は上記の通り。別の6社の場合は、JSON を開いて `edinetCode` を並べたファイルを `--list` で指定するか、`build_screener_data.py --mode sample E00007 E00008 ...` で渡してください。

---

## 1. 固定33社を一括生成

```bash
cd edinet-wrapper
uv run python scripts/fetch_33_companies.py
```

- **対象**: プロジェクトルートの `data-set/` 内、`quarterly/` 配下の四半期報告書（TSV+JSON）が揃っている企業を、データ数の多い順に33社ピックアップ（6社サンプルでよい場合は上記「0. 6社サンプル」を使用）
- **処理内容**: `build_screener_data.py --mode full` または `--mode sample` で `edinet-screener/public/data/` に出力
- **ダウンロード**: なし（data-set に既にあるデータのみ使用）
- **出力**: `scripts/company_list_33.json` に今回ピックアップした33社を保存

---

## 2. 1社だけ追加・上書き

```bash
cd edinet-wrapper
uv run python scripts/build_screener_data.py --mode sample E00004
```

- **E00004**: カネコ種苗（13760）
- 出力: `edinet-screener/public/data/companies.json`（1社のみ）, `summaries/13760.json`, `company_metrics.json`
- metrics だけ再生成する場合: `uv run python scripts/build_screener_data.py --metrics_only`

---

## 3. 複数社を一括で生成

```bash
cd edinet-wrapper
uv run python scripts/build_screener_data.py --mode sample E00004 E03606 E05070
```

- **E00004**: カネコ種苗（13760）
- **E03606**: 三菱UFJFG（8306）
- **E05070**: ダイサン（47500）など

カンマ区切りでも指定可能:
```bash
uv run python scripts/build_screener_data.py --mode sample --edinet_codes E00004,E03606,E05070,E03673,E03576
```

---

## 4. data-set / 出力先を指定

```bash
cd edinet-wrapper
uv run python scripts/build_screener_data.py --mode sample \
  --data_set ../data-set \
  --output ../edinet-screener/public/data \
  E00004 E03606 E02843 E03614 E03634
```

---

## 5. data-set に存在する EDINET コードの例

`edinet_corpus-quarterly-2020` に含まれる主なコード例:

| EDINETコード | 企業名（例） | 証券コード |
|-------------|-------------|-----------|
| E00004 | カネコ種苗 | 13760 |
| E03606 | 三菱UFJFG | 83060 |
| E05070 | ダイサン | 4750 |
| E02843 | ファンコム | 6752 |
| E03614 | 三菱商事 | 8058 |
| E03634 | 三井物産 | 8031 |
| E03673 | 伊藤忠商事 | 8001 |
| E03576 | 三菱商事 | 8058 |
| E06141 | キーエンス | 6861 |

※ 実際の企業名・証券コードは JSON メタデータを参照してください。

---

## 6. サンプル用おすすめコマンド

```bash
# 5社分をサンプル作成
cd edinet-wrapper
uv run python scripts/build_screener_data.py --mode sample \
  E00004 E03606 E05070 E02843 E03614
```

作成後、`npm run dev` で起動し `http://localhost:3000` で確認できます。

---

## 7. company_metrics.json のみ再生成

既存の `summaries/*.json` からテーブル用の `company_metrics.json` を生成・更新:

```bash
cd edinet-wrapper
uv run python scripts/build_screener_data.py --metrics_only
```

1社のみ追加したあと metrics だけ更新したい場合に有効です。

---

## 8. プリセットされたサンプル企業（2024年追加）

`public/data/` には以下のサンプル企業がプリセットされています:

| EDINETコード | 企業名 | 証券コード |
|-------------|--------|-----------|
| E02367 | 任天堂 | 7974 |
| E04396 | カプコン | 9697 |
| E00464 | 川崎重工業 | 7012 |
| E02005 | 三菱商事 | 8058 |
| E02608 | 楽天グループ | 4755 |

※ これらはサンプル用の架空データを含みます。実データが必要な場合は `edinet-wrapper` のスクリプトで data-set から生成してください。

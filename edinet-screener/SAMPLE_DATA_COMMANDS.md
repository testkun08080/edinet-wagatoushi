# サンプルデータ作成コマンド

EDINET Screener 用のサンプルデータ（`companies.json` / `summaries/*.json`）を生成するコマンド集です。

## 前提

- `edinet-wrapper` で `uv run` が利用できること
- fetch_33_companies: `data-set/` に既存データが必要（ダウンロードは行わない）
- 既存 data-set から生成する場合: `data-set/` に EDINET コーパス（TSV + JSON）が配置されていること

**ビルド時の自動生成**: `edinet-screener` で `npm run build` を実行すると、プロジェクトルートに `data-set/` がある場合のみ `scripts/generate-data.sh` が走り、`fetch_33_companies.py` で `public/data` を生成してから Vike ビルドします。

---

## 0. 固定33社を一括生成（推奨）

```bash
cd edinet-wrapper
uv run python scripts/fetch_33_companies.py
```

- **対象**: プロジェクトルートの `data-set/` 内、`quarterly/` 配下の四半期報告書（TSV+JSON）が揃っている企業を、データ数の多い順に33社ピックアップ
- **処理内容**: `prepare_sample_companies` で `edinet-screener/public/data/` に出力
- **ダウンロード**: なし（data-set に既にあるデータのみ使用）
- **出力**: `scripts/company_list_33.json` に今回ピックアップした33社を保存

---

## 1. 1社だけ追加・上書き

```bash
cd edinet-wrapper
uv run python scripts/prepare_sample_company.py --edinet_code E00004
```

- **E00004**: カネコ種苗（13760）
- 出力: `edinet-screener/public/data/companies.json`（1社のみ）, `summaries/13760.json`
- テーブル表示には `company_metrics.json` が必要。1社のみの場合は `build_company_metrics.py` を実行:
  ```bash
  uv run python scripts/build_company_metrics.py
  ```

---

## 2. 複数社を一括で生成（推奨）

```bash
cd edinet-wrapper
uv run python scripts/prepare_sample_companies.py E00004 E03606 E05070
```

- **E00004**: カネコ種苗（13760）
- **E03606**: 三菱UFJFG（8306）
- **E05070**: ダイサン（47500）など

カンマ区切りでも指定可能:
```bash
uv run python scripts/prepare_sample_companies.py --edinet_codes E00004,E03606,E05070,E03673,E03576
```

---

## 3. data-set / 出力先を指定

```bash
cd edinet-wrapper
uv run python scripts/prepare_sample_companies.py \
  --data_set ../data-set \
  --output ../edinet-screener/public/data \
  E00004 E03606 E02843 E03614 E03634
```

---

## 4. data-set に存在する EDINET コードの例

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

## 5. サンプル用おすすめコマンド

```bash
# 5社分をサンプル作成
cd edinet-wrapper
uv run python scripts/prepare_sample_companies.py \
  E00004 E03606 E05070 E02843 E03614
```

作成後、`npm run dev` で起動し `http://localhost:3000` で確認できます。

---

## 6. company_metrics.json のみ再生成

既存の `summaries/*.json` からテーブル用の `company_metrics.json` を生成・更新:

```bash
cd edinet-wrapper
uv run python scripts/build_company_metrics.py
```

`prepare_sample_company.py` で1社のみ追加した場合などに有効です。

---

## 7. プリセットされたサンプル企業（2024年追加）

`public/data/` には以下のサンプル企業がプリセットされています:

| EDINETコード | 企業名 | 証券コード |
|-------------|--------|-----------|
| E02367 | 任天堂 | 7974 |
| E04396 | カプコン | 9697 |
| E00464 | 川崎重工業 | 7012 |
| E02005 | 三菱商事 | 8058 |
| E02608 | 楽天グループ | 4755 |

※ これらはサンプル用の架空データを含みます。実データが必要な場合は `edinet-wrapper` のスクリプトで data-set から生成してください。

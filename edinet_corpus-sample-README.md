# 四半期・半期コーパス サンプル（2024）

リポジトリルートの次の2ディレクトリは、**サンプル用**の四半期報告書・半期報告書コーパスです。

- **`edinet_corpus-quarterly-2024`** … 四半期報告書（6社分）
- **`edinet_corpus-semiannual-2024`** … 半期報告書（6社分）

## 作成方法

`data-set` に 2024 年分の次の4種が用意されている前提です。

- `edinet_corpus-large_holding-2024` … 大量報告書（large_holding/E?????/）
- `edinet_corpus-quarterly-2024` … 四半期報告書（quarterly / quarterly 2 … 配下）
- `edinet_corpus-annual-2024` … 有価証券報告書（annual/E?????/）
- `edinet_corpus-semiannual-2024` … 半期報告書（semiannual/E?????/ または zip 内）

```bash
cd edinet-wrapper

# 4種すべて（大量・四半期・有価証券・半期）に存在する企業から 6 社を選びサンプル作成（推奨）
uv run python scripts/create_corpus_sample.py --auto_pick --year 2024

# 四半期・半期の両方に存在する企業のみから 6 社選ぶ（4種が揃っていない場合の従来オプション）
uv run python scripts/create_corpus_sample.py --auto_pick --year 2024 --auto_pick_both
```

**6社の選び方**: 大量報告書・四半期・有価証券報告書・半期の**4種がすべてある企業**のみを対象に、その共通集合から 6 社を選びます。4種の共通が空の場合は、有価証券＋四半期＋半期の3種で従来どおり選びます。

ピックアップした6社の EDINET コードは  
`edinet-wrapper/scripts/sample_auto_pick_2024.json` に保存されます。

## ディレクトリ構成

- `edinet_corpus-quarterly-2024/quarterly/E?????/` … 各社の TSV・JSON・PDF
- `edinet_corpus-semiannual-2024/semiannual/E?????/` … 各社の TSV・JSON・PDF

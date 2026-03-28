# edinet-wrapper セットアップ（簡易版）

このページは最小手順だけを記載しています。  
全体の入口はリポジトリルートの `README.md`、wrapper の詳細は `edinet-wrapper/README.md` を参照してください。

## 前提

- `uv` が使えること
- 実行ディレクトリは `edinet-wrapper`

## 最短セットアップ

```bash
cd edinet-wrapper
uv sync
```

## 動作確認

```bash
uv run python scripts/test_import.py
uv run python scripts/example_usage.py
```

## よく使う実行例

```bash
# 1社のサンプルデータを生成
uv run python scripts/frontend/build_screener_data.py --mode sample E00004

# company_metrics のみ再生成
uv run python scripts/frontend/build_screener_data.py --metrics_only
```

## 補足

- `EDINET_API_KEY` を使うスクリプトは、`edinet-wrapper/.env` に設定します。
- `data-set` 運用は `docs/DATA_SET_ALTERNATIVES.md` を参照してください。

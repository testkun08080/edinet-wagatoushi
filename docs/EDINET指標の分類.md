# EDINET 由来データの分類（このリポジトリ）

`edinet-wrapper/scripts/frontend/build_screener_data.py` の `summary_to_metrics_row` とフロント（`company_metrics.json` / `screener_columns.json`）の前提で整理しています。**リアルタイムの株価 API は使いません。**

---

## 補完ロジック（最新）

- **業績・BS・CF**は原則 **最新期**（`periods[-1]`）の `summary` / `pl` / `bs` / `cf` から取得。
- **株価連動の開示項目**（PER・ROE・BPS・配当性向・DPS 系）は、**最新期の summary に無いキーについて**、**各キーごとに新しい期から遡り**、値が入っている最初の期の値を使う（`_merge_edinet_valuation_from_older_periods`）。  
  → 四半・半期だけではサマリーに載らないが、**過去の有報などに載っている**場合に埋まる。  
  → **「計算日」は最新期のまま**なので、PER/ROE/BPS の**開示上の基準期**は最新期と**一致しない**ことがある。

---

## 1. そのまま使える（開示値をキーに格納）

| 主な用途 | JSON / キー例 | 備考 |
|----------|----------------|------|
| 一株指標 | `EPS`, `BPS`, `dilutedEPS`, `dividendPerShare` | BPS は summary「１株当たり純資産額」。上記補完あり |
| 株価連動（開示） | `PER`（株価収益率） | summary「株価収益率」を数値化。補完あり。四半のみで全期欠けると null |
| 収益性（開示） | `ROE`（自己資本利益率…） | 補完あり |
| 財務健全性（開示） | `自己資本比率` | 最新期 summary（補完対象外キー） |
| 配当 | `配当性向` | 開示の配当性向。補完キーに含む |
| 損益・BS・CF | `売上高`, `経常利益`, `当期純利益`, `純資産額`, `総資産額`, `営業CF`, `投資CF`, `財務CF`, `現金残高`, BS 一部 等 | PL の営業利益は `pl` 由来 |
| その他 | `包括利益`, `発行済株式総数`, `計算日`, `決算月` | |

---

## 2. EDINET データだけで計算できる指標（実装済み）

| 指標 | 実装 | 式・ルール |
|------|------|------------|
| 営業利益率 / 純利益率 | フロント（`CompanyTable`） | 営業利益÷売上高、当期純利益÷売上高。分母 0 や欠損は「－」 |
| ROE（算出） | `roeCalculated` | 親会社帰属当期純利益 ÷ 純資産額（**最新期**の summary / PL） |
| ROA | `roa` | 同上純利益 ÷ 総資産額 |
| 自己資本比率（算出） | `equityRatioCalculated` | 純資産額 ÷ 総資産額 |
| FCF | `fcf` | 営業 CF ＋ 投資 CF（いずれか欠ければ null） |
| 配当性向（算出） | `payoutRatioComputed` | DPS ÷ EPS。DPS÷EPS > 200% は null |
| 配当利回り | `配当利回り` | DPS ÷ (EPS×PER)。PER は開示の株価収益率。異常時は null |

---

## 3. 情報がない／EDINET だけでは逆算不能

| 指標 | 理由 |
|------|------|
| **PBR** | 株価が必要（BPS は開示から可）。**未実装のため `PBR` は常に null** |
| **時価総額** | 株価 × 株数。**未実装のため常に null** |
| **ネットキャッシュ比率**（時価比） | 時価総額が必要。**未実装** |
| **市場の配当利回り・実勢 PER** | リアル株価がないと確定できない。`配当利回り` は開示 PER ベースの参考値 |

---

## 再生成コマンド

```bash
cd edinet-wrapper
# summaries から指標だけ更新
uv run python scripts/frontend/build_screener_data.py --metrics_only
```

TSV から `summaries` ごと作り直す場合は `--mode sample` または `--mode full`。詳細は [edinet-wrapper-使い方.md](./edinet-wrapper-使い方.md) を参照。

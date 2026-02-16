#!/usr/bin/env python3
"""
既存の summaries/*.json から company_metrics.json を生成する。
prepare_sample_company.py のみ実行した場合など、company_metrics がない時に使用。

使い方:
  cd edinet-wrapper
  uv run python scripts/build_company_metrics.py
"""

from __future__ import annotations

import json
from pathlib import Path


def _parse_number(s: str | None) -> float | None:
    if s is None or s == "" or s == "－":
        return None
    try:
        return float(str(s).replace(",", ""))
    except (ValueError, TypeError):
        return None


def main() -> None:
    project_root = Path(__file__).resolve().parent.parent.parent
    data_dir = project_root / "edinet-screener" / "public" / "data"
    summaries_dir = data_dir / "summaries"

    if not summaries_dir.exists():
        raise SystemExit(f"summaries ディレクトリが見つかりません: {summaries_dir}")

    metrics_list = []
    for json_path in sorted(summaries_dir.glob("*.json")):
        with open(json_path, encoding="utf-8") as f:
            data = json.load(f)
        if not data.get("periods"):
            continue
        latest = data["periods"][-1]
        s = latest.get("summary", {})
        pl = latest.get("pl", {})
        bs = latest.get("bs", {})
        cf = latest.get("cf", {})
        per_raw = s.get("株価収益率")
        per = _parse_number(per_raw) if per_raw and per_raw != "－" else None
        period_end = latest.get("periodEnd", "")
        fiscal_month = period_end.split("-")[1] if period_end and len(period_end) >= 7 else None
        net_income = pl.get("親会社株主に帰属する当期純利益") or s.get("親会社株主に帰属する当期純利益")
        metrics_list.append(
            {
                "edinetCode": data.get("edinetCode", ""),
                "secCode": data.get("secCode", ""),
                "filerName": data.get("filerName", ""),
                "計算日": period_end,
                "決算月": fiscal_month,
                "自己資本比率": s.get("自己資本比率"),
                "EPS": s.get("１株当たり当期純利益又は当期純損失"),
                "売上高": s.get("売上高"),
                "経常利益": s.get("経常利益"),
                "当期純利益": net_income,
                "純資産額": s.get("純資産額"),
                "総資産額": s.get("総資産額"),
                "包括利益": s.get("包括利益"),
                "BPS": s.get("１株当たり純資産額"),
                "ROE": s.get("自己資本利益率、経営指標等"),
                "営業利益": pl.get("営業利益"),
                "営業CF": s.get("営業活動によるキャッシュ・フロー") or cf.get("営業キャッシュフロー"),
                "投資CF": s.get("投資活動によるキャッシュ・フロー") or cf.get("投資キャッシュフロー"),
                "財務CF": s.get("財務活動によるキャッシュ・フロー") or cf.get("財務キャッシュフロー"),
                "現金残高": s.get("現金及び現金同等物の残高") or cf.get("現金及び現金同等物"),
                "配当性向": s.get("配当性向"),
                "dividendPerShare": s.get("１株当たり配当額") or s.get("１株当たり中間配当額"),
                "発行済株式総数": s.get("発行済株式総数（普通株式）"),
                "流動資産": bs.get("流動資産"),
                "流動負債": bs.get("流動負債"),
                "負債": bs.get("負債"),
                "投資有価証券": bs.get("投資有価証券"),
                "PER": per,
                "PBR": None,
                "配当利回り": None,
            }
        )

    (data_dir / "company_metrics.json").write_text(
        json.dumps({"metrics": metrics_list}, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"✓ company_metrics.json に {len(metrics_list)} 社を出力: {data_dir}")


if __name__ == "__main__":
    main()

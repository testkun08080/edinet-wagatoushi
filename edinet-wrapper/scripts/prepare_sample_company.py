#!/usr/bin/env python3
"""
1企業分のサンプルデータを data-set から生成する。

使い方:
  cd edinet-wrapper
  uv run python scripts/prepare_sample_company.py --edinet_code E00004

出力先: edinet-screener/public/data/
  - companies.json
  - summaries/{sec_code}.json
"""

from argparse import ArgumentParser
import json
from pathlib import Path

from edinet_wrapper import parse_tsv

# 現在の報告書の値を取得するための優先順位（四半期報告書向け）
CURRENT_KEYS = ["CurrentQuarter", "CurrentYTD", "CurrentYear", "Prior1Quarter", "Prior1YTD"]


def _get_current_value(d: dict) -> str | None:
    """年度付き dict から現在期の値を取得"""
    if not isinstance(d, dict):
        return str(d) if d is not None else None
    for k in CURRENT_KEYS:
        if k in d and d[k] not in (None, ""):
            return str(d[k])
    # 最初に見つかった値を返す
    for v in d.values():
        if v not in (None, ""):
            return str(v)
    return None


def _flatten_for_period(obj: dict, prefix: str = "") -> dict:
    """ネストした dict を平坦化（表示用）"""
    out = {}
    for k, v in obj.items():
        key = f"{prefix}{k}" if prefix else k
        if isinstance(v, dict) and not any(
            kk in v
            for kk in [
                "CurrentYear",
                "Prior1Year",
                "CurrentQuarter",
                "Prior1Quarter",
                "CurrentYTD",
                "Prior1YTD",
            ]
        ):
            out.update(_flatten_for_period(v, f"{key} / "))
        else:
            val = _get_current_value(v)
            if val is not None:
                out[key] = val
    return out


def collect_tsv_paths(data_set_root: Path, edinet_code: str) -> list[tuple[Path, Path]]:
    """data-set 内で該当企業の TSV と JSON のペアを収集（期間順）"""
    pairs = []
    for tsv_path in data_set_root.rglob("*.tsv"):
        if f"/{edinet_code}/" in str(tsv_path) or f"\\{edinet_code}\\" in str(tsv_path):
            json_path = tsv_path.with_suffix(".json")
            if json_path.exists():
                pairs.append((tsv_path, json_path))

    # periodEnd でソート
    def load_period(p):
        with open(p[1], encoding="utf-8") as f:
            meta = json.load(f)
        return meta.get("periodEnd", "")

    pairs.sort(key=load_period)
    return pairs


def main():
    parser = ArgumentParser(description="1企業分のサンプルデータを生成")
    parser.add_argument(
        "--edinet_code",
        default="E00004",
        help="EDINETコード（例: E00004 = カネコ種苗）",
    )
    parser.add_argument(
        "--data_set",
        type=Path,
        default=None,
        help="data-set ルート（未指定ならプロジェクトルートの data-set）",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help="出力先（未指定なら edinet-screener/public/data）",
    )
    args = parser.parse_args()

    project_root = Path(__file__).resolve().parent.parent.parent
    data_set = args.data_set or (project_root / "data-set")
    output_dir = args.output or (project_root / "edinet-screener" / "public" / "data")

    if not data_set.exists():
        raise SystemExit(f"data-set が見つかりません: {data_set}")

    pairs = collect_tsv_paths(data_set, args.edinet_code)
    if not pairs:
        raise SystemExit(f"{args.edinet_code} の TSV が見つかりません")

    periods = []
    filer_name = ""
    sec_code = ""

    for tsv_path, json_path in pairs:
        with open(json_path, encoding="utf-8") as f:
            meta = json.load(f)
        filer_name = meta.get("filerName", "")
        sec_code = meta.get("secCode", "").lstrip("0") or meta.get("secCode", "")
        period_end = meta.get("periodEnd", "")
        period_start = meta.get("periodStart", "")
        doc_id = meta.get("docID", "")

        fd = parse_tsv(str(tsv_path))
        if fd is None:
            continue

        summary_flat = _flatten_for_period(fd.summary)
        pl_flat = _flatten_for_period(fd.pl)
        bs_flat = _flatten_for_period(fd.bs)
        cf_flat = _flatten_for_period(fd.cf)

        periods.append({
            "periodStart": period_start,
            "periodEnd": period_end,
            "docID": doc_id,
            "docDescription": meta.get("docDescription", ""),
            "submitDateTime": meta.get("submitDateTime", ""),
            "summary": summary_flat,
            "pl": pl_flat,
            "bs": bs_flat,
            "cf": cf_flat,
        })

    if not periods:
        raise SystemExit("パースできた報告書がありません（連結決算のみ対応）")

    # sec_code を4桁に正規化（証券コードの先頭0除去）
    sec_code = sec_code.lstrip("0") or sec_code

    # companies.json
    companies = {
        "companies": [
            {
                "edinetCode": args.edinet_code,
                "secCode": sec_code,
                "filerName": filer_name,
            }
        ]
    }

    # summaries/{sec_code}.json
    summary_data = {
        "edinetCode": args.edinet_code,
        "secCode": sec_code,
        "filerName": filer_name,
        "periods": periods,
    }

    output_dir.mkdir(parents=True, exist_ok=True)
    summaries_dir = output_dir / "summaries"
    summaries_dir.mkdir(exist_ok=True)

    (output_dir / "companies.json").write_text(json.dumps(companies, ensure_ascii=False, indent=2), encoding="utf-8")
    (summaries_dir / f"{sec_code}.json").write_text(
        json.dumps(summary_data, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    print(f"✓ {args.edinet_code} ({filer_name}) - {len(periods)} 期分")
    print(f"  出力: {output_dir}")
    print(f"  - companies.json")
    print(f"  - summaries/{sec_code}.json")
    print(f"\n  分析ページ: http://localhost:5173/analyze/{sec_code}")


if __name__ == "__main__":
    main()

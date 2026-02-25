#!/usr/bin/env python3
"""
複数企業分のサンプルデータを data-set から生成する。
companies.json に全企業をマージし、各企業の summaries/{sec_code}.json を出力する。

使い方:
  cd edinet-wrapper

  # 複数企業を指定（スペース区切り）
  uv run python scripts/prepare_sample_companies.py E00004 E03606 E05070

  # または --edinet_codes で指定
  uv run python scripts/prepare_sample_companies.py --edinet_codes E00004,E03606,E05070

  # data-set / 出力先を指定
  uv run python scripts/prepare_sample_companies.py --data_set ../data-set --output ../edinet-screener/public/data E00004 E03606

出力先: edinet-screener/public/data/
  - companies.json（全企業をマージ）
  - summaries/{sec_code}.json（各企業ごと）
"""

from __future__ import annotations

from argparse import ArgumentParser
import json
from pathlib import Path

from edinet_wrapper import parse_tsv

CURRENT_KEYS = ["CurrentQuarter", "CurrentYTD", "CurrentYear", "Prior1Quarter", "Prior1YTD"]


def _parse_number(s: str | None) -> float | None:
    """数値文字列を float に変換。失敗時は None。"""
    if s is None or s == "" or s == "－":
        return None
    try:
        return float(str(s).replace(",", ""))
    except (ValueError, TypeError):
        return None


def _get_current_value(d: dict) -> str | None:
    if not isinstance(d, dict):
        return str(d) if d is not None else None
    for k in CURRENT_KEYS:
        if k in d and d[k] not in (None, ""):
            return str(d[k])
    for v in d.values():
        if v not in (None, ""):
            return str(v)
    return None


def _flatten_for_period(obj: dict, prefix: str = "") -> dict:
    out = {}
    for k, v in obj.items():
        key = f"{prefix}{k}" if prefix else k
        if isinstance(v, dict) and not any(
            kk in v for kk in ["CurrentYear", "Prior1Year", "CurrentQuarter", "Prior1Quarter", "CurrentYTD", "Prior1YTD"]
        ):
            out.update(_flatten_for_period(v, f"{key} / "))
        else:
            val = _get_current_value(v)
            if val is not None:
                out[key] = val
    return out


def collect_tsv_paths(data_set_root: Path, edinet_code: str) -> list[tuple[Path, Path]]:
    pairs = []
    for tsv_path in data_set_root.rglob("*.tsv"):
        if f"/{edinet_code}/" in str(tsv_path) or f"\\{edinet_code}\\" in str(tsv_path):
            json_path = tsv_path.with_suffix(".json")
            if json_path.exists():
                pairs.append((tsv_path, json_path))

    def load_period(p):
        with open(p[1], encoding="utf-8") as f:
            meta = json.load(f)
        return meta.get("periodEnd", "")

    pairs.sort(key=load_period)
    return pairs


def process_company(data_set_root: Path, edinet_code: str) -> tuple[dict, dict] | None:
    """1企業分を処理。成功時は (company_entry, summary_data) を返す。"""
    pairs = collect_tsv_paths(data_set_root, edinet_code)
    if not pairs:
        return None

    periods = []
    filer_name = ""
    sec_code = ""

    for tsv_path, json_path in pairs:
        with open(json_path, encoding="utf-8") as f:
            meta = json.load(f)
        filer_name = meta.get("filerName") or ""
        sec_code_raw = meta.get("secCode") or ""
        sec_code = sec_code_raw.lstrip("0") or sec_code_raw
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

        periods.append(
            {
                "periodStart": period_start,
                "periodEnd": period_end,
                "docID": doc_id,
                "docDescription": meta.get("docDescription", ""),
                "submitDateTime": meta.get("submitDateTime", ""),
                "summary": summary_flat,
                "pl": pl_flat,
                "bs": bs_flat,
                "cf": cf_flat,
            }
        )

    if not periods:
        return None

    sec_code = (sec_code or "").lstrip("0") or sec_code or ""

    company_entry = {
        "edinetCode": edinet_code,
        "secCode": sec_code,
        "filerName": filer_name,
    }
    summary_data = {
        "edinetCode": edinet_code,
        "secCode": sec_code,
        "filerName": filer_name,
        "periods": periods,
    }
    return company_entry, summary_data


def main() -> None:
    parser = ArgumentParser(description="複数企業分のサンプルデータを生成")
    parser.add_argument("edinet_codes", nargs="*", help="EDINETコード（例: E00004 E03606）")
    parser.add_argument(
        "--edinet_codes",
        dest="edinet_codes_csv",
        help="EDINETコードをカンマ区切りで指定（例: E00004,E03606,E05070）",
    )
    parser.add_argument("--data_set", type=Path, default=None)
    parser.add_argument("--output", type=Path, default=None)
    args = parser.parse_args()

    codes: list[str] = list(args.edinet_codes or [])
    if args.edinet_codes_csv:
        codes.extend(c.strip() for c in args.edinet_codes_csv.split(",") if c.strip())
    codes = list(dict.fromkeys(codes))  # 重複除去

    if not codes:
        parser.error("EDINETコードを1つ以上指定してください（例: E00004 E03606）")

    project_root = Path(__file__).resolve().parent.parent.parent
    data_set = args.data_set or (project_root / "data-set")
    output_dir = args.output or (project_root / "edinet-screener" / "public" / "data")

    if not data_set.exists():
        raise SystemExit(f"data-set が見つかりません: {data_set}")

    companies_list: list[dict] = []
    metrics_list: list[dict] = []
    seen_edinet: set[str] = set()

    output_dir.mkdir(parents=True, exist_ok=True)
    summaries_dir = output_dir / "summaries"
    summaries_dir.mkdir(exist_ok=True)

    for edinet_code in codes:
        result = process_company(data_set, edinet_code)
        if result is None:
            print(f"⚠ {edinet_code} - データなし、スキップ")
            continue
        company_entry, summary_data = result
        sec_code = company_entry["secCode"]
        filer_name = company_entry["filerName"]
        n_periods = len(summary_data["periods"])

        if company_entry["edinetCode"] not in seen_edinet:
            companies_list.append(
                {"edinetCode": edinet_code, "secCode": sec_code, "filerName": filer_name}
            )
            seen_edinet.add(edinet_code)

        (summaries_dir / f"{sec_code}.json").write_text(
            json.dumps(summary_data, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        print(f"✓ {edinet_code} ({filer_name}) - {n_periods} 期分 → summaries/{sec_code}.json")

        latest = summary_data["periods"][-1]
        s = latest.get("summary", {})
        pl = latest.get("pl", {})
        bs = latest.get("bs", {})
        cf = latest.get("cf", {})
        # PER: 四半期報告書に含まれることがある
        per_raw = s.get("株価収益率")
        per = _parse_number(per_raw) if per_raw and per_raw != "－" else None
        period_end = latest.get("periodEnd", "")
        fiscal_month = period_end.split("-")[1] if period_end and len(period_end) >= 7 else None
        net_income = pl.get("親会社株主に帰属する当期純利益") or s.get("親会社株主に帰属する当期純利益")
        metrics_list.append(
            {
                "edinetCode": edinet_code,
                "secCode": sec_code,
                "filerName": filer_name,
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

    (output_dir / "companies.json").write_text(
        json.dumps({"companies": companies_list}, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (output_dir / "company_metrics.json").write_text(
        json.dumps({"metrics": metrics_list}, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    print(f"\n✓ companies.json に {len(companies_list)} 社を出力")
    print(f"✓ company_metrics.json に {len(metrics_list)} 社の指標を出力")
    print(f"  出力先: {output_dir}")
    print(f"  分析ページ例: http://localhost:3000/analyze/{companies_list[0]['secCode'] if companies_list else ''}")


if __name__ == "__main__":
    main()

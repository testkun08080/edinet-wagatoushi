#!/usr/bin/env python3
"""
フロント用データ（companies.json / summaries/*.json / company_metrics.json）を
一箇所（edinet-screener/public/data/）にまとめて生成する。

実行時に「サンプル用（少数社）」か「全件（data-set 内の全企業）」を選択できる。

使い方:
  cd edinet-wrapper

  # サンプル用（デフォルト11社 or 指定した EDINET コード）
  uv run python scripts/build_screener_data.py --mode sample
  uv run python scripts/build_screener_data.py --mode sample E00004 E03606 E05070
  uv run python scripts/build_screener_data.py --mode sample --list sample_11companies_2025.json

  # 全件（data-set 内の全 EDINET コードを走査して一括生成）
  uv run python scripts/build_screener_data.py --mode full
  uv run python scripts/build_screener_data.py --mode full --data_set ../data-set --output ../edinet-screener/public/data

  # company_metrics.json のみ再生成（既存の summaries から）
  uv run python scripts/build_screener_data.py --metrics_only

出力先: edinet-screener/public/data/
  - companies.json
  - summaries/{sec_code}.json
  - company_metrics.json
"""

from __future__ import annotations

import json
import re
from argparse import ArgumentParser
from pathlib import Path

from edinet_wrapper import parse_tsv

CURRENT_KEYS = ["CurrentQuarter", "CurrentYTD", "CurrentYear", "Prior1Quarter", "Prior1YTD"]

# サンプルモードでコード未指定時に使うデフォルトリスト（EDINET コード）
DEFAULT_SAMPLE_EDINET_CODES = [
    "E02367", "E04473", "E04908", "E01573", "E01737", "E01765", "E01766", "E01767",
    "E01925", "E02144", "E02146", "E02419", "E02619", "E02766", "E02827", "E02999",
]


def _parse_number(s: str | None) -> float | None:
    if s is None or s == "" or s == "－":
        return None
    try:
        return float(str(s).replace(",", ""))
    except (ValueError, TypeError):
        return None


def _net_cash(
    current_assets: str | None,
    investment_securities: str | None,
    liabilities: str | None,
) -> int | None:
    ca = _parse_number(current_assets)
    inv = _parse_number(investment_securities) or 0
    liab = _parse_number(liabilities)
    if ca is None or liab is None:
        return None
    try:
        return int(ca + inv * 0.7 - liab)
    except (TypeError, ValueError):
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


def summary_to_metrics_row(summary_data: dict) -> dict:
    """summary_data 1件から company_metrics の1行を生成。"""
    edinet_code = summary_data.get("edinetCode", "")
    sec_code = summary_data.get("secCode", "")
    filer_name = summary_data.get("filerName", "")
    if not summary_data.get("periods"):
        return {}
    latest = summary_data["periods"][-1]
    s = latest.get("summary", {})
    pl = latest.get("pl", {})
    bs = latest.get("bs", {})
    cf = latest.get("cf", {})
    per_raw = s.get("株価収益率")
    per = _parse_number(per_raw) if per_raw and per_raw != "－" else None
    period_end = latest.get("periodEnd", "")
    fiscal_month = period_end.split("-")[1] if period_end and len(period_end) >= 7 else None
    net_income = pl.get("親会社株主に帰属する当期純利益") or s.get("親会社株主に帰属する当期純利益")
    return {
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
        "時価総額": None,
        "ネットキャッシュ": _net_cash(bs.get("流動資産"), bs.get("投資有価証券"), bs.get("負債")),
        "ネットキャッシュ比率": None,
    }


def discover_edinet_codes(data_set_root: Path) -> list[str]:
    """data-set 内の *.tsv のパスから EDINET コード（E?????）を重複なく収集。"""
    pattern = re.compile(r"[/\\]E(\d{5})[/\\]")
    codes = set()
    for tsv_path in data_set_root.rglob("*.tsv"):
        m = pattern.search(str(tsv_path))
        if m:
            codes.add("E" + m.group(1))
    return sorted(codes)


def load_edinet_codes_from_list_file(list_path: Path) -> list[str]:
    """JSON リストファイルから edinetCode を読み取る。[{ "edinetCode": "E02367" }, ...] 形式。"""
    text = list_path.read_text(encoding="utf-8")
    data = json.loads(text)
    if isinstance(data, list):
        return [item.get("edinetCode") or item.get("edinet_code", "") for item in data if item.get("edinetCode") or item.get("edinet_code")]
    return []


def run_sample(
    data_set: Path,
    output_dir: Path,
    edinet_codes: list[str],
) -> None:
    companies_list: list[dict] = []
    metrics_list: list[dict] = []
    seen_edinet: set[str] = set()

    output_dir.mkdir(parents=True, exist_ok=True)
    summaries_dir = output_dir / "summaries"
    summaries_dir.mkdir(exist_ok=True)

    for edinet_code in edinet_codes:
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

        metrics_list.append(summary_to_metrics_row(summary_data))

    (output_dir / "companies.json").write_text(
        json.dumps({"companies": companies_list}, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (output_dir / "company_metrics.json").write_text(
        json.dumps({"metrics": metrics_list}, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    print(f"\n✓ companies.json に {len(companies_list)} 社を出力")
    print(f"✓ company_metrics.json に {len(metrics_list)} 社の指標を出力")
    print(f"  出力先: {output_dir}")
    if companies_list:
        print(f"  分析ページ例: http://localhost:3000/analyze/{companies_list[0]['secCode']}")


def run_full(data_set: Path, output_dir: Path) -> None:
    codes = discover_edinet_codes(data_set)
    if not codes:
        print("data-set 内に EDINET コード（E?????）が見つかりません。", flush=True)
        raise SystemExit(1)
    print(f"data-set 内で {len(codes)} 社を検出しました。")
    run_sample(data_set, output_dir, codes)


def run_metrics_only(output_dir: Path) -> None:
    summaries_dir = output_dir / "summaries"
    if not summaries_dir.exists():
        raise SystemExit(f"summaries ディレクトリが見つかりません: {summaries_dir}")

    metrics_list = []
    for json_path in sorted(summaries_dir.glob("*.json")):
        with open(json_path, encoding="utf-8") as f:
            data = json.load(f)
        row = summary_to_metrics_row(data)
        if row:
            metrics_list.append(row)

    (output_dir / "company_metrics.json").write_text(
        json.dumps({"metrics": metrics_list}, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"✓ company_metrics.json に {len(metrics_list)} 社を出力: {output_dir}")


def main() -> None:
    parser = ArgumentParser(
        description="フロント用データを一箇所に生成（サンプル or 全件）",
    )
    parser.add_argument(
        "edinet_codes",
        nargs="*",
        help="--mode sample 時に EDINET コードを指定（例: E00004 E03606）",
    )
    parser.add_argument(
        "--mode",
        choices=["sample", "full"],
        default="sample",
        help="sample=指定社のみ / full=data-set 内の全企業（デフォルト: sample）",
    )
    parser.add_argument(
        "--list",
        type=Path,
        default=None,
        metavar="JSON",
        help="--mode sample 時: edinetCode のリストが入った JSON ファイル（例: sample_11companies_2025.json）",
    )
    parser.add_argument(
        "--edinet_codes",
        dest="edinet_codes_csv",
        help="EDINET コードをカンマ区切りで指定（例: E00004,E03606,E05070）",
    )
    parser.add_argument("--data_set", type=Path, default=None, help="data-set のルート（未指定時はリポジトリの data-set）")
    parser.add_argument("--output", type=Path, default=None, help="出力先（未指定時は edinet-screener/public/data）")
    parser.add_argument(
        "--metrics_only",
        action="store_true",
        help="既存の summaries から company_metrics.json のみ再生成",
    )
    args = parser.parse_args()

    project_root = Path(__file__).resolve().parent.parent.parent
    data_set = args.data_set or (project_root / "data-set")
    output_dir = args.output or (project_root / "edinet-screener" / "public" / "data")

    if args.metrics_only:
        run_metrics_only(output_dir)
        return

    if not data_set.exists():
        raise SystemExit(f"data-set が見つかりません: {data_set}")

    codes: list[str] = list(args.edinet_codes or [])
    if args.edinet_codes_csv:
        codes.extend(c.strip() for c in args.edinet_codes_csv.split(",") if c.strip())
    codes = list(dict.fromkeys(codes))  # 重複除去

    if args.mode == "full":
        run_full(data_set, output_dir)
        return

    # mode == sample
    if not codes and args.list and args.list.exists():
        codes = load_edinet_codes_from_list_file(args.list)
        print(f"  --list から {len(codes)} 社を読み込みました: {args.list}")
    if not codes:
        script_dir = Path(__file__).parent
        default_list = script_dir / "sample_11companies_2025.json"
        if default_list.exists():
            codes = load_edinet_codes_from_list_file(default_list)
            print(f"  企業未指定のため {default_list.name} の {len(codes)} 社を使用します。")
        else:
            codes = DEFAULT_SAMPLE_EDINET_CODES
            print(f"  企業未指定のためデフォルト {len(codes)} 社を使用します。")
    run_sample(data_set, output_dir, codes)


if __name__ == "__main__":
    main()

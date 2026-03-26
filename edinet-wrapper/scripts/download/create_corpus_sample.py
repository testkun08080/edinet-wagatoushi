#!/usr/bin/env python3
"""
指定した証券コード／EDINETコード・年度でコーパスサンプルを作成する。
または data-set から条件に合う企業を自動で選んで四半期・半期サンプルを作成する（--auto_pick）。

使い方:
  cd edinet-wrapper

  # --- 企業を指定する場合（従来の create_corpus_sample_11companies_2025.py 相当）---
  # 年度 2025、デフォルト11社でサンプル作成
  uv run python scripts/download/create_corpus_sample.py

  uv run python scripts/download/create_corpus_sample.py --year 2024
  uv run python scripts/download/create_corpus_sample.py --sec_codes 7974 9424 7203 --year 2025
  uv run python scripts/download/create_corpus_sample.py --edinet_codes E02367 E04473 E02144
  uv run python scripts/download/create_corpus_sample.py --types annual,quarterly --year 2025

  # --- data-set から自動で企業を選ぶ場合（従来の create_corpus_sample_6companies.py 相当）---
  # 有価証券・四半期・半期（・大量保有）が揃う企業から6社を選び、四半期・半期のみコピー（出力は -sample なし）
  uv run python scripts/download/create_corpus_sample.py --auto_pick

  # 四半期・半期の両方に存在する企業のみから6社
  uv run python scripts/download/create_corpus_sample.py --auto_pick --auto_pick_both

  # 年度・社数指定
  uv run python scripts/download/create_corpus_sample.py --auto_pick --year 2024 --auto_pick_size 6
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

# 証券コード指定時デフォルトで使う社数
SAMPLE_SIZE = 11
AUTO_PICK_SIZE = 6

# 証券コード未指定時に使うデフォルト一覧
DEFAULT_SEC_CODES = [
    "7974", "9424", "9616", "6370", "6501", "6701", "6702", "6703", "6762", "6797",
    "6965", "7012", "7203", "7453", "4755", "4901", "5753", "1605", "1662", "1887",
    "2340", "2588", "3402", "3687",
]

CORPUS_TYPES = ("annual", "quarterly", "semiannual", "large_holding")


def normalize_sec_code(sec: str) -> str:
    s = (sec or "").strip().strip('"')
    s = s.lstrip("0") or s or ""
    if len(s) == 5 and s.endswith("0"):
        s = s[:-1]
    return s


def load_edinet_code_info(csv_path: Path) -> list[tuple[str, str, str]]:
    rows = []
    with open(csv_path, encoding="shift_jis", errors="replace") as f:
        reader = csv.reader(f)
        next(reader, None)
        header = next(reader, None)
        if not header:
            return rows
        try:
            idx_edinet = header.index("ＥＤＩＮＥＴコード")
            idx_sec = header.index("証券コード")
            idx_name = header.index("提出者名")
        except ValueError:
            return rows
        for row in reader:
            if len(row) <= max(idx_edinet, idx_sec, idx_name):
                continue
            edinet = (row[idx_edinet] or "").strip().strip('"')
            sec_raw = (row[idx_sec] or "").strip().strip('"')
            name = (row[idx_name] or "").strip().strip('"')
            if not edinet or not sec_raw:
                continue
            norm = normalize_sec_code(sec_raw)
            rows.append((norm, edinet, name))
    return rows


def sec_codes_to_edinet_codes(
    csv_path: Path,
    sec_codes: list[str],
    max_count: int | None = SAMPLE_SIZE,
) -> list[tuple[str, str, str]]:
    rows = load_edinet_code_info(csv_path)
    sec_to_edinet: dict[str, tuple[str, str]] = {}
    for norm, edinet, name in rows:
        if norm and norm not in sec_to_edinet:
            sec_to_edinet[norm] = (edinet, name)
    result: list[tuple[str, str, str]] = []
    for sec in sec_codes:
        if max_count is not None and len(result) >= max_count:
            break
        norm = normalize_sec_code(sec)
        if norm in sec_to_edinet:
            edinet, name = sec_to_edinet[norm]
            result.append((norm, edinet, name))
    return result


def parse_edinet_code(s: str) -> str | None:
    s = (s or "").strip().upper()
    if not s:
        return None
    if s.startswith("E") and len(s) == 6 and s[1:].isdigit():
        return s
    if len(s) == 5 and s.isdigit():
        return "E" + s
    return None


# ----- auto_pick: data-set からコード収集 -----
def get_annual_codes(data_set: Path, year: int) -> set[str]:
    annual_dir = data_set / f"edinet_corpus-annual-{year}" / "annual"
    if not annual_dir.exists():
        return set()
    return {d.name for d in annual_dir.iterdir() if d.is_dir() and re.match(r"^E\d{5}$", d.name)}


def get_quarterly_codes(data_set: Path, year: int) -> set[str]:
    base = data_set / f"edinet_corpus-quarterly-{year}"
    if not base.exists():
        return set()
    codes = set()
    for item in base.iterdir():
        if not item.is_dir() or not item.name.startswith("quarterly"):
            continue
        for sub in item.iterdir():
            if sub.is_dir() and re.match(r"^E\d{5}$", sub.name):
                codes.add(sub.name)
    return codes


def get_large_holding_codes(data_set: Path, year: int) -> set[str]:
    base = data_set / f"edinet_corpus-large_holding-{year}" / "large_holding"
    if not base.exists():
        return set()
    return {d.name for d in base.iterdir() if d.is_dir() and re.match(r"^E\d{5}$", d.name)}


def get_semiannual_codes(data_set: Path, year: int) -> set[str]:
    base = data_set / f"edinet_corpus-semiannual-{year}"
    if not base.exists():
        return set()
    codes = set()
    semiannual_dir = base / "semiannual"
    if semiannual_dir.exists():
        for d in semiannual_dir.iterdir():
            if d.is_dir() and re.match(r"^E\d{5}$", d.name):
                codes.add(d.name)
    if codes:
        return codes
    pattern = re.compile(r"semiannual/(E\d{5})/")
    for z in base.glob("*.zip"):
        out = subprocess.run(
            ["unzip", "-l", str(z)],
            capture_output=True,
            text=True,
            timeout=60,
        )
        if out.returncode != 0:
            continue
        for m in pattern.finditer(out.stdout):
            codes.add(m.group(1))
    return codes


def pick_companies(
    annual: set[str],
    quarterly: set[str],
    semiannual: set[str],
    large_holding: set[str] | None,
    size: int,
    require_both: bool,
) -> list[str]:
    """有価証券に存在し、四半期・半期の条件を満たす企業から size 社を選ぶ。"""
    if large_holding:
        common = annual & quarterly & semiannual & large_holding
        return sorted(common)[:size]
    if require_both:
        common = quarterly & semiannual
        return sorted(common)[:size]
    in_annual_and_any = annual & (quarterly | semiannual)
    both = in_annual_and_any & quarterly & semiannual
    only_quarterly = (in_annual_and_any & quarterly) - semiannual
    only_semiannual = (in_annual_and_any & semiannual) - quarterly
    ordered = sorted(both) + sorted(only_quarterly) + sorted(only_semiannual)
    return ordered[:size]


# ----- copy（sample_suffix: 通常 "-sample"、auto_pick 時は ""）-----
def copy_annual_sample(
    data_set: Path,
    out_root: Path,
    edinet_codes: list[str],
    year: int,
    sample_suffix: str = "-sample",
) -> None:
    base = data_set / f"edinet_corpus-annual-{year}"
    if not base.exists():
        print(f"  [annual] スキップ: {base} が存在しません")
        return
    out_dir = out_root / f"edinet_corpus-annual-{year}{sample_suffix}" / "annual"
    out_dir.mkdir(parents=True, exist_ok=True)
    code_set = set(edinet_codes)
    for item in sorted(base.iterdir()):
        if not item.is_dir() or item.name.startswith("edinet_corpus") or item.name.endswith(".zip"):
            continue
        if not item.name.startswith("annual"):
            continue
        for code in code_set:
            company_dir = item / code
            if not company_dir.exists():
                continue
            dest = out_dir / code
            if dest.exists():
                for f in company_dir.iterdir():
                    if f.is_file():
                        shutil.copy2(f, dest / f.name)
            else:
                shutil.copytree(company_dir, dest)
    print(f"  annual-{year}{sample_suffix}: {out_dir}")


def copy_large_holding_sample(
    data_set: Path,
    out_root: Path,
    edinet_codes: list[str],
    year: int,
    sample_suffix: str = "-sample",
) -> None:
    base = data_set / f"edinet_corpus-large_holding-{year}"
    if not base.exists():
        print(f"  [large_holding] スキップ: {base} が存在しません")
        return
    out_dir = out_root / f"edinet_corpus-large_holding-{year}{sample_suffix}" / "large_holding"
    out_dir.mkdir(parents=True, exist_ok=True)
    code_set = set(edinet_codes)
    for item in sorted(base.iterdir()):
        if not item.is_dir() or item.name.startswith("edinet_corpus") or item.name.endswith(".zip"):
            continue
        if "large_holding" not in item.name:
            continue
        for company_dir in item.iterdir():
            if not company_dir.is_dir() or not re.match(r"^E\d{5}$", company_dir.name):
                continue
            found_issuer = False
            for jf in company_dir.glob("*.json"):
                try:
                    with open(jf, encoding="utf-8") as f:
                        d = json.load(f)
                    issuer = (d.get("issuerEdinetCode") or "").strip()
                    if issuer in code_set:
                        found_issuer = True
                        break
                except Exception:
                    pass
            if not found_issuer:
                continue
            dest = out_dir / company_dir.name
            if dest.exists():
                for f in company_dir.iterdir():
                    if f.is_file():
                        shutil.copy2(f, dest / f.name)
            else:
                shutil.copytree(company_dir, dest)
    print(f"  large_holding-{year}{sample_suffix}: {out_dir}")


def copy_quarterly_sample(
    data_set: Path,
    out_root: Path,
    edinet_codes: list[str],
    year: int,
    sample_suffix: str = "-sample",
) -> None:
    base = data_set / f"edinet_corpus-quarterly-{year}"
    if not base.exists():
        print(f"  [quarterly] スキップ: {base} が存在しません")
        return
    out_dir = out_root / f"edinet_corpus-quarterly-{year}{sample_suffix}" / "quarterly"
    out_dir.mkdir(parents=True, exist_ok=True)
    code_set = set(edinet_codes)
    for item in sorted(base.iterdir()):
        if not item.is_dir() or item.name.startswith("edinet_corpus") or item.name.endswith(".zip"):
            continue
        if not item.name.startswith("quarterly"):
            continue
        for code in code_set:
            company_dir = item / code
            if not company_dir.exists():
                continue
            dest = out_dir / code
            if dest.exists():
                shutil.rmtree(dest)
            shutil.copytree(company_dir, dest)
    print(f"  quarterly-{year}{sample_suffix}: {out_dir}")


def copy_semiannual_sample(
    data_set: Path,
    out_root: Path,
    edinet_codes: list[str],
    year: int,
    sample_suffix: str = "-sample",
) -> None:
    base = data_set / f"edinet_corpus-semiannual-{year}"
    if not base.exists():
        print(f"  [semiannual] スキップ: {base} が存在しません")
        return
    out_dir = out_root / f"edinet_corpus-semiannual-{year}{sample_suffix}" / "semiannual"
    out_dir.mkdir(parents=True, exist_ok=True)
    code_set = set(edinet_codes)
    for item in sorted(base.iterdir()):
        if not item.is_dir() or item.name.startswith("edinet_corpus") or item.name.endswith(".zip"):
            continue
        if not item.name.startswith("semiannual"):
            continue
        for code in code_set:
            company_dir = item / code
            if not company_dir.exists():
                continue
            dest = out_dir / code
            if dest.exists():
                for f in company_dir.iterdir():
                    if f.is_file():
                        shutil.copy2(f, dest / f.name)
            else:
                shutil.copytree(company_dir, dest)
    for code in code_set:
        if (out_dir / code).exists():
            continue
        for z in sorted(base.glob("*.zip")):
            tmp = out_dir.parent / "_tmp_extract"
            tmp.mkdir(parents=True, exist_ok=True)
            try:
                subprocess.run(
                    ["unzip", "-o", "-q", str(z), "-d", str(tmp)],
                    check=False,
                    capture_output=True,
                    timeout=300,
                )
                extracted = tmp / "semiannual"
                if not extracted.exists():
                    continue
                company_dir = extracted / code
                if company_dir.exists():
                    shutil.copytree(company_dir, out_dir / code)
                    break
            finally:
                if tmp.exists():
                    shutil.rmtree(tmp, ignore_errors=True)
    print(f"  semiannual-{year}{sample_suffix}: {out_dir}")


def run_auto_pick(
    data_set: Path,
    out_root: Path,
    year: int,
    size: int,
    require_both: bool,
    list_output: Path | None,
) -> None:
    annual = get_annual_codes(data_set, year)
    quarterly = get_quarterly_codes(data_set, year)
    semiannual = get_semiannual_codes(data_set, year)
    large_holding = get_large_holding_codes(data_set, year)
    print(f"有価証券(annual-{year}): {len(annual)} 社")
    print(f"四半期(quarterly-{year}): {len(quarterly)} 社")
    print(f"半期(semiannual-{year}): {len(semiannual)} 社")
    print(f"大量報告書(large_holding-{year}): {len(large_holding)} 社")
    use_all_four = bool(large_holding and (annual & quarterly & semiannual & large_holding))
    picked = pick_companies(
        annual, quarterly, semiannual,
        large_holding if use_all_four else None,
        size=size,
        require_both=require_both,
    )
    if len(picked) < size:
        kind = "4種すべて" if use_all_four else "3種"
        print(f"{kind}に存在する企業は {len(picked)} 社のみです。", file=sys.stderr)
    if not picked:
        print("共通する企業がありません。", file=sys.stderr)
        sys.exit(1)
    print(f"ピックアップした {len(picked)} 社: {picked}")
    suffix = ""
    copy_quarterly_sample(data_set, out_root, picked, year, sample_suffix=suffix)
    copy_semiannual_sample(data_set, out_root, picked, year, sample_suffix=suffix)
    if list_output:
        list_output.parent.mkdir(parents=True, exist_ok=True)
        list_output.write_text(
            json.dumps([{"edinetCode": c} for c in picked], ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        print(f"企業リスト: {list_output}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="コーパスサンプルを作成（企業指定 or data-set から自動選択）",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--auto_pick",
        action="store_true",
        help="data-set から有価証券・四半期・半期が揃う企業を自動で選び、四半期・半期のみコピー（-sample なしで出力）",
    )
    parser.add_argument(
        "--auto_pick_size",
        type=int,
        default=AUTO_PICK_SIZE,
        help=f"--auto_pick で選ぶ社数（デフォルト: {AUTO_PICK_SIZE}）",
    )
    parser.add_argument(
        "--auto_pick_both",
        action="store_true",
        help="--auto_pick 時、四半期・半期の両方に存在する企業のみから選ぶ",
    )
    parser.add_argument("--sec_codes", nargs="*", default=None, help="証券コード（複数可）")
    parser.add_argument("--sec_codes_file", type=Path, default=None, help="1行1証券コードのファイル")
    parser.add_argument("--edinet_codes", nargs="*", default=None, help="EDINET コードを直接指定")
    parser.add_argument("--edinet_codes_file", type=Path, default=None, help="1行1EDINETコードのファイル")
    parser.add_argument("--year", type=int, default=2025, help="メイン年度（auto_pick 時は探索年度）")
    parser.add_argument("--quarterly_year", type=int, default=None, help="四半期の年度。未指定時は --year")
    parser.add_argument(
        "--types",
        type=str,
        default=",".join(CORPUS_TYPES),
        help=f"作成する書類種別（カンマ区切り）。可能: {','.join(CORPUS_TYPES)}",
    )
    parser.add_argument("--data_set", type=Path, default=None, help="data-set のパス")
    parser.add_argument("--output_dir", type=Path, default=None, help="出力先ルート（auto_pick 時はリポジトリルート）")
    parser.add_argument("--max_companies", type=int, default=SAMPLE_SIZE, help="証券コードから選ぶ最大社数")
    parser.add_argument("--list_output", type=Path, default=None, help="企業リスト JSON の出力先")
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parent.parent.parent.parent
    data_set = args.data_set or (repo_root / "data-set")
    output_dir = args.output_dir or data_set
    year = args.year
    quarterly_year = args.quarterly_year if args.quarterly_year is not None else year

    if not data_set.exists():
        print(f"data-set が見つかりません: {data_set}", file=sys.stderr)
        sys.exit(1)

    if args.auto_pick:
        out_root = args.output_dir or repo_root
        list_path = args.list_output or (Path(__file__).parent / f"sample_auto_pick_{year}.json")
        run_auto_pick(
            data_set, out_root, year,
            size=args.auto_pick_size,
            require_both=args.auto_pick_both,
            list_output=list_path,
        )
        return

    try:
        types = [t.strip() for t in args.types.split(",") if t.strip()]
    except Exception:
        types = list(CORPUS_TYPES)
    for t in types:
        if t not in CORPUS_TYPES:
            parser.error(f"--types に無効な種別: {t}")

    resolved: list[tuple[str, str, str]] = []
    has_sec = bool(args.sec_codes) or (args.sec_codes_file and args.sec_codes_file.exists())
    has_edinet = bool(args.edinet_codes) or (args.edinet_codes_file and args.edinet_codes_file.exists())
    sec_codes = list(args.sec_codes or [])
    if args.sec_codes_file and args.sec_codes_file.exists():
        sec_codes.extend(
            line.strip() for line in args.sec_codes_file.read_text(encoding="utf-8").splitlines()
            if line.strip()
        )
    if not sec_codes and not has_edinet:
        sec_codes = DEFAULT_SEC_CODES

    if sec_codes:
        csv_path = repo_root / "edinet-wrapper" / "data" / "EdinetcodeDlInfo.csv"
        if not csv_path.exists():
            print(f"証券コード指定時は EdinetcodeDlInfo.csv が必要です: {csv_path}", file=sys.stderr)
            sys.exit(1)
        resolved = sec_codes_to_edinet_codes(csv_path, sec_codes, max_count=args.max_companies)
        if not resolved and not has_edinet:
            print("指定した証券コードに一致する企業がありません。", file=sys.stderr)
            sys.exit(1)

    seen_edinet = {r[1] for r in resolved}
    edinet_codes_raw = list(args.edinet_codes or [])
    if args.edinet_codes_file and args.edinet_codes_file.exists():
        edinet_codes_raw.extend(
            line.strip() for line in args.edinet_codes_file.read_text(encoding="utf-8").splitlines()
            if line.strip()
        )
    for raw in edinet_codes_raw:
        code = parse_edinet_code(raw)
        if code and code not in seen_edinet:
            seen_edinet.add(code)
            resolved.append(("", code, ""))

    if not resolved:
        print("対象企業が1社もありません。", file=sys.stderr)
        sys.exit(1)

    edinet_list = [r[1] for r in resolved]
    print(f"対象 {len(resolved)} 社 (--year={year}, quarterly_year={quarterly_year})")
    for sec, edinet, name in resolved:
        print(f"  {sec or '-'} -> {edinet} {name or ''}")

    output_dir.mkdir(parents=True, exist_ok=True)
    suffix = "-sample"
    if "annual" in types:
        copy_annual_sample(data_set, output_dir, edinet_list, year, sample_suffix=suffix)
    if "large_holding" in types:
        copy_large_holding_sample(data_set, output_dir, edinet_list, year, sample_suffix=suffix)
    if "quarterly" in types:
        copy_quarterly_sample(data_set, output_dir, edinet_list, quarterly_year, sample_suffix=suffix)
    if "semiannual" in types:
        copy_semiannual_sample(data_set, output_dir, edinet_list, year, sample_suffix=suffix)

    list_path = args.list_output or (Path(__file__).parent / f"sample_companies_{year}.json")
    list_path.parent.mkdir(parents=True, exist_ok=True)
    list_path.write_text(
        json.dumps(
            [{"secCode": sec or None, "edinetCode": edinet, "filerName": name or None}
             for sec, edinet, name in resolved],
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    print(f"企業リスト: {list_path}")


if __name__ == "__main__":
    main()

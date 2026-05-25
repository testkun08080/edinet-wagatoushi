#!/usr/bin/env python3
"""
D1 互換 SQLite DB から、フロント互換の public/data JSON を生成する。
大株主データは TSV から抽出して shareholders/{secCode}.json に出力する（raw_tsv/ は生成しない）。
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import multiprocessing
import re
import sqlite3
from pathlib import Path

from db_common import normalize_sec_code

_CTX_RANK = re.compile(r"No(\d+)MajorShareholdersMember$")


def load_builder_functions():
    script_path = Path(__file__).resolve().parent.parent / "frontend" / "build_screener_data.py"
    spec = importlib.util.spec_from_file_location("build_screener_data_module", script_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Failed to load builder module: {script_path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return (
        module.summary_to_metrics_row,
        module.write_column_manifest,
        module.write_data_quality_reports,
        module._read_raw_tsv,
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build public/data JSON files from D1-compatible DB")
    parser.add_argument("--db_path", type=Path, default=Path("state/edinet_pipeline.db"))
    parser.add_argument("--output", type=Path, default=Path("../edinet-screener/public/data"))
    parser.add_argument("--strict", action="store_true")
    parser.add_argument("--no_shareholders", action="store_true", help="shareholders/ の生成をスキップ")
    parser.add_argument("--workers", type=int, default=multiprocessing.cpu_count(),
                        help="shareholders 生成の並列数（デフォルト: CPU数）")
    return parser.parse_args()


def _parse_shareholders_from_rows(rows: list[list[str]]) -> list[dict]:
    """TSV rows から大株主エントリを抽出する（parse-major-shareholders.ts と同ロジック）。"""
    acc: dict[int, dict] = {}
    for row in rows:
        if not row:
            continue
        elem_id = row[0] if len(row) > 0 else ""
        item_name = row[1] if len(row) > 1 else ""
        context_id = row[2] if len(row) > 2 else ""
        value = row[8] if len(row) > 8 else ""

        m = _CTX_RANK.search(context_id)
        if not m:
            continue
        rank = int(m.group(1))
        entry = acc.setdefault(rank, {"rank": rank})

        if elem_id == "jpcrp_cor:NameMajorShareholders":
            entry["name"] = value
        elif elem_id == "jpcrp_cor:AddressMajorShareholders":
            entry["address"] = value
        elif (
            elem_id == "jpcrp_cor:NumberOfSharesHeld"
            and item_name == "所有株式数"
            and "MajorShareholders" in context_id
        ):
            entry["shares"] = value if value and value != "－" else None
        elif (
            elem_id == "jpcrp_cor:ShareholdingRatio"
            and item_name == "発行済株式（自己株式を除く。）の総数に対する所有株式数の割合"
            and "MajorShareholders" in context_id
        ):
            entry["ratio"] = value if value and value != "－" else None

    return [
        {
            "rank": e["rank"],
            "name": e["name"].strip(),
            "shares": e.get("shares"),
            "ratio": e.get("ratio"),
        }
        for e in sorted(acc.values(), key=lambda x: x["rank"])
        if e.get("name", "").strip()
    ]


def _build_shareholders_worker(args: tuple) -> tuple[str, list[dict] | None, str]:
    """(sec_code, periods_json_str, output_dir_str, read_raw_tsv_script) → (sec_code, periods_data, error)"""
    sec_code, periods_json_str, output_dir_str = args
    periods: list[dict] = json.loads(periods_json_str)

    # build_screener_data._read_raw_tsv をワーカー内でロード
    script_path = Path(__file__).resolve().parent.parent / "frontend" / "build_screener_data.py"
    spec = importlib.util.spec_from_file_location("bsd", script_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    read_raw_tsv = module._read_raw_tsv

    result_periods = []
    for p in periods:
        object_key = p.get("object_key")
        if not object_key:
            continue
        tsv_path = Path(object_key)
        if not tsv_path.exists():
            continue
        try:
            raw = read_raw_tsv(tsv_path)
            shareholders = _parse_shareholders_from_rows(raw.get("rows", []))
            if shareholders:
                result_periods.append({
                    "periodEnd": p["period_end"],
                    "docID": p["doc_id"],
                    "shareholders": shareholders,
                })
        except Exception as e:
            pass  # TSV読み取り失敗は無視（四半期など記載なし）

    if not result_periods:
        return sec_code, None, ""

    out_path = Path(output_dir_str) / "shareholders" / f"{sec_code}.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)

    # 既存JSONとマージ（同一docIDは新しい内容で上書き、それ以外は保持）
    existing_periods: list[dict] = []
    if out_path.exists():
        try:
            existing = json.loads(out_path.read_text(encoding="utf-8"))
            existing_periods = existing.get("periods", [])
        except Exception:
            pass

    merged: dict[str, dict] = {p["docID"]: p for p in existing_periods}
    for p in result_periods:
        merged[p["docID"]] = p
    final_periods = sorted(merged.values(), key=lambda x: x.get("periodEnd", ""))

    out_path.write_text(
        json.dumps({"secCode": sec_code, "periods": final_periods}, ensure_ascii=False),
        encoding="utf-8",
    )
    return sec_code, result_periods, ""


def generate_shareholders_files(
    conn: sqlite3.Connection,
    output_dir: Path,
    workers: int,
) -> None:
    """全社の大株主データを並列で shareholders/{secCode}.json に出力する。

    TSVが存在しない行（絶対パス等）はワーカー内でスキップされ、既存ファイルを削除しない。
    GHA環境では当日ingest分のTSV（相対パス）のみ処理し、git管理済みの過去データを保持する。
    """
    rows = conn.execute(
        """
        SELECT
          pf.sec_code,
          pf.doc_id,
          pf.period_end,
          rfi.object_key
        FROM period_financials pf
        JOIN raw_files_index rfi ON rfi.doc_id = pf.doc_id AND rfi.file_type = 'tsv'
        WHERE rfi.object_key IS NOT NULL
        ORDER BY pf.sec_code, pf.period_end
        """
    ).fetchall()

    # 証券コードごとにグループ化
    by_sec: dict[str, list[dict]] = {}
    for row in rows:
        sec_code = normalize_sec_code(row["sec_code"])
        if not sec_code:
            continue
        by_sec.setdefault(sec_code, []).append({
            "doc_id": row["doc_id"],
            "period_end": row["period_end"],
            "object_key": row["object_key"],
        })

    tasks = [
        (sec_code, json.dumps(periods), str(output_dir))
        for sec_code, periods in by_sec.items()
    ]
    total = len(tasks)
    print(f"shareholders: {total} 社を {workers} プロセスで確認中（TSV不在はスキップ）...")

    ok = empty = err = 0
    with multiprocessing.Pool(processes=workers) as pool:
        for sec_code, result, msg in pool.imap_unordered(_build_shareholders_worker, tasks, chunksize=20):
            if msg:
                err += 1
                print(f"  [WARN] {sec_code}: {msg}")
            elif result is None:
                empty += 1
            else:
                ok += 1

    # 今回生成できたファイルのみ管理。TSVが存在しなかった既存ファイルは保持する（git管理済みデータを消さない）。
    print(f"shareholders: 生成={ok} TSVなし/スキップ={empty} エラー={err} / 計={total}")


def main() -> None:
    args = parse_args()
    summary_to_metrics_row, write_column_manifest, write_data_quality_reports, _ = load_builder_functions()
    conn = sqlite3.connect(args.db_path)
    conn.row_factory = sqlite3.Row

    try:
        rows = conn.execute(
            """
            SELECT
              pf.edinet_code,
              pf.sec_code,
              pf.filer_name,
              pf.doc_id,
              pf.doc_type,
              pf.period_start,
              pf.period_end,
              pf.submit_date_time,
              d.doc_description,
              pf.summary_json,
              pf.pl_json,
              pf.bs_json,
              pf.cf_json
            FROM period_financials pf
            JOIN documents d ON d.doc_id = pf.doc_id
            WHERE d.withdrawal_status IS NULL OR d.withdrawal_status != '1'
            ORDER BY pf.sec_code, pf.period_end
            """
        ).fetchall()

        if not args.no_shareholders:
            output_dir = args.output
            output_dir.mkdir(parents=True, exist_ok=True)
            generate_shareholders_files(conn, output_dir, args.workers)

    finally:
        conn.close()

    by_company: dict[str, dict] = {}
    for row in rows:
        sec_code = normalize_sec_code(row["sec_code"])
        if not sec_code:
            continue
        item = by_company.setdefault(
            sec_code,
            {
                "edinetCode": row["edinet_code"],
                "secCode": sec_code,
                "filerName": row["filer_name"],
                "periods": [],
            },
        )
        item["periods"].append(
            {
                "periodStart": row["period_start"],
                "periodEnd": row["period_end"],
                "docID": row["doc_id"],
                "docDescription": row["doc_description"] or row["doc_type"],
                "submitDateTime": row["submit_date_time"],
                "summary": json.loads(row["summary_json"]),
                "pl": json.loads(row["pl_json"]),
                "bs": json.loads(row["bs_json"]),
                "cf": json.loads(row["cf_json"]),
            }
        )

    output_dir = args.output
    output_dir.mkdir(parents=True, exist_ok=True)
    summaries_dir = output_dir / "summaries"
    summaries_dir.mkdir(parents=True, exist_ok=True)

    companies = []
    metrics = []
    for sec_code, summary_data in sorted(by_company.items(), key=lambda x: x[0]):
        summary_data["periods"].sort(key=lambda x: x.get("periodEnd") or "")
        companies.append(
            {
                "edinetCode": summary_data["edinetCode"],
                "secCode": summary_data["secCode"],
                "filerName": summary_data["filerName"],
            }
        )
        (summaries_dir / f"{sec_code}.json").write_text(
            json.dumps(summary_data, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        metrics.append(summary_to_metrics_row(summary_data))

    expected_summary_files = {f"{sec_code}.json" for sec_code in by_company}
    for stale_path in summaries_dir.glob("*.json"):
        if stale_path.name not in expected_summary_files:
            stale_path.unlink()

    (output_dir / "companies.json").write_text(
        json.dumps({"companies": companies}, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (output_dir / "company_metrics.json").write_text(
        json.dumps({"metrics": metrics}, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    column_config_path = Path(__file__).resolve().parent.parent.parent / "config" / "screener_columns.json"
    write_column_manifest(output_dir, config_path=column_config_path)
    write_data_quality_reports(output_dir, metrics, strict=args.strict)

    print(f"Generated from DB: companies={len(companies)} metrics={len(metrics)} output={output_dir}")


if __name__ == "__main__":
    main()

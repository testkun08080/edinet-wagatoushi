#!/usr/bin/env python3
"""
data-set 内の四半期報告書データから33社をピックアップし、edinet-screener 用データを生成する。
ダウンロードは行わない。

使い方:
  cd edinet-wrapper
  uv run python scripts/fetch_33_companies.py

前提:
  - プロジェクトルートの data-set/ に四半期コーパス（quarterly/ 配下の TSV + JSON）が配置されていること

出力:
  - edinet-screener/public/data/ に companies.json, summaries/*.json, company_metrics.json
  - scripts/company_list_33.json に今回ピックアップした33社を保存
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from pathlib import Path

from loguru import logger

# EDINET コードのパターン（E + 5桁数字）
EDINET_CODE_PATTERN = re.compile(r"/?(E\d{5})/")

# ピックアップする社数
TARGET_COUNT = 33


def discover_edinet_codes(data_set: Path) -> list[tuple[str, int]]:
    """
    data-set 内の四半期報告書（quarterly/ 配下）から EDINET コードを発見。
    戻り値: [(edinet_code, tsv_count), ...] を tsv_count の多い順で返す。
    """
    code_to_count: dict[str, int] = {}

    for tsv_path in data_set.rglob("*.tsv"):
        p = str(tsv_path).replace("\\", "/")
        # 四半期データのみ（quarterly を含むパスのみ）
        if "/quarterly/" not in p:
            continue
        m = EDINET_CODE_PATTERN.search(p)
        if not m:
            continue
        edinet_code = m.group(1)
        json_path = tsv_path.with_suffix(".json")
        if json_path.exists():
            code_to_count[edinet_code] = code_to_count.get(edinet_code, 0) + 1

    # データ数の多い順にソート
    return sorted(code_to_count.items(), key=lambda x: -x[1])


def main() -> None:
    project_root = Path(__file__).resolve().parent.parent  # edinet-wrapper
    repo_root = project_root.parent  # edinet-wagatoushi
    data_set = Path(os.environ["DATA_SET_PATH"]) if os.environ.get("DATA_SET_PATH") else (repo_root / "data-set")
    output_dir = repo_root / "edinet-screener" / "public" / "data"
    company_list_path = Path(__file__).parent / "company_list_33.json"

    if not data_set.exists():
        logger.error(f"data-set が見つかりません: {data_set}")
        sys.exit(1)

    discovered = discover_edinet_codes(data_set)
    logger.info(f"data-set 内で {len(discovered)} 社を発見しました")

    if not discovered:
        logger.error("有効な TSV+JSON が data-set 内にありません。")
        sys.exit(1)

    # 上位33社をピックアップ（データ数が多い順）
    picked = [edinet_code for edinet_code, _ in discovered[:TARGET_COUNT]]
    logger.info(f"上位 {len(picked)} 社をピックアップ: {picked[:5]}...")

    # company_list_33.json を更新（prepare の結果で filerName/secCode が決まるため、ここでは edinet のみ）
    with open(company_list_path, "w", encoding="utf-8") as f:
        json.dump([{"edinetCode": c} for c in picked], f, ensure_ascii=False, indent=2)
    logger.info(f"company_list_33.json を更新しました")

    codes_str = ",".join(sorted(picked))
    prepare_script = project_root / "scripts" / "prepare_sample_companies.py"

    cmd = [
        "uv",
        "run",
        "python",
        str(prepare_script),
        "--edinet_codes",
        codes_str,
        "--data_set",
        str(data_set),
        "--output",
        str(output_dir),
    ]

    logger.info("prepare_sample_companies を実行中...")
    result = subprocess.run(cmd, cwd=str(project_root))

    if result.returncode != 0:
        logger.error("prepare_sample_companies の実行に失敗しました")
        sys.exit(result.returncode)

    logger.info("完了: edinet-screener/public/data/ にデータを出力しました")


if __name__ == "__main__":
    main()

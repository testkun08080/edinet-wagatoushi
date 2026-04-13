#!/usr/bin/env python3
"""
フロント用データ（companies.json / summaries/*.json / company_metrics.json）を
一箇所（edinet-screener/public/data/）にまとめて生成する。

実行時に「サンプル用（少数社）」か「全件（data-set 内の全企業）」を選択できる。

使い方:
  cd edinet-wrapper

  # サンプル用（デフォルト11社 or 指定した EDINET コード）
  uv run python scripts/frontend/build_screener_data.py --mode sample
  uv run python scripts/frontend/build_screener_data.py --mode sample E00004 E03606 E05070
  uv run python scripts/frontend/build_screener_data.py --mode sample --list scripts/frontend/sample_11companies.json

  # 全件（data-set 内の全 EDINET コードを走査して一括生成）
  uv run python scripts/frontend/build_screener_data.py --mode full
  uv run python scripts/frontend/build_screener_data.py --mode full --data_set ../data-set --output ../edinet-screener/public/data

  # company_metrics.json のみ再生成（既存の summaries から）
  uv run python scripts/frontend/build_screener_data.py --metrics_only

出力先: edinet-screener/public/data/
  - companies.json
  - summaries/{sec_code}.json
  - company_metrics.json
"""

from __future__ import annotations

import csv
import json
import re
from argparse import ArgumentParser
from pathlib import Path

from edinet_wrapper import parse_tsv

CURRENT_KEYS = [
    "CurrentQuarter",
    "CurrentYTD",
    "CurrentYear",
    "Prior1Quarter",
    "Prior1YTD",
    # 中間期（パーサの YEAR_LIST の Interim / Prior1Interim）
    "Interim",
    "Prior1Interim",
]

# _flatten_for_period: これらのいずれかを含む dict は「年度バケット」として _get_current_value に渡す
_YEAR_BUCKET_KEYS = frozenset(
    {
        "CurrentYear",
        "Prior1Year",
        "Prior2Year",
        "Prior3Year",
        "Prior4Year",
        "CurrentQuarter",
        "Prior1Quarter",
        "CurrentYTD",
        "Prior1YTD",
        "Interim",
        "Prior1Interim",
        "FilingDate",
    }
)

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


def _format_ratio_decimal(r: float) -> str:
    """比率を小数文字列に（ROE 開示と同様 0.1996 形式）。"""
    text = f"{r:.6f}".rstrip("0").rstrip(".")
    return text if text else "0"


def _compute_roe_calculated(net_income: str | None, net_assets: str | None) -> str | None:
    ni = _parse_number(net_income)
    na = _parse_number(net_assets)
    if ni is None or na is None or na == 0:
        return None
    return _format_ratio_decimal(ni / na)


def _compute_roa(net_income: str | None, total_assets: str | None) -> str | None:
    ni = _parse_number(net_income)
    ta = _parse_number(total_assets)
    if ni is None or ta is None or ta == 0:
        return None
    return _format_ratio_decimal(ni / ta)


def _compute_equity_ratio_calculated(net_assets: str | None, total_assets: str | None) -> str | None:
    na = _parse_number(net_assets)
    ta = _parse_number(total_assets)
    if na is None or ta is None or ta == 0:
        return None
    return _format_ratio_decimal(na / ta)


def _compute_fcf(ocf: str | None, icf: str | None) -> str | None:
    o = _parse_number(ocf)
    i = _parse_number(icf)
    if o is None or i is None:
        return None
    total = o + i
    if abs(total - round(total)) < 1e-6:
        return str(int(round(total)))
    return str(total)


def _compute_payout_ratio_dps_eps(dps: str | None, eps: str | None) -> str | None:
    d = _parse_number(dps)
    e = _parse_number(eps)
    if d is None or e is None or e == 0:
        return None
    r = d / e
    if r > 2.0:
        return None
    return _format_ratio_decimal(r)


def _compute_dividend_yield_pct(dps: str | None, eps: str | None, per: float | None) -> float | None:
    """配当利回り（%）。株価 ≒ EPS×PER。配当性向>200% または利回り>10% は除外。"""
    d = _parse_number(dps)
    e = _parse_number(eps)
    if d is None or e is None or per is None or e <= 0 or per <= 0:
        return None
    if d / e > 2.0:
        return None
    implied_price = e * per
    if implied_price <= 0:
        return None
    y_pct = (d / implied_price) * 100
    if y_pct > 10.0:
        return None
    return round(y_pct, 4)


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


def _annual_periods(periods: list[dict]) -> list[dict]:
    """有価証券報告書のみ抽出。periodEnd 昇順で重複除去済みを返す。"""
    seen: set[str] = set()
    result: list[dict] = []
    for p in periods:
        desc = p.get("docDescription", "")
        if "有価証券報告書" not in desc:
            continue
        if "四半期" in desc or "半期" in desc:
            continue
        pe = p.get("periodEnd", "")
        if pe in seen:
            continue
        seen.add(pe)
        result.append(p)
    result.sort(key=lambda p: p.get("periodEnd", ""))
    return result


def _yoy_growth(current: float | None, prior: float | None) -> float | None:
    """YoY 成長率（小数: 0.15 = 15%）。prior=0 や None は None。"""
    if current is None or prior is None or prior == 0:
        return None
    return (current - prior) / abs(prior)


def _cagr(start_val: float | None, end_val: float | None, years: int) -> float | None:
    """CAGR（小数）。両方正の場合のみ算出。"""
    if start_val is None or end_val is None or start_val <= 0 or end_val <= 0 or years <= 0:
        return None
    return (end_val / start_val) ** (1.0 / years) - 1.0


def _consecutive_div_increases(annual_periods: list[dict]) -> int:
    """最新から遡って DPS が増加し続けている年数をカウント。"""
    dps_values: list[float] = []
    for p in reversed(annual_periods):
        s = p.get("summary", {})
        dps = _parse_number(s.get("１株当たり配当額"))
        if dps is None:
            break
        dps_values.append(dps)
    # dps_values は最新→古い順
    count = 0
    for i in range(len(dps_values) - 1):
        if dps_values[i] > dps_values[i + 1]:
            count += 1
        else:
            break
    return count


def _compute_current_ratio(current_assets: str | None, current_liabilities: str | None) -> float | None:
    ca = _parse_number(current_assets)
    cl = _parse_number(current_liabilities)
    if ca is None or cl is None or cl == 0:
        return None
    return round(ca / cl, 4)


def _compute_de_ratio(liabilities: str | None, net_assets: str | None) -> float | None:
    d = _parse_number(liabilities)
    e = _parse_number(net_assets)
    if d is None or e is None or e == 0:
        return None
    return round(d / e, 4)


def _compute_roic(
    op_profit: str | None,
    total_assets: str | None,
    current_liabilities: str | None,
    tax_expense: str | None,
    pre_tax_income: str | None,
) -> float | None:
    """ROIC = 営業利益*(1-実効税率) / (総資産-流動負債)。"""
    op = _parse_number(op_profit)
    ta = _parse_number(total_assets)
    cl = _parse_number(current_liabilities)
    if op is None or ta is None or cl is None:
        return None
    invested = ta - cl
    if invested <= 0:
        return None
    tax = _parse_number(tax_expense)
    pretax = _parse_number(pre_tax_income)
    if tax is not None and pretax is not None and pretax > 0:
        tax_rate = min(max(tax / pretax, 0), 1.0)
    else:
        tax_rate = 0.3
    nopat = op * (1 - tax_rate)
    return round(nopat / invested, 6)


def _piotroski_f_score(
    cur_s: dict, pri_s: dict,
    cur_pl: dict, pri_pl: dict,
    cur_bs: dict, pri_bs: dict,
    cur_cf: dict,
) -> int | None:
    """Piotroski F-Score (0-9)。前年データなしは None。"""
    if not pri_s:
        return None

    def _g(d: dict, *keys: str) -> float | None:
        for k in keys:
            v = _parse_number(d.get(k))
            if v is not None:
                return v
        return None

    # Current year values
    ni = _g(cur_s, "親会社株主に帰属する当期純利益", "親会社株主に帰属する当期純利益 (IFRS)")
    ta = _g(cur_s, "総資産額")
    ocf = _g(cur_s, "営業活動によるキャッシュ・フロー") or _g(cur_cf, "営業キャッシュフロー")
    sales = _g(cur_s, "売上高") or _g(cur_s, "売上収益（IFRS）") or _g(cur_pl, "売上高")
    gross = _g(cur_pl, "売上総利益又は売上総損失（△）", "売上総利益")
    ca = _g(cur_bs, "流動資産")
    cl = _g(cur_bs, "流動負債")
    liab = _g(cur_bs, "負債")
    shares = _g(cur_s, "発行済株式総数（普通株式）")

    # Prior year values
    p_ni = _g(pri_s, "親会社株主に帰属する当期純利益", "親会社株主に帰属する当期純利益 (IFRS)")
    p_ta = _g(pri_s, "総資産額")
    p_sales = _g(pri_s, "売上高") or _g(pri_s, "売上収益（IFRS）") or _g(pri_pl, "売上高")
    p_gross = _g(pri_pl, "売上総利益又は売上総損失（△）", "売上総利益")
    p_ca = _g(pri_bs, "流動資産")
    p_cl = _g(pri_bs, "流動負債")
    p_liab = _g(pri_bs, "負債")
    p_shares = _g(pri_s, "発行済株式総数（普通株式）")

    score = 0

    # 1. ROA positive (net income > 0)
    if ni is not None and ni > 0:
        score += 1

    # 2. Operating CF positive
    if ocf is not None and ocf > 0:
        score += 1

    # 3. Delta ROA > 0
    if ni is not None and ta is not None and ta > 0 and p_ni is not None and p_ta is not None and p_ta > 0:
        if (ni / ta) > (p_ni / p_ta):
            score += 1

    # 4. Accruals: OCF > net income
    if ocf is not None and ni is not None and ocf > ni:
        score += 1

    # 5. Leverage decreasing (debt/assets)
    if liab is not None and ta is not None and ta > 0 and p_liab is not None and p_ta is not None and p_ta > 0:
        if (liab / ta) < (p_liab / p_ta):
            score += 1

    # 6. Liquidity increasing (current ratio)
    if ca is not None and cl is not None and cl > 0 and p_ca is not None and p_cl is not None and p_cl > 0:
        if (ca / cl) > (p_ca / p_cl):
            score += 1

    # 7. No new share dilution
    if shares is not None and p_shares is not None and shares <= p_shares:
        score += 1

    # 8. Gross margin increasing
    if gross is not None and sales is not None and sales > 0 and p_gross is not None and p_sales is not None and p_sales > 0:
        if (gross / sales) > (p_gross / p_sales):
            score += 1

    # 9. Asset turnover increasing
    if sales is not None and ta is not None and ta > 0 and p_sales is not None and p_ta is not None and p_ta > 0:
        if (sales / ta) > (p_sales / p_ta):
            score += 1

    return score


def _has_value(v) -> bool:
    if v is None:
        return False
    if isinstance(v, str):
        s = v.strip()
        return s not in ("", "－", "-")
    return True


def _pick_sales_line(s: dict, pl: dict) -> str | None:
    """一覧用の売上: JP GAAP の売上高 → IFRS の売上収益 → PL 側の同順。"""
    for src in (s, pl):
        for k in ("売上高", "売上収益（IFRS）"):
            if _has_value(src.get(k)):
                return str(src[k]).strip()
    return None


# 最新期が四半・半期だと summary に無いことがあるため、有報等から補完するキー
_EDINET_VALUATION_FALLBACK_KEYS = (
    "株価収益率",
    "自己資本利益率、経営指標等",
    "１株当たり純資産額",
    "配当性向",
    "１株当たり配当額",
    "１株当たり中間配当額",
)


def _merge_edinet_valuation_from_older_periods(latest_summary: dict, periods: list[dict]) -> dict:
    """最新 summary をベースに、欠けた PER/ROE/BPS 等を、各キーごとに新しい期から遡って補完。"""
    out = dict(latest_summary)
    for key in _EDINET_VALUATION_FALLBACK_KEYS:
        if _has_value(out.get(key)):
            continue
        for p in reversed(periods):
            s = p.get("summary") or {}
            if _has_value(s.get(key)):
                out[key] = s[key]
                break
    return out


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
    """
    TSVパース結果の全キーを欠けなく1階層に展開する。
    値が取れないキーも out に含め、None を入れる（JSON では null、フロントで「－」表示）。
    """
    out = {}
    for k, v in obj.items():
        key = f"{prefix}{k}" if prefix else k
        if isinstance(v, dict) and not any(kk in v for kk in _YEAR_BUCKET_KEYS):
            out.update(_flatten_for_period(v, f"{key} / "))
        else:
            val = _get_current_value(v)
            out[key] = val  # 値がなくてもキーは必ず含める（None の場合はフロントで「－」）
    return out


def _sanitize_filename(s: str) -> str:
    s = (s or "").strip()
    if not s:
        return "unknown"
    # Windows / macOS / Linux safe-ish
    s = re.sub(r"[\\/:*?\"<>|\n\r\t]", "_", s)
    s = re.sub(r"\s+", "_", s)
    return s[:120] or "unknown"


def _read_raw_tsv(tsv_path: Path) -> dict:
    """
    TSVの全内容を「欠けなく」保存するための生データ。
    サイズ削減のため rows は「配列の配列」で保持する（columns + rows）。
    """
    with open(tsv_path, "r", encoding="utf-16") as f:
        reader = csv.reader(f, delimiter="\t")
        columns = next(reader, [])
        rows = [row for row in reader]
    return {
        "format": "tsv",
        "encoding": "utf-16",
        "columns": columns,
        "rows": rows,
        "nRows": len(rows),
    }


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


def process_company(
    data_set_root: Path,
    edinet_code: str,
    *,
    raw_tsv_root: Path | None = None,
    include_raw_tsv: bool = True,
) -> tuple[dict, dict] | None:
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

        raw_tsv_rel_path = None
        if include_raw_tsv and raw_tsv_root is not None:
            # sec_code は period ループ中に上書きされる可能性があるので、この時点の値で出す
            sec_code_for_paths = (sec_code or "").lstrip("0") or sec_code or ""
            safe_doc_id = _sanitize_filename(doc_id or period_end or "unknown")
            raw_dir = raw_tsv_root / sec_code_for_paths
            raw_dir.mkdir(parents=True, exist_ok=True)
            raw_tsv_filename = f"{safe_doc_id}.json"
            raw_tsv_out_path = raw_dir / raw_tsv_filename

            raw_tsv = _read_raw_tsv(tsv_path)
            raw_tsv_out_path.write_text(json.dumps(raw_tsv, ensure_ascii=False), encoding="utf-8")
            raw_tsv_rel_path = f"raw_tsv/{sec_code_for_paths}/{raw_tsv_filename}"

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
                # TSVに書かれている内容を欠けなく保存（生TSV）
                "rawTsvPath": raw_tsv_rel_path,
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
    periods = summary_data["periods"]
    latest = periods[-1]
    s = _merge_edinet_valuation_from_older_periods(latest.get("summary") or {}, periods)
    pl = latest.get("pl", {})
    bs = latest.get("bs", {})
    cf = latest.get("cf", {})
    per_raw = s.get("株価収益率")
    per = _parse_number(per_raw) if per_raw and per_raw != "－" else None
    period_end = latest.get("periodEnd", "")
    fiscal_month = period_end.split("-")[1] if period_end and len(period_end) >= 7 else None
    net_income = (
        pl.get("親会社株主に帰属する当期純利益")
        or s.get("親会社株主に帰属する当期純利益")
        or s.get("親会社株主に帰属する当期純利益 (IFRS)")
    )
    eps_raw = s.get("１株当たり当期純利益又は当期純損失")
    dps_raw = s.get("１株当たり配当額") or s.get("１株当たり中間配当額")
    diluted_raw = s.get("潜在株式調整後１株当たり当期純利益")
    diluted_eps = None if not diluted_raw or str(diluted_raw).strip() in ("", "－", "-") else str(diluted_raw).strip()
    ocf = s.get("営業活動によるキャッシュ・フロー") or cf.get("営業キャッシュフロー")
    icf = s.get("投資活動によるキャッシュ・フロー") or cf.get("投資キャッシュフロー")
    payout_ratio_computed = _compute_payout_ratio_dps_eps(dps_raw, eps_raw)
    dividend_yield = _compute_dividend_yield_pct(dps_raw, eps_raw, per)

    # --- Growth metrics (annual periods only) ---
    annual = _annual_periods(periods)
    latest_annual = annual[-1] if annual else None
    prior_annual = annual[-2] if len(annual) >= 2 else None

    def _annual_sales(p: dict | None) -> float | None:
        if p is None:
            return None
        ss = p.get("summary", {})
        pp = p.get("pl", {})
        return _parse_number(ss.get("売上高")) or _parse_number(ss.get("売上収益（IFRS）")) or _parse_number(pp.get("売上高"))

    def _annual_op(p: dict | None) -> float | None:
        if p is None:
            return None
        return _parse_number(p.get("pl", {}).get("営業利益"))

    def _annual_eps(p: dict | None) -> float | None:
        if p is None:
            return None
        return _parse_number(p.get("summary", {}).get("１株当たり当期純利益又は当期純損失"))

    def _annual_dps(p: dict | None) -> float | None:
        if p is None:
            return None
        ss = p.get("summary", {})
        return _parse_number(ss.get("１株当たり配当額")) or _parse_number(ss.get("１株当たり中間配当額"))

    cur_sales = _annual_sales(latest_annual)
    pri_sales = _annual_sales(prior_annual)
    sales_growth_yoy = _yoy_growth(cur_sales, pri_sales)
    op_growth_yoy = _yoy_growth(_annual_op(latest_annual), _annual_op(prior_annual))
    eps_growth_yoy = _yoy_growth(_annual_eps(latest_annual), _annual_eps(prior_annual))
    div_growth_yoy = _yoy_growth(_annual_dps(latest_annual), _annual_dps(prior_annual))

    # CAGR
    prior_3y = annual[-4] if len(annual) >= 4 else None
    prior_5y = annual[-6] if len(annual) >= 6 else None
    sales_cagr_3y = _cagr(_annual_sales(prior_3y), cur_sales, 3)
    sales_cagr_5y = _cagr(_annual_sales(prior_5y), cur_sales, 5)

    consec_div = _consecutive_div_increases(annual)

    # F-Score
    f_score: int | None = None
    if latest_annual and prior_annual:
        f_score = _piotroski_f_score(
            latest_annual.get("summary", {}), prior_annual.get("summary", {}),
            latest_annual.get("pl", {}), prior_annual.get("pl", {}),
            latest_annual.get("bs", {}), prior_annual.get("bs", {}),
            latest_annual.get("cf", {}),
        )

    def _fmt_growth(v: float | None) -> str | None:
        if v is None:
            return None
        return _format_ratio_decimal(v)

    return {
        "edinetCode": edinet_code,
        "secCode": sec_code,
        "filerName": filer_name,
        "計算日": period_end,
        "決算月": fiscal_month,
        "自己資本比率": s.get("自己資本比率"),
        "EPS": eps_raw,
        "dilutedEPS": diluted_eps,
        "売上高": _pick_sales_line(s, pl),
        "経常利益": s.get("経常利益"),
        "当期純利益": net_income,
        "純資産額": s.get("純資産額"),
        "総資産額": s.get("総資産額"),
        "包括利益": s.get("包括利益"),
        "BPS": s.get("１株当たり純資産額"),
        "ROE": s.get("自己資本利益率、経営指標等"),
        "roeCalculated": _compute_roe_calculated(net_income, s.get("純資産額")),
        "roa": _compute_roa(net_income, s.get("総資産額")),
        "equityRatioCalculated": _compute_equity_ratio_calculated(s.get("純資産額"), s.get("総資産額")),
        "営業利益": pl.get("営業利益"),
        "営業CF": ocf,
        "投資CF": icf,
        "fcf": _compute_fcf(ocf, icf),
        "財務CF": s.get("財務活動によるキャッシュ・フロー") or cf.get("財務キャッシュフロー"),
        "現金残高": s.get("現金及び現金同等物の残高") or cf.get("現金及び現金同等物"),
        "配当性向": s.get("配当性向"),
        "payoutRatioComputed": payout_ratio_computed,
        "dividendPerShare": dps_raw,
        "発行済株式総数": s.get("発行済株式総数（普通株式）"),
        "流動資産": bs.get("流動資産"),
        "流動負債": bs.get("流動負債"),
        "負債": bs.get("負債"),
        "投資有価証券": bs.get("投資有価証券"),
        "PER": per,
        "PBR": None,
        "配当利回り": dividend_yield,
        "時価総額": None,
        "ネットキャッシュ": _net_cash(bs.get("流動資産"), bs.get("投資有価証券"), bs.get("負債")),
        "ネットキャッシュ比率": None,
        # --- Growth metrics ---
        "salesGrowthYoY": _fmt_growth(sales_growth_yoy),
        "opGrowthYoY": _fmt_growth(op_growth_yoy),
        "epsGrowthYoY": _fmt_growth(eps_growth_yoy),
        "dividendGrowthYoY": _fmt_growth(div_growth_yoy),
        "salesCagr3y": _fmt_growth(sales_cagr_3y),
        "salesCagr5y": _fmt_growth(sales_cagr_5y),
        "consecutiveDivIncreases": consec_div,
        # --- Safety / Efficiency ---
        "currentRatio": _compute_current_ratio(bs.get("流動資産"), bs.get("流動負債")),
        "deRatio": _compute_de_ratio(bs.get("負債"), s.get("純資産額")),
        "roic": _compute_roic(pl.get("営業利益"), s.get("総資産額"), bs.get("流動負債"), pl.get("法人所得税費用"), pl.get("経常利益") or pl.get("税金等調整前当期純利益")),
        "piotroskiFScore": f_score,
    }


def write_data_quality_reports(output_dir: Path, metrics_list: list[dict], *, strict: bool = False) -> None:
    """
    Phase 3: company_metrics の欠損状況を毎回チェックしてレポート出力。
    """
    total = len(metrics_list)
    if total == 0:
        (output_dir / "data_quality_report.json").write_text(
            json.dumps({"summary": {"totalCompanies": 0}}, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        (output_dir / "data_quality_report.md").write_text("# Data quality report\n\n(no companies)\n", encoding="utf-8")
        return

    # 列集合（順序は安定させる）
    column_keys: list[str] = []
    seen = set()
    for row in metrics_list:
        for k in row.keys():
            if k not in seen:
                seen.add(k)
                column_keys.append(k)

    by_column = {}
    for k in column_keys:
        filled = 0
        missing_sec_codes: list[str] = []
        for row in metrics_list:
            if _has_value(row.get(k)):
                filled += 1
            else:
                missing_sec_codes.append(str(row.get("secCode", "")))
        by_column[k] = {
            "filled": filled,
            "missing": total - filled,
            "total": total,
            "missingSecCodes": [s for s in missing_sec_codes if s],
        }

    # 企業別欠損数
    by_company = {}
    for row in metrics_list:
        sec = str(row.get("secCode", ""))
        missing = [k for k in column_keys if not _has_value(row.get(k))]
        by_company[sec] = {
            "filerName": row.get("filerName"),
            "missingCount": len(missing),
            "missingKeys": missing,
        }

    # JSON
    report_json = {
        "summary": {"totalCompanies": total, "totalColumns": len(column_keys)},
        "byColumn": by_column,
        "byCompany": by_company,
    }
    (output_dir / "data_quality_report.json").write_text(
        json.dumps(report_json, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    # Markdown（列の欠損が多い順）
    cols_sorted = sorted(by_column.items(), key=lambda kv: kv[1]["missing"], reverse=True)
    md_lines = [
        "# Data quality report",
        "",
        f"- totalCompanies: {total}",
        f"- totalColumns: {len(column_keys)}",
        "",
        "## Missing by column",
        "",
        "| key | filled | missing | missingRate |",
        "|---|---:|---:|---:|",
    ]
    for k, stats in cols_sorted:
        missing = stats["missing"]
        rate = (missing / total) if total else 0
        md_lines.append(f"| {k} | {stats['filled']} | {missing} | {rate:.1%} |")

    # 欠損が多い企業トップ
    companies_sorted = sorted(by_company.items(), key=lambda kv: kv[1]["missingCount"], reverse=True)
    md_lines += [
        "",
        "## Missing-heavy companies (top 20)",
        "",
        "| secCode | filerName | missingCount |",
        "|---|---|---:|",
    ]
    for sec, info in companies_sorted[:20]:
        md_lines.append(f"| {sec} | {info.get('filerName','')} | {info['missingCount']} |")

    (output_dir / "data_quality_report.md").write_text("\n".join(md_lines) + "\n", encoding="utf-8")

    if strict:
        # 最低限の重要項目（現状のフロントで最低限意味が出る）
        critical = ["自己資本比率", "EPS", "売上高", "経常利益", "当期純利益", "総資産額", "純資産額"]
        failed = []
        for k in critical:
            if k in by_column and by_column[k]["filled"] == 0:
                failed.append(k)
        if failed:
            raise SystemExit(f"strict mode: critical columns are empty across all companies: {', '.join(failed)}")


def write_all_keys_reports(output_dir: Path, summaries_dir: Path) -> None:
    """
    Phase 4: サンプル作成時に「何が入っているか」を全体把握できるレポート。
    - summaries/*.json を走査し、periodごとに summary/pl/bs/cf のキー一覧を出す
    """
    all_companies = []
    for json_path in sorted(summaries_dir.glob("*.json")):
        try:
            data = json.loads(json_path.read_text(encoding="utf-8"))
        except Exception:
            continue
        all_companies.append(data)

    report = {"companies": []}
    md_lines = ["# All keys report", ""]

    for c in all_companies:
        entry = {
            "edinetCode": c.get("edinetCode"),
            "secCode": c.get("secCode"),
            "filerName": c.get("filerName"),
            "periods": [],
        }
        periods = c.get("periods") or []
        md_lines.append(f"## {c.get('filerName','')} ({c.get('secCode','')})")
        md_lines.append("")
        for p in periods:
            sec = c.get("secCode", "")
            pe = p.get("periodEnd", "")
            doc_id = p.get("docID", "")
            keys = {
                "summary": sorted((p.get("summary") or {}).keys()),
                "pl": sorted((p.get("pl") or {}).keys()),
                "bs": sorted((p.get("bs") or {}).keys()),
                "cf": sorted((p.get("cf") or {}).keys()),
            }
            entry["periods"].append(
                {
                    "periodEnd": pe,
                    "docID": doc_id,
                    "rawTsvPath": p.get("rawTsvPath"),
                    "keys": {k: v for k, v in keys.items()},
                }
            )

            md_lines.append(f"### periodEnd={pe} docID={doc_id}")
            md_lines.append("")
            md_lines.append(f"- rawTsvPath: `{p.get('rawTsvPath')}`")
            md_lines.append(f"- summaryKeys: {len(keys['summary'])}, plKeys: {len(keys['pl'])}, bsKeys: {len(keys['bs'])}, cfKeys: {len(keys['cf'])}")
            md_lines.append("")
        report["companies"].append(entry)
        md_lines.append("")

    (output_dir / "all_keys_report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    (output_dir / "all_keys_report.md").write_text("\n".join(md_lines) + "\n", encoding="utf-8")


def write_column_manifest(output_dir: Path, *, config_path: Path) -> None:
    """
    列定義（単一ソース）を build 成果物として出力する。
    フロントはこれを読むことで、列の二重管理を減らせる。
    """
    if not config_path.exists():
        return
    try:
        config = json.loads(config_path.read_text(encoding="utf-8"))
    except Exception:
        return

    manifest = {
        "version": 1,
        "generatedFrom": str(config_path),
        "columns": config.get("columns", []),
    }
    (output_dir / "column_manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


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
    *,
    include_raw_tsv: bool = True,
    report: bool = True,
    strict: bool = False,
) -> None:
    companies_list: list[dict] = []
    metrics_list: list[dict] = []
    seen_edinet: set[str] = set()

    output_dir.mkdir(parents=True, exist_ok=True)
    summaries_dir = output_dir / "summaries"
    summaries_dir.mkdir(exist_ok=True)
    raw_tsv_root = output_dir / "raw_tsv"
    if include_raw_tsv:
        raw_tsv_root.mkdir(exist_ok=True)

    for edinet_code in edinet_codes:
        result = process_company(
            data_set,
            edinet_code,
            raw_tsv_root=raw_tsv_root,
            include_raw_tsv=include_raw_tsv,
        )
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

    # 列定義 manifest（フロント用）
    column_config_path = Path(__file__).resolve().parent.parent.parent / "config" / "screener_columns.json"
    write_column_manifest(output_dir, config_path=column_config_path)

    # Phase 3: データ品質チェック（毎回）
    write_data_quality_reports(output_dir, metrics_list, strict=strict)

    # Phase 4: サンプル用途の全キー可視化（任意）
    if report:
        write_all_keys_reports(output_dir, summaries_dir)

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
    # full はサイズが大きくなるため report はデフォルトで出さない（必要なら sample か report オプションで）
    run_sample(data_set, output_dir, codes, include_raw_tsv=True, report=False, strict=False)


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
    # Phase 3: データ品質チェック（毎回）
    write_data_quality_reports(output_dir, metrics_list, strict=False)


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
        "--no_raw_tsv",
        action="store_true",
        help="raw_tsv の出力を無効化（デフォルトは有効。TSV全内容の保存が不要な場合のみ）",
    )
    parser.add_argument(
        "--report",
        action="store_true",
        help="all_keys_report.json/.md を出力（デフォルト: sample は出力、full は出力しない）",
    )
    parser.add_argument(
        "--no_report",
        action="store_true",
        help="sample モードでも all_keys_report を出力しない",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="データ品質チェックで重要項目が全社欠損なら失敗（exit 1）",
    )
    parser.add_argument(
        "--metrics_only",
        action="store_true",
        help="既存の summaries から company_metrics.json のみ再生成",
    )
    args = parser.parse_args()

    project_root = Path(__file__).resolve().parent.parent.parent.parent
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
        default_list = script_dir / "sample_11companies.json"
        if default_list.exists():
            codes = load_edinet_codes_from_list_file(default_list)
            print(f"  企業未指定のため {default_list.name} の {len(codes)} 社を使用します。")
        else:
            codes = DEFAULT_SAMPLE_EDINET_CODES
            print(f"  企業未指定のためデフォルト {len(codes)} 社を使用します。")
    include_raw_tsv = not args.no_raw_tsv
    # sample はデフォルトで report を出す（--no_report で抑止可能）
    report = (not args.no_report) or bool(args.report)
    run_sample(
        data_set,
        output_dir,
        codes,
        include_raw_tsv=include_raw_tsv,
        report=report,
        strict=args.strict,
    )


if __name__ == "__main__":
    main()

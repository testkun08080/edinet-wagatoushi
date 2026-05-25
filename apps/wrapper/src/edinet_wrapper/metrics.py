"""Financial metric calculations.

Extracted from the monolithic build_screener_data.py so that:
- ingest_daily.py can compute metrics per-period and store them in SQLite/D1
- the API layer never re-computes from raw BS/PL/CF on request
- tests can pin individual formulas

All inputs are expected to come from the FinancialData blocks defined in
edinet_wrapper.schema. Missing values return None rather than raising.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any


def _num(d: dict[str, Any] | None, *keys: str) -> float | None:
    if not d:
        return None
    for k in keys:
        v = d.get(k)
        if v is None:
            continue
        try:
            n = float(v)
        except (TypeError, ValueError):
            continue
        if n != n:  # NaN
            continue
        return n
    return None


def _safe_div(a: float | None, b: float | None) -> float | None:
    if a is None or b is None or b == 0:
        return None
    return a / b


def _percent(x: float | None) -> float | None:
    if x is None:
        return None
    return round(x * 100, 2)


@dataclass(slots=True)
class CoreMetrics:
    """Per-period derived metrics suitable for direct UI display."""

    roe: float | None  # Return on Equity (%)
    roa: float | None  # Return on Assets (%)
    operating_margin: float | None  # Operating income / revenue (%)
    net_margin: float | None  # Net income / revenue (%)
    equity_ratio: float | None  # Equity / total assets (%)
    fcf: float | None  # Operating CF - investing CF (raw)
    revenue_growth: float | None  # vs previous period (%)
    op_income_growth: float | None  # vs previous period (%)

    def to_dict(self) -> dict[str, float | None]:
        return {
            "roe": self.roe,
            "roa": self.roa,
            "operating_margin": self.operating_margin,
            "net_margin": self.net_margin,
            "equity_ratio": self.equity_ratio,
            "fcf": self.fcf,
            "revenue_growth": self.revenue_growth,
            "op_income_growth": self.op_income_growth,
        }


def compute_core_metrics(
    *,
    pl: dict[str, Any] | None,
    bs: dict[str, Any] | None,
    cf: dict[str, Any] | None,
    prior_pl: dict[str, Any] | None = None,
) -> CoreMetrics:
    """Compute the metrics shown in the screener table.

    The key lookups try the canonical XBRL element id first, then a
    user-friendly Japanese label, then an English label. Adjust the
    fallback lists as the parser exposes new aliases.
    """
    revenue = _num(pl, "NetSales", "Revenue", "売上高")
    operating_income = _num(pl, "OperatingIncome", "営業利益")
    net_income = _num(pl, "ProfitLoss", "NetIncome", "当期純利益")

    total_assets = _num(bs, "Assets", "TotalAssets", "資産合計")
    equity = _num(bs, "Equity", "NetAssets", "純資産合計")

    op_cf = _num(cf, "CashFlowsFromOperatingActivities", "営業活動によるキャッシュ・フロー")
    inv_cf = _num(cf, "CashFlowsFromInvestingActivities", "投資活動によるキャッシュ・フロー")

    prior_revenue = _num(prior_pl, "NetSales", "Revenue", "売上高")
    prior_op = _num(prior_pl, "OperatingIncome", "営業利益")

    fcf = None
    if op_cf is not None and inv_cf is not None:
        fcf = op_cf + inv_cf  # inv_cf is typically negative

    return CoreMetrics(
        roe=_percent(_safe_div(net_income, equity)),
        roa=_percent(_safe_div(net_income, total_assets)),
        operating_margin=_percent(_safe_div(operating_income, revenue)),
        net_margin=_percent(_safe_div(net_income, revenue)),
        equity_ratio=_percent(_safe_div(equity, total_assets)),
        fcf=fcf,
        revenue_growth=_percent(
            _safe_div(revenue - prior_revenue, prior_revenue)
            if revenue is not None and prior_revenue
            else None
        ),
        op_income_growth=_percent(
            _safe_div(operating_income - prior_op, prior_op)
            if operating_income is not None and prior_op
            else None
        ),
    )

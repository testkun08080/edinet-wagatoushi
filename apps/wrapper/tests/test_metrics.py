"""Smoke tests for edinet_wrapper.metrics."""

from edinet_wrapper.metrics import compute_core_metrics


def test_roe_basic():
    m = compute_core_metrics(
        pl={"NetSales": 1000, "OperatingIncome": 200, "ProfitLoss": 100},
        bs={"Assets": 5000, "Equity": 2000},
        cf={"CashFlowsFromOperatingActivities": 300, "CashFlowsFromInvestingActivities": -100},
    )
    assert m.roe == 5.0  # 100 / 2000
    assert m.roa == 2.0  # 100 / 5000
    assert m.operating_margin == 20.0
    assert m.net_margin == 10.0
    assert m.equity_ratio == 40.0
    assert m.fcf == 200


def test_zero_denominator_returns_none():
    m = compute_core_metrics(
        pl={"NetSales": 0, "OperatingIncome": 0, "ProfitLoss": 100},
        bs={"Assets": 0, "Equity": 0},
        cf={},
    )
    assert m.roe is None
    assert m.roa is None
    assert m.operating_margin is None
    assert m.fcf is None


def test_growth_vs_prior():
    m = compute_core_metrics(
        pl={"NetSales": 1100, "OperatingIncome": 220, "ProfitLoss": 100},
        bs={"Assets": 5000, "Equity": 2000},
        cf={},
        prior_pl={"NetSales": 1000, "OperatingIncome": 200},
    )
    assert m.revenue_growth == 10.0
    assert m.op_income_growth == 10.0


def test_missing_inputs():
    m = compute_core_metrics(pl=None, bs=None, cf=None)
    assert m.roe is None
    assert m.fcf is None
    assert m.revenue_growth is None

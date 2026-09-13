"""2025 federal tax tables and the marginal-rate lookups the placement model needs.

Verified: a $350,000 single filer nets $334,250 taxable after the standard
deduction, which lands between $250,525 and $626,350 and so resolves to a 35%
federal marginal rate.

Rates are treated as static in real terms. The model cannot price the risk of
future statutory change.
"""
from typing import Dict, List, Tuple

from ..core.placement_models import FilingStatus

# (upper bound of bracket, marginal rate). None upper bound = no ceiling.
ORDINARY_BRACKETS_2025: Dict[FilingStatus, List[Tuple[float | None, float]]] = {
    FilingStatus.single: [
        (11_925, 0.10),
        (48_475, 0.12),
        (103_350, 0.22),
        (197_300, 0.24),
        (250_525, 0.32),
        (626_350, 0.35),
        (None, 0.37),
    ],
    FilingStatus.married_joint: [
        (23_850, 0.10),
        (96_950, 0.12),
        (206_700, 0.22),
        (394_600, 0.24),
        (501_050, 0.32),
        (751_600, 0.35),
        (None, 0.37),
    ],
}

LTCG_BRACKETS_2025: Dict[FilingStatus, List[Tuple[float | None, float]]] = {
    FilingStatus.single: [(48_350, 0.0), (533_400, 0.15), (None, 0.20)],
    FilingStatus.married_joint: [(96_700, 0.0), (600_050, 0.15), (None, 0.20)],
}

STANDARD_DEDUCTION_2025: Dict[FilingStatus, float] = {
    FilingStatus.single: 15_750,
    FilingStatus.married_joint: 31_500,
}

NIIT_THRESHOLD: Dict[FilingStatus, float] = {
    FilingStatus.single: 200_000,
    FilingStatus.married_joint: 250_000,
}

NIIT_RATE = 0.038


def marginal_ordinary_rate(taxable_income: float, status: FilingStatus) -> float:
    """The rate the next dollar of ordinary income would face."""
    for cap, rate in ORDINARY_BRACKETS_2025[status]:
        if cap is None or taxable_income < cap:
            return rate
    return ORDINARY_BRACKETS_2025[status][-1][1]


def marginal_ltcg_rate(taxable_income: float, status: FilingStatus) -> float:
    """The 0/15/20 rate the next dollar of qualified income would face.

    Qualified dividends stack on top of ordinary income, so the same taxable
    income drives the lookup.
    """
    for cap, rate in LTCG_BRACKETS_2025[status]:
        if cap is None or taxable_income < cap:
            return rate
    return LTCG_BRACKETS_2025[status][-1][1]


def niit_applies(gross_comp: float, status: FilingStatus) -> bool:
    return gross_comp > NIIT_THRESHOLD[status]

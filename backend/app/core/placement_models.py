"""Domain models and defaults for the asset placement calculator.

One question: given a fixed contribution schedule and a fixed target split,
which account should each fund's contribution go into?

Every default in this module is a constant here and nowhere else. There is no
profile store, no YAML, no persistence -- the UI holds inputs in React state and
posts them back.
"""
from enum import Enum
from typing import Dict, List, Optional

from pydantic import BaseModel


class FilingStatus(str, Enum):
    single = "single"
    married_joint = "married_joint"


class AccountCharacter(str, Enum):
    """Only two columns exist, and that is what makes greedy exact.

    401k, Roth 401k and mega-backdoor Roth are one column: all three charge
    foreign withholding and none taxes dividends. Traditional and Roth differ on
    the ordinary-income election, which this tool does not model.
    """
    sheltered = "sheltered"
    taxable = "taxable"


class Provenance(str, Enum):
    """Where a number came from. Anything `unsourced` renders flagged.

    The point is that a guess can never again present itself as data.
    """
    fetched = "fetched"
    derived = "derived"
    stated = "stated"
    unsourced = "unsourced"


class SourcedFloat(BaseModel):
    value: float
    source: Provenance = Provenance.unsourced
    note: str = ""


class FundAssumption(BaseModel):
    """Per-fund inputs to the drag model.

    `foreign_tax` is NOT a free parameter -- it is q * foreign_share *
    withholding, so it scales with the yield assumption instead of drifting
    independently. That collapses two guesses into one with a physical meaning.
    """
    ticker: str
    # Long-run (~40yr) gross dividend yield, BEFORE foreign withholding.
    gross_yield: SourcedFloat
    # Fraction of dividends taxed at long-term capital gains rates. Driven by
    # tax-treaty coverage, not by a raw guess.
    qualified_pct: SourcedFloat
    # Share of the fund's holdings domiciled outside the US.
    foreign_share: SourcedFloat
    # Which regional withholding rate applies to the foreign sleeve.
    region: str


class RegionWithholding(BaseModel):
    """Average dividend withholding rate for a region, weighted by holdings.

    Far more auditable than a raw basis-point figure per fund: it is one number
    per region with a physical meaning, and it scales phi with the yield.
    """
    region: str
    rate: SourcedFloat


class AccountContribution(BaseModel):
    name: str
    amount: float
    character: AccountCharacter


class TaxInputs(BaseModel):
    gross_comp: float = 350_000.0
    filing_status: FilingStatus = FilingStatus.single
    # Flat state rate. Enters BOTH the ordinary and the qualified rate: a flat
    # state tax gives qualified dividends no preferential treatment.
    state_rate: float = 0.0495
    # Reduces taxable income before the bracket lookup. Defaults to 0 because
    # the panel treats the employee deferral as Roth unless told otherwise.
    pre_tax_deferral: float = 0.0
    # Share of foreign tax actually recovered as a credit. Above $300 of foreign
    # tax a single filer files Form 1116, which caps the credit at US tax on
    # foreign-source income -- it rarely binds at a 35% federal rate against
    # ~13% withholding, hence the 1.0 default.
    ftc_recovery: float = 1.0


class GrowthInputs(BaseModel):
    years: int = 40
    # Real geometric return, before tax drag.
    real_return: float = 0.05


class PlacementRequest(BaseModel):
    tax: TaxInputs = TaxInputs()
    growth: GrowthInputs = GrowthInputs()
    funds: List[FundAssumption]
    withholding: List[RegionWithholding]
    accounts: List[AccountContribution]
    # ticker -> share of the portfolio. Must sum to 1.
    target_split: Dict[str, float]


# ---------------------------------------------------------------------------
# Defaults. Derived openly in docs/placement.md -- not inherited from anywhere.
# ---------------------------------------------------------------------------

# Regional average withholding, weighted by holdings.
DEFAULT_WITHHOLDING: List[RegionWithholding] = [
    RegionWithholding(
        region="developed",
        rate=SourcedFloat(
            value=0.110,
            source=Provenance.derived,
            note=(
                "MSCI EAFE weighted-average withholding is 10.49%. Nudged up to "
                "11% for the small-value tilt: heavier Japan (15%) and Europe, "
                "against the UK at 0%."
            ),
        ),
    ),
    RegionWithholding(
        region="emerging",
        rate=SourcedFloat(
            value=0.130,
            source=Provenance.derived,
            note=(
                "Cap-weighted across Taiwan 21%, Korea 15.4%, India 20%, "
                "China 10%, Brazil 0%, South Africa 20%, Mexico 10%. The single "
                "highest-leverage input: benefit moves 1:1 with it, and above "
                "~15.2% AVES and AVDV swap rank."
            ),
        ),
    ),
    RegionWithholding(
        region="domestic",
        rate=SourcedFloat(
            value=0.0,
            source=Provenance.stated,
            note="US funds pay no foreign withholding.",
        ),
    ),
]

DEFAULT_FUNDS: List[FundAssumption] = [
    FundAssumption(
        ticker="AVUV",
        region="domestic",
        gross_yield=SourcedFloat(
            value=0.0170,
            source=Provenance.derived,
            note=(
                "US market ~1.35% structural, compressed by buybacks; small-cap "
                "discount ~-20bp (many non-payers); value screen ~+60bp. "
                "Realized calendar-year yields 2020-25 averaged 1.65% in a tight "
                "1.38-1.90% band with no trend."
            ),
        ),
        qualified_pct=SourcedFloat(
            value=0.95,
            source=Provenance.derived,
            note=(
                "US equities qualify except REITs. A small-cap value screen pulls "
                "in a modest REIT sleeve, so ~5% non-qualified."
            ),
        ),
        foreign_share=SourcedFloat(
            value=0.0,
            source=Provenance.stated,
            note="US-only mandate.",
        ),
    ),
    FundAssumption(
        ticker="AVDV",
        region="developed",
        gross_yield=SourcedFloat(
            value=0.0350,
            source=Provenance.derived,
            note=(
                "EAFE ~3.1% structural (persistently higher payout culture); "
                "small-cap discount to ~2.7%; value tilt ~+90bp. The 2020-25 mean "
                "of 3.15% is depressed by the 2020-21 European bank dividend "
                "bans; the 2022-25 mean is 3.62%."
            ),
        ),
        qualified_pct=SourcedFloat(
            value=0.92,
            source=Provenance.derived,
            note=(
                "Developed markets are almost entirely US-treaty countries "
                "(Japan, UK, Australia, Canada, Western Europe). Small haircut "
                "for non-qualifying structures and holding-period failures."
            ),
        ),
        foreign_share=SourcedFloat(
            value=1.0,
            source=Provenance.stated,
            note="Ex-US mandate.",
        ),
    ),
    FundAssumption(
        ticker="AVES",
        region="emerging",
        gross_yield=SourcedFloat(
            value=0.0360,
            source=Provenance.derived,
            note=(
                "EM ~2.7% structural; value tilt ~+100bp (EM value skews to "
                "banks, materials, telecom and state-owned enterprises with high "
                "payout ratios). Realized 2022-25 averaged 3.75% but trends down "
                "from 4.17% as recent payouts normalize."
            ),
        ),
        qualified_pct=SourcedFloat(
            value=0.73,
            source=Provenance.derived,
            note=(
                "Treaty-driven. Taiwan (~19% of EM value) has NO US tax treaty -- "
                "the Expedited Double-Tax Relief Act passed the House in Jan 2025 "
                "but is not enacted and requires a reciprocity determination. "
                "Brazil (~5%) has none either. With smaller non-treaty markets, "
                "~27% is non-qualified. This is what puts AVES on top."
            ),
        ),
        foreign_share=SourcedFloat(
            value=1.0,
            source=Provenance.stated,
            note="Ex-US mandate.",
        ),
    ),
]

DEFAULT_ACCOUNTS: List[AccountContribution] = [
    AccountContribution(
        name="401k + Roth 401k, employee",
        amount=24_500.0,
        character=AccountCharacter.sheltered,
    ),
    AccountContribution(
        name="Employer match",
        amount=8_000.0,
        character=AccountCharacter.sheltered,
    ),
    AccountContribution(
        name="Mega backdoor Roth",
        amount=36_000.0,
        character=AccountCharacter.sheltered,
    ),
    AccountContribution(
        name="Brokerage",
        amount=50_000.0,
        character=AccountCharacter.taxable,
    ),
]

DEFAULT_TARGET_SPLIT: Dict[str, float] = {
    "AVUV": 0.64,
    "AVDV": 0.25,
    "AVES": 0.11,
}


def default_request() -> PlacementRequest:
    return PlacementRequest(
        tax=TaxInputs(),
        growth=GrowthInputs(),
        funds=[f.model_copy(deep=True) for f in DEFAULT_FUNDS],
        withholding=[w.model_copy(deep=True) for w in DEFAULT_WITHHOLDING],
        accounts=[a.model_copy(deep=True) for a in DEFAULT_ACCOUNTS],
        target_split=dict(DEFAULT_TARGET_SPLIT),
    )

"""Asset placement: which account should each fund's contribution go into?

Three stages, matching the three panels.

  1. Per-fund tax drag in each of the two account characters.
  2. Vanilla (every account holds the target split) vs optimal (greedy fill).
  3. Both strategies compounded forward, re-solving placement each year.

No LP. The cost matrix has exactly two distinct columns, and a transportation
problem with two columns is solved exactly by sorting rows on the cost
difference and filling the cheaper column greedily. See `solve_placement`.
"""
from dataclasses import dataclass
from typing import Dict, List, Tuple

from ..core.placement_models import (
    AccountCharacter,
    AccountContribution,
    FundAssumption,
    PlacementRequest,
    RegionWithholding,
    TaxInputs,
)
from . import tax_tables as tt


@dataclass(frozen=True)
class MarginalRates:
    """All-in marginal rates on the next dollar of dividend income.

    The state rate enters BOTH: a flat state tax gives qualified dividends no
    preferential treatment. NIIT likewise applies to investment income of either
    character. Because they appear in both, they cancel out of the
    qualified/ordinary blend -- which is why `benefit` is affine in the state
    rate with slope equal to the distribution yield.
    """
    taxable_income: float
    standard_deduction: float
    fed_ordinary: float
    fed_ltcg: float
    niit: float
    state_rate: float

    @property
    def ordinary(self) -> float:
        return self.fed_ordinary + self.state_rate + self.niit

    @property
    def qualified(self) -> float:
        return self.fed_ltcg + self.state_rate + self.niit


@dataclass(frozen=True)
class FundDrag:
    ticker: str
    gross_yield: float
    qualified_pct: float
    foreign_share: float
    withholding_rate: float
    # phi = q * foreign_share * withholding. Foreign tax actually paid.
    foreign_tax: float
    # kappa*qual + (1-kappa)*ord
    blended_rate: float
    # q * blended, the US tax on the dividend in a brokerage.
    us_tax: float
    drag_taxable: float
    drag_sheltered: float
    benefit: float


def resolve_rates(tax: TaxInputs) -> MarginalRates:
    """Derive marginal rates from gross compensation. Never asked for directly."""
    std = tt.STANDARD_DEDUCTION_2025[tax.filing_status]
    taxable_income = tax.gross_comp - std - tax.pre_tax_deferral
    return MarginalRates(
        taxable_income=taxable_income,
        standard_deduction=std,
        fed_ordinary=tt.marginal_ordinary_rate(taxable_income, tax.filing_status),
        fed_ltcg=tt.marginal_ltcg_rate(taxable_income, tax.filing_status),
        niit=tt.NIIT_RATE if tt.niit_applies(tax.gross_comp, tax.filing_status) else 0.0,
        state_rate=tax.state_rate,
    )


def fund_drag(
    fund: FundAssumption,
    rates: MarginalRates,
    withholding: Dict[str, float],
    ftc_recovery: float,
) -> FundDrag:
    """Annual drag on one fund, as a fraction of assets, in each account character.

        phi            = q * foreign_share * withholding
        blended        = kappa*qual + (1-kappa)*ord
        drag_taxable   = phi + q*blended - phi*recovery
        drag_sheltered = phi
        benefit        = q*blended - phi*recovery

    The foreign tax credit enters ONCE, not twice. The fund pays phi inside a
    Roth exactly as it does in a brokerage -- a shelter does not exempt foreign
    withholding. Only the forfeited credit is incremental to sheltering. At full
    recovery `drag_taxable` reduces to q*blended.

    Subtracting the credit on the taxable side WITHOUT charging the withholding
    there would double-count phi and can manufacture a false three-way tie.
    """
    q = fund.gross_yield.value
    kappa = fund.qualified_pct.value
    w_f = fund.foreign_share.value
    t_wh = withholding.get(fund.region, 0.0)

    phi = q * w_f * t_wh
    blended = kappa * rates.qualified + (1.0 - kappa) * rates.ordinary
    us_tax = q * blended

    drag_taxable = phi + us_tax - phi * ftc_recovery
    drag_sheltered = phi
    benefit = us_tax - phi * ftc_recovery

    return FundDrag(
        ticker=fund.ticker,
        gross_yield=q,
        qualified_pct=kappa,
        foreign_share=w_f,
        withholding_rate=t_wh,
        foreign_tax=phi,
        blended_rate=blended,
        us_tax=us_tax,
        drag_taxable=drag_taxable,
        drag_sheltered=drag_sheltered,
        benefit=benefit,
    )


def build_drag_matrix(request: PlacementRequest) -> Tuple[MarginalRates, List[FundDrag]]:
    rates = resolve_rates(request.tax)
    withholding = {w.region: w.rate.value for w in request.withholding}
    drags = [
        fund_drag(f, rates, withholding, request.tax.ftc_recovery) for f in request.funds
    ]
    return rates, drags


# ---------------------------------------------------------------------------
# Placement
# ---------------------------------------------------------------------------

def capacities(accounts: List[AccountContribution]) -> Tuple[float, float]:
    """(sheltered, taxable) dollars available."""
    sheltered = sum(
        a.amount for a in accounts if a.character == AccountCharacter.sheltered
    )
    taxable = sum(a.amount for a in accounts if a.character == AccountCharacter.taxable)
    return sheltered, taxable


def solve_placement(
    fund_targets: Dict[str, float],
    drags: List[FundDrag],
    sheltered_capacity: float,
) -> Dict[str, float]:
    """Greedy fill of sheltered space, highest benefit first. Exactly optimal.

    With only two columns, minimising total cost is equivalent to maximising
    the benefit captured by whatever sits in the cheaper (sheltered) column,
    subject to that column's capacity. That is a fractional knapsack whose items
    all have unit weight-per-dollar, so sorting on benefit and filling greedily
    is optimal -- no solver required.

    Returns ticker -> dollars placed in the sheltered column. The taxable
    remainder is `target - sheltered`, which keeps allocation identical across
    strategies by construction.
    """
    remaining = max(0.0, sheltered_capacity)
    placed: Dict[str, float] = {}
    for d in sorted(drags, key=lambda x: x.benefit, reverse=True):
        target = fund_targets.get(d.ticker, 0.0)
        take = min(target, remaining)
        placed[d.ticker] = take
        remaining -= take
    return placed


def vanilla_placement(
    fund_targets: Dict[str, float], sheltered_capacity: float, total: float
) -> Dict[str, float]:
    """Every account holds the target split, so each fund is sheltered pro rata."""
    share = (sheltered_capacity / total) if total > 0 else 0.0
    return {t: v * share for t, v in fund_targets.items()}


def strategy_drag(
    sheltered: Dict[str, float],
    fund_targets: Dict[str, float],
    drags: List[FundDrag],
) -> float:
    """Annual drag in dollars for one placement."""
    by_ticker = {d.ticker: d for d in drags}
    total = 0.0
    for ticker, target in fund_targets.items():
        d = by_ticker.get(ticker)
        if d is None:
            continue
        in_shelter = sheltered.get(ticker, 0.0)
        in_taxable = target - in_shelter
        total += in_shelter * d.drag_sheltered + in_taxable * d.drag_taxable
    return total


# ---------------------------------------------------------------------------
# Growth
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class GrowthYear:
    year: int
    vanilla_total: float
    optimal_total: float
    gap: float


def _bucket_drags(
    sheltered: Dict[str, float],
    fund_targets: Dict[str, float],
    drags: List[FundDrag],
) -> Tuple[float, float]:
    """Weighted drag rate of the sheltered bucket and of the taxable bucket."""
    by_ticker = {d.ticker: d for d in drags}
    s_val = s_drag = t_val = t_drag = 0.0
    for ticker, target in fund_targets.items():
        d = by_ticker.get(ticker)
        if d is None:
            continue
        in_shelter = sheltered.get(ticker, 0.0)
        in_taxable = target - in_shelter
        s_val += in_shelter
        s_drag += in_shelter * d.drag_sheltered
        t_val += in_taxable
        t_drag += in_taxable * d.drag_taxable
    return (
        (s_drag / s_val) if s_val > 0 else 0.0,
        (t_drag / t_val) if t_val > 0 else 0.0,
    )


def project(
    request: PlacementRequest,
    drags: List[FundDrag],
    split: Dict[str, float],
) -> List[GrowthYear]:
    """Compound both strategies, re-solving placement each year.

    The two buckets grow at different rates, so the sheltered share drifts away
    from its contribution-flow value. Re-solving on cumulative balances rather
    than once on the flow is a small effect over 40 years, but it is free.
    """
    sheltered_cap, taxable_cap = capacities(request.accounts)
    annual_total = sheltered_cap + taxable_cap
    r = request.growth.real_return

    van_s = van_t = opt_s = opt_t = 0.0
    rows: List[GrowthYear] = [
        GrowthYear(year=0, vanilla_total=0.0, optimal_total=0.0, gap=0.0)
    ]

    for year in range(1, max(0, request.growth.years) + 1):
        van_s += sheltered_cap
        van_t += taxable_cap
        opt_s += sheltered_cap
        opt_t += taxable_cap

        # Re-solve on cumulative balances. Fund targets scale with the balance,
        # so the target split is enforced on the whole portfolio every year.
        van_balance = van_s + van_t
        opt_balance = opt_s + opt_t

        van_targets = {t: van_balance * w for t, w in split.items()}
        van_sheltered = vanilla_placement(van_targets, van_s, van_balance)
        van_sd, van_td = _bucket_drags(van_sheltered, van_targets, drags)

        opt_targets = {t: opt_balance * w for t, w in split.items()}
        opt_sheltered = solve_placement(opt_targets, drags, opt_s)
        opt_sd, opt_td = _bucket_drags(opt_sheltered, opt_targets, drags)

        van_s *= 1.0 + r - van_sd
        van_t *= 1.0 + r - van_td
        opt_s *= 1.0 + r - opt_sd
        opt_t *= 1.0 + r - opt_td

        rows.append(
            GrowthYear(
                year=year,
                vanilla_total=van_s + van_t,
                optimal_total=opt_s + opt_t,
                gap=(opt_s + opt_t) - (van_s + van_t),
            )
        )

    return rows

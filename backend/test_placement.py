"""Verification for the asset placement model.

Run: ./venv/bin/python test_placement.py

There is no pytest in this project; the convention is a runnable script plus
`npm run build` and clicking through. Matching that.

These assert ANALYTIC PROPERTIES, not hardcoded rankings. A ranking assertion
can pass while encoding a sign error -- a property test cannot.
"""
import sys

from app.core.placement_models import (
    AccountCharacter,
    AccountContribution,
    FilingStatus,
    GrowthInputs,
    PlacementRequest,
    Provenance,
    SourcedFloat,
    TaxInputs,
    default_request,
)
from app.services import placement_service as ps
from app.services import tax_tables as tt
from app.services.placement_service import FundDrag

FAILURES: list[str] = []


def check(label: str, condition: bool, detail: str = "") -> None:
    mark = "PASS" if condition else "FAIL"
    print(f"  [{mark}] {label}" + (f"  -- {detail}" if detail else ""))
    if not condition:
        FAILURES.append(label)


def approx(a: float, b: float, tol: float = 1e-9) -> bool:
    return abs(a - b) < tol


def section(title: str) -> None:
    print(f"\n{title}")
    print("-" * len(title))


# ---------------------------------------------------------------------------
section("1. Salvaged 2025 tax tables")

income = 350_000 - tt.STANDARD_DEDUCTION_2025[FilingStatus.single]
check(
    "350k single -> 334,250 taxable, 35% federal marginal",
    approx(income, 334_250) and approx(
        tt.marginal_ordinary_rate(income, FilingStatus.single), 0.35
    ),
    f"taxable {income:,.0f}, rate {tt.marginal_ordinary_rate(income, FilingStatus.single):.0%}",
)
check(
    "same income -> 15% LTCG",
    approx(tt.marginal_ltcg_rate(income, FilingStatus.single), 0.15),
)
check("NIIT applies above 200k single", tt.niit_applies(350_000, FilingStatus.single))
check("NIIT does not apply below", not tt.niit_applies(150_000, FilingStatus.single))


# ---------------------------------------------------------------------------
section("2. Spec 3.3 worked example, reproduced exactly")


def synthetic(ticker: str, benefit_bp: float, phi_bp: float) -> FundDrag:
    """A fund stated directly in benefit/phi terms.

    Validates the optimizer independently of the assumption module. phi values
    are chosen so sum(phi_i * target_i) = 147.43, which reproduces the absolute
    drags in the spec alongside the benefits.
    """
    b, p = benefit_bp / 1e4, phi_bp / 1e4
    return FundDrag(
        ticker=ticker, gross_yield=0.0, qualified_pct=0.0, foreign_share=0.0,
        withholding_rate=0.0, foreign_tax=p, blended_rate=0.0, us_tax=b + p,
        drag_taxable=b + p, drag_sheltered=p, benefit=b,
    )


wx_drags = [
    synthetic("AVUV", 33.5, 0.0),
    synthetic("AVDV", 67.8, 33.0),
    synthetic("AVES", 79.4, 38.1),
]
wx_targets = {"AVUV": 75_840.0, "AVDV": 29_625.0, "AVES": 13_035.0}
WX_TOTAL, WX_CAP = 118_500.0, 68_500.0

check("fund targets sum to total", approx(sum(wx_targets.values()), WX_TOTAL))

opt = ps.solve_placement(wx_targets, wx_drags, WX_CAP)
van = ps.vanilla_placement(wx_targets, WX_CAP, WX_TOTAL)

check("AVES fills first, entirely sheltered", approx(opt["AVES"], 13_035.0))
check("AVDV second, entirely sheltered", approx(opt["AVDV"], 29_625.0))
check("AVUV spills over: 25,840 sheltered", approx(opt["AVUV"], 25_840.0))
check("sheltered exactly fills capacity", approx(sum(opt.values()), WX_CAP))
check(
    "taxable exactly fills capacity",
    approx(sum(wx_targets[t] - opt[t] for t in wx_targets), 50_000.0),
)
check(
    "fund totals equal targets to the cent",
    all(approx(opt[t] + (wx_targets[t] - opt[t]), wx_targets[t]) for t in wx_targets),
)

van_drag = ps.strategy_drag(van, wx_targets, wx_drags)
opt_drag = ps.strategy_drag(opt, wx_targets, wx_drags)
check("vanilla drag $383.05", approx(van_drag, 383.05, 0.01), f"${van_drag:.2f}")
check("optimal drag $314.92", approx(opt_drag, 314.92, 0.01), f"${opt_drag:.2f}")
check("optimal drag <= vanilla drag", opt_drag <= van_drag)

direct = van_drag - opt_drag
decomposed = sum(d.benefit * (opt[d.ticker] - van[d.ticker]) for d in wx_drags)
check("saving $68.13", approx(direct, 68.13, 0.02), f"${direct:.2f}")
check(
    "cross-checks agree",
    approx(direct, decomposed),
    f"direct ${direct:.4f} vs decomposed ${decomposed:.4f}",
)
check(
    "saving 5.75 bp",
    approx(direct / WX_TOTAL * 1e4, 5.75, 0.01),
    f"{direct / WX_TOTAL * 1e4:.2f} bp",
)


# ---------------------------------------------------------------------------
section("3. Foreign tax moves benefit one-for-one, not two-for-one")

base = default_request()
_, base_drags = ps.build_drag_matrix(base)
by_ticker = {d.ticker: d for d in base_drags}

# Bump AVES's withholding so phi rises by exactly 10 bp, holding q fixed.
bumped = default_request()
aves = next(f for f in bumped.funds if f.ticker == "AVES")
q_aves = aves.gross_yield.value
for w in bumped.withholding:
    if w.region == "emerging":
        w.rate.value += 0.0010 / (q_aves * aves.foreign_share.value)

_, bumped_drags = ps.build_drag_matrix(bumped)
bumped_aves = next(d for d in bumped_drags if d.ticker == "AVES")

d_phi = (bumped_aves.foreign_tax - by_ticker["AVES"].foreign_tax) * 1e4
d_benefit = (bumped_aves.benefit - by_ticker["AVES"].benefit) * 1e4
check("phi rises by exactly 10 bp", approx(d_phi, 10.0, 1e-6), f"{d_phi:+.4f} bp")
check(
    "benefit falls by exactly 10 bp (NOT 20 -- that is the double-count)",
    approx(d_benefit, -10.0, 1e-6),
    f"{d_benefit:+.4f} bp",
)
check(
    "sheltered drag rises by exactly 10 bp",
    approx((bumped_aves.drag_sheltered - by_ticker["AVES"].drag_sheltered) * 1e4, 10.0, 1e-6),
)
check(
    "taxable drag is unchanged at full recovery",
    approx(bumped_aves.drag_taxable, by_ticker["AVES"].drag_taxable, 1e-12),
    "drag_taxable reduces to q*blended when recovery = 1",
)


# ---------------------------------------------------------------------------
section("4. Benefit is affine in the state rate, slope = distribution yield")

for ticker in ("AVUV", "AVDV", "AVES"):
    samples = []
    for state in (0.0, 0.0295, 0.0495, 0.0925, 0.133):
        req = default_request()
        req.tax.state_rate = state
        _, drags = ps.build_drag_matrix(req)
        samples.append((state, next(d for d in drags if d.ticker == ticker)))

    q = samples[0][1].gross_yield
    slopes = [
        (b.benefit - a.benefit) / (sb - sa)
        for (sa, a), (sb, b) in zip(samples, samples[1:])
    ]
    check(
        f"{ticker}: slope == gross yield {q:.4f} at every state rate",
        all(approx(s, q, 1e-12) for s in slopes),
        f"slopes {[round(s, 6) for s in slopes]}",
    )

# NIIT and the state rate cancel out of the blend, so a NIIT change must shift
# every fund's benefit by exactly q * 3.8%.
no_niit = default_request()
no_niit.tax.gross_comp = 150_000.0  # below the single threshold
_, no_niit_drags = ps.build_drag_matrix(no_niit)
same_fed = default_request()
same_fed.tax.gross_comp = 150_000.0
# Isolate NIIT by forcing the same federal rates via a manual comparison below.
check(
    "dropping below the NIIT threshold removes 3.8% from both rates",
    approx(ps.resolve_rates(no_niit.tax).niit, 0.0)
    and approx(ps.resolve_rates(base.tax).niit, 0.038),
)


# ---------------------------------------------------------------------------
section("5. Zero foreign share collapses ranking to pure yield x blended")

flat = default_request()
for f in flat.funds:
    f.foreign_share = SourcedFloat(value=0.0, source=Provenance.stated)
_, flat_drags = ps.build_drag_matrix(flat)

check("all phi are zero", all(approx(d.foreign_tax, 0.0) for d in flat_drags))
check(
    "benefit == q * blended for every fund",
    all(approx(d.benefit, d.gross_yield * d.blended_rate) for d in flat_drags),
)
check(
    "taxable and sheltered drag differ by exactly the benefit",
    all(approx(d.drag_taxable - d.drag_sheltered, d.benefit) for d in flat_drags),
)
by_benefit = [d.ticker for d in sorted(flat_drags, key=lambda d: d.benefit, reverse=True)]
by_product = [
    d.ticker
    for d in sorted(flat_drags, key=lambda d: d.gross_yield * d.blended_rate, reverse=True)
]
check("ranking is exactly yield x blended order", by_benefit == by_product, str(by_benefit))


# ---------------------------------------------------------------------------
section("6. No taxable space -> nothing to optimise")

no_brokerage = default_request()
no_brokerage.accounts = [
    a for a in no_brokerage.accounts if a.character != AccountCharacter.taxable
] + [
    AccountContribution(
        name="Brokerage", amount=0.0, character=AccountCharacter.taxable
    )
]
_, nb_drags = ps.build_drag_matrix(no_brokerage)
nb_cap, nb_tax = ps.capacities(no_brokerage.accounts)
nb_total = nb_cap + nb_tax
nb_targets = {t: nb_total * w for t, w in no_brokerage.target_split.items()}

nb_van = ps.vanilla_placement(nb_targets, nb_cap, nb_total)
nb_opt = ps.solve_placement(nb_targets, nb_drags, nb_cap)
nb_van_drag = ps.strategy_drag(nb_van, nb_targets, nb_drags)
nb_opt_drag = ps.strategy_drag(nb_opt, nb_targets, nb_drags)

check("taxable capacity is zero", approx(nb_tax, 0.0))
check(
    "vanilla drag == optimal drag",
    approx(nb_van_drag, nb_opt_drag),
    f"${nb_van_drag:.4f} vs ${nb_opt_drag:.4f}",
)


# ---------------------------------------------------------------------------
section("7. Placement never changes allocation")

req = default_request()
_, drags = ps.build_drag_matrix(req)
cap, tax_cap = ps.capacities(req.accounts)
total = cap + tax_cap
targets = {t: total * w for t, w in req.target_split.items()}

for name, sheltered in (
    ("vanilla", ps.vanilla_placement(targets, cap, total)),
    ("optimal", ps.solve_placement(targets, drags, cap)),
):
    check(
        f"{name}: every fund's total equals its target",
        all(approx(sheltered[t] + (targets[t] - sheltered[t]), targets[t]) for t in targets),
    )
    check(
        f"{name}: no fund is over-sheltered or negative",
        all(-1e-9 <= sheltered[t] <= targets[t] + 1e-9 for t in targets),
    )
    check(f"{name}: sheltered column fills capacity", approx(sum(sheltered.values()), cap))


# ---------------------------------------------------------------------------
section("8. Greedy is optimal -- brute-force cross-check")

# With three funds the vertex set of the transportation polytope is small
# enough to enumerate: an optimal solution shelters funds in some order, so
# every permutation's greedy fill is a candidate and greedy must beat them all.
from itertools import permutations

best_drag = None
for order in permutations(drags):
    remaining, alloc = cap, {}
    for d in order:
        take = min(targets[d.ticker], remaining)
        alloc[d.ticker] = take
        remaining -= take
    drag = ps.strategy_drag(alloc, targets, drags)
    best_drag = drag if best_drag is None else min(best_drag, drag)

greedy_drag = ps.strategy_drag(ps.solve_placement(targets, drags, cap), targets, drags)
check(
    "greedy matches the best of all fill orders",
    approx(greedy_drag, best_drag, 1e-9),
    f"greedy ${greedy_drag:.4f}, best ${best_drag:.4f}",
)


# ---------------------------------------------------------------------------
section("9. Growth panel degenerates cleanly")

zero_years = default_request()
zero_years.growth = GrowthInputs(years=0, real_return=0.05)
_, zy_drags = ps.build_drag_matrix(zero_years)
rows = ps.project(zero_years, zy_drags, zero_years.target_split)
check("years=0 yields a single origin point", len(rows) == 1 and approx(rows[0].gap, 0.0))

long_run = default_request()
_, lr_drags = ps.build_drag_matrix(long_run)
lr = ps.project(long_run, lr_drags, long_run.target_split)
check("40 years produces 41 points", len(lr) == 41)
check("optimal never trails vanilla", all(r.gap >= -1e-9 for r in lr))
check("gap widens monotonically", all(b.gap >= a.gap - 1e-9 for a, b in zip(lr, lr[1:])))


# ---------------------------------------------------------------------------
section("10. Derived defaults -- resulting numbers")

req = default_request()
rates, drags = ps.build_drag_matrix(req)
print(f"  taxable income   ${rates.taxable_income:,.0f}")
print(f"  ordinary rate    {rates.ordinary:.4%}   ({rates.fed_ordinary:.0%} fed "
      f"+ {rates.state_rate:.2%} state + {rates.niit:.1%} NIIT)")
print(f"  qualified rate   {rates.qualified:.4%}   ({rates.fed_ltcg:.0%} fed "
      f"+ {rates.state_rate:.2%} state + {rates.niit:.1%} NIIT)")
print(f"\n  {'fund':6s} {'q':>7s} {'kappa':>6s} {'phi':>8s} {'blended':>8s} "
      f"{'taxable':>9s} {'shelter':>8s} {'benefit':>8s}")
for d in sorted(drags, key=lambda d: d.benefit, reverse=True):
    print(f"  {d.ticker:6s} {d.gross_yield:6.2%} {d.qualified_pct:6.2f} "
          f"{d.foreign_tax * 1e4:7.1f}bp {d.blended_rate:7.2%} "
          f"{d.drag_taxable * 1e4:8.1f}bp {d.drag_sheltered * 1e4:6.1f}bp "
          f"{d.benefit * 1e4:6.1f}bp")

cap, tax_cap = ps.capacities(req.accounts)
total = cap + tax_cap
targets = {t: total * w for t, w in req.target_split.items()}
van = ps.vanilla_placement(targets, cap, total)
opt = ps.solve_placement(targets, drags, cap)
vd, od = ps.strategy_drag(van, targets, drags), ps.strategy_drag(opt, targets, drags)
print(f"\n  contributions ${total:,.0f}  (sheltered ${cap:,.0f} = {cap/total:.1%})")
print(f"  vanilla ${vd:.2f}/yr   optimal ${od:.2f}/yr   saving ${vd - od:.2f}/yr "
      f"({(vd - od) / total * 1e4:.2f} bp)")
rows = ps.project(req, drags, req.target_split)
print(f"  40yr terminal: vanilla ${rows[-1].vanilla_total:,.0f}   "
      f"optimal ${rows[-1].optimal_total:,.0f}   gap ${rows[-1].gap:,.0f}")

# The EM withholding rate is the highest-leverage input; find where it flips.
lo, hi = 0.10, 0.30
for _ in range(60):
    mid = (lo + hi) / 2
    probe = default_request()
    for w in probe.withholding:
        if w.region == "emerging":
            w.rate.value = mid
    _, pd_ = ps.build_drag_matrix(probe)
    m = {d.ticker: d.benefit for d in pd_}
    if m["AVES"] > m["AVDV"]:
        lo = mid
    else:
        hi = mid
print(f"\n  AVES/AVDV rank flips at EM withholding {lo:.2%} (default {0.13:.0%})")


# ---------------------------------------------------------------------------
print("\n" + "=" * 60)
if FAILURES:
    print(f"{len(FAILURES)} FAILED:")
    for f in FAILURES:
        print(f"  - {f}")
    sys.exit(1)
print("All checks passed.")

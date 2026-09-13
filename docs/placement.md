# Asset Placement Calculator

A single-purpose dashboard at `/placement`. Given a fixed annual contribution
schedule and a fixed target fund split, it answers one question: **which account
should each fund's contribution go into, to minimise tax drag?**

The portfolio is AVUV / AVDV / AVES at a fixed target split. AVDV and AVES yield
far more than AVUV and pay foreign withholding, so where each fund lands changes
after-tax return even though the portfolio-level weights are identical
everywhere.

Out of scope by design: current holdings, rebalancing, drift, transition trades,
capital gains on sale, the traditional-vs-Roth election, withdrawal modelling,
RMDs, and multi-scenario storage. All inputs are ephemeral React state — nothing
is persisted.

## The model

### Marginal rates

Derived from gross compensation, never asked for directly.

```
taxable_income = gross_comp − standard_deduction − pre_tax_deferral
fed_ordinary   = ordinary bracket lookup(taxable_income, filing_status)
fed_ltcg       = LTCG bracket lookup(taxable_income, filing_status)   # 0/15/20
niit           = 3.8% if gross_comp > NIIT threshold else 0

ord  = fed_ordinary + state_rate + niit
qual = fed_ltcg     + state_rate + niit
```

The state rate enters **both**: a flat state tax gives qualified dividends no
preferential treatment.

At the defaults ($350,000 single, IL 4.95%), taxable income is $334,250, which
lands between $250,525 and $626,350 → 35% federal, so `ord` = 43.75% and
`qual` = 23.75%.

### Per-fund drag

For fund *i* with gross yield `q`, qualified share `κ`, foreign holdings share
`w_f`, and regional withholding rate `t_wh`:

```
φ              = q · w_f · t_wh                  # foreign tax paid
blended        = κ · qual + (1 − κ) · ord

drag_taxable   = φ + q · blended − φ · recovery
drag_sheltered = φ
benefit        = q · blended − φ · recovery
```

**The foreign tax credit enters once, not twice.** The fund pays φ inside a Roth
exactly as it does in a brokerage — a shelter does not exempt foreign
withholding. Only the *forfeited credit* is incremental to sheltering. At full
recovery `drag_taxable` reduces to `q · blended`.

Subtracting the credit on the taxable side without charging the withholding there
double-counts φ and can manufacture a false three-way tie. `test_placement.py`
asserts the correct behaviour as a property: bumping a fund's φ by 10 bp must
move its benefit by exactly −10 bp, not −20.

Roth and traditional are the same column. Both charge φ and neither taxes
dividends, so 401k / Roth 401k / mega-backdoor render as one **Sheltered**
column, with the brokerage as the only other.

`recovery` defaults to 1.0 and is an input: above $300 of foreign tax a single
filer files Form 1116, which caps the credit at US tax on foreign-source income.
It rarely binds at a 35% federal rate against ~13% withholding.

### Why greedy is exactly optimal

The cost matrix has only two distinct columns. A transportation problem with two
columns is solved exactly by sorting rows on the cost difference and filling the
cheaper column greedily. Adding an LP solver for this would be unjustified, so
there is no scipy dependency. `test_placement.py` cross-checks greedy against a
brute-force enumeration of every fill order.

### Growth

Two buckets compounded separately, contributions added annually, each growing at
`return − its own weighted drag`. Placement is re-solved **each year on
cumulative balances**, not once on the contribution flow: the two buckets
compound at different rates, so the sheltered share drifts. Small over 40 years,
but free to do correctly.

## Fund assumptions — provenance

These are derived openly, not inherited. Every field carries a visible source
string (`fetched` / `derived` / `stated`); anything left `unsourced` renders
flagged in red and raises an API warning, so a guess can never present itself as
sourced data.

The model input is a **long-run (~40 year) assumption, not a spot yield**. A
trailing 12-month yield is the wrong input for a 40-year projection: it moves
inversely with price, so it overstates after a drawdown and understates after a
run-up. TTM is fetched via yfinance, cached to `.cache/reference_yields.json`,
and displayed only as a reference column beside the assumption.

### Yields

Anchored on realized calendar-year yields — distributions ÷ **average** price
that year, which neutralises the price-inverse problem.

| Year | AVUV | AVDV | AVES |
|---|---|---|---|
| 2020 | 1.55% | 2.02% | — |
| 2021 | 1.38% | 2.41% | — |
| 2022 | 1.71% | 3.09% | 3.42% |
| 2023 | 1.90% | 3.51% | 4.17% |
| 2024 | 1.67% | 4.26% | 3.91% |
| 2025 | 1.71% | 3.61% | 3.51% |
| **mean** | **1.65%** | **3.15%** | **3.75%** |

Built from three components:

- **AVUV → 1.70%.** US market ~1.35% structural, compressed by buybacks;
  small-cap discount ~−20 bp (many non-payers); value screen ~+60 bp. Realized
  yields sit in a tight 1.38–1.90% band with no trend.
- **AVDV → 3.50%.** EAFE ~3.1% structural (persistently higher payout culture);
  small-cap discount to ~2.7%; value tilt ~+90 bp. The 6-year mean of 3.15% is
  depressed by the 2020–21 European bank dividend bans; the 2022–25 mean is
  3.62%.
- **AVES → 3.60%.** EM ~2.7% structural; value tilt ~+100 bp (EM value skews to
  banks, materials, telecom and state-owned enterprises with high payout ratios).
  Realized 2022–25 averaged 3.75% but trends down from 4.17% as recent payouts
  normalize.

### Foreign tax

Modelled structurally so it scales with the yield instead of drifting
independently: `φ = q × foreign_share × avg_withholding`. `foreign_share` is 0
for AVUV and 1.0 for AVDV/AVES. Withholding is one editable rate per region — a
far more auditable quantity than a raw bp figure.

- **Developed → 11.0%.** MSCI EAFE weighted average is 10.49%; nudged up for the
  small-value tilt (heavier Japan at 15% and Europe, against the UK at 0%).
- **Emerging → 13.0%.** Cap-weighted across Taiwan 21%, Korea 15.4%, India 20%,
  China 10%, Brazil 0%, South Africa 20%, Mexico 10%.

### Qualified share

Driven by tax-treaty coverage.

- **AVUV → 0.95.** US equities qualify except REITs; a small-cap value screen
  pulls in a modest REIT sleeve.
- **AVDV → 0.92.** Developed markets are almost entirely US-treaty countries.
  Small haircut for non-qualifying structures and holding-period failures.
- **AVES → 0.73.** Taiwan (~19% of EM value) has **no US tax treaty** — the
  Expedited Double-Tax Relief Act passed the House in Jan 2025 but is not
  enacted and requires a reciprocity determination. Brazil (~5%) has none
  either. With smaller non-treaty markets, ~27% is non-qualified.

That last number is what puts AVES on top.

## Resulting answer, and its error bars

| Fund | q | κ | φ | Taxable | Sheltered | Benefit |
|---|---|---|---|---|---|---|
| AVES | 3.60% | 0.73 | 46.8 bp | 104.9 bp | 46.8 bp | **58.1 bp** |
| AVDV | 3.50% | 0.92 | 38.5 bp | 88.7 bp | 38.5 bp | **50.2 bp** |
| AVUV | 1.70% | 0.95 | 0.0 bp | 42.1 bp | 0.0 bp | **42.1 bp** |

On $118,500 of contributions ($68,500 sheltered = 57.8%), optimal placement
saves **$19.02/yr — 1.61 bp**, compounding to about **$39,000** of a $13.9M real
terminal balance over 40 years.

Two caveats worth stating plainly:

1. **The gain is small.** A 16 bp spread across the three funds is what the real
   assumptions support. The worked example in the spec used placeholder benefits
   spanning 46 bp and implied a $68 saving; that fixture validates the optimizer,
   it is not the answer.

2. **The AVES-vs-AVDV ranking is not robust.** `∂benefit/∂φ` is exactly −1, so
   the 7.9 bp gap between them is erased if EM withholding is **15.2%** rather
   than 13% — plausible given Taiwan at 21% and India at 20%. κ has weaker
   leverage: ±0.05 on κ moves AVES only ∓3.6 bp. AVUV ranking last *is* robust.

## Layout

Three stacked panels, each recomputing live, with every input inline in the panel
that consumes it. No settings tab, no global config drawer.

1. **Fund tax drag by account type** — funds × {Taxable, Sheltered} in bp/yr,
   plus a benefit column, with the `q · blended` decomposition shown inline so
   each cell is auditable. Carries a static formula derivation and a symbol
   glossary.
2. **Vanilla vs optimal placement** — both allocations as an account × fund
   dollar grid, each with its annual drag in dollars and bp, and the difference.
   Shows both independent routes to the saving, which must agree.
3. **Projected growth** — terminal real value under each strategy and a chart of
   the gap (more legible than two near-identical curves).

## API

| Endpoint | Purpose |
|---|---|
| `GET /api/placement/defaults` | Default inputs plus reference TTM yields |
| `GET /api/placement/reference-yields` | TTM yields alone, cached 24h |
| `POST /api/placement/solve` | Panels 1–3 in one pass |

## Verification

No pytest in this project; the convention is a runnable script plus
`npm run build` and clicking through.

```bash
cd backend && ./venv/bin/python test_placement.py
cd frontend && npm run build
```

`test_placement.py` asserts analytic properties rather than hardcoded rankings:

- The §3.3 worked example reproduced to the cent, with both cross-checks agreeing.
- φ +10 bp ⇒ benefit −10 bp exactly (not −20).
- Benefit is affine in the state rate with slope equal to the distribution yield,
  checked at five state rates — NIIT and the state rate cancel out of the blend.
- `foreign_share = 0` collapses the ranking to pure `yield × blended` order.
- Brokerage = 0 ⇒ vanilla drag equals optimal drag.
- Greedy matches a brute-force enumeration of every fill order.
- Placement never changes allocation, under either strategy.

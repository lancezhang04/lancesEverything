# Lance's Factor Portfolio Analyzer

A personal portfolio management tool that evaluates equity holdings through the lens of the **Fama-French five-factor model** — tracking current loadings, estimating expected returns, and computing optimal rebalancing trades.

Live at [lances.site/portfolio](https://lances.site/portfolio)

---

## Overview

Most retail investors hold a mix of broad market and factor-tilted ETFs without a clear picture of their aggregate factor exposure. This tool bridges that gap. Given a portfolio of ETFs and a set of return assumptions, it:

1. Computes the portfolio's **aggregate factor loadings** across all five Fama-French factors
2. Estimates **expected returns** (arithmetic and geometric, nominal and real)
3. Shows the **regional allocation** vs. a global market-cap target
4. Calculates the exact **share-level trades** needed to rebalance toward target exposures

---

## The Fama-French Five-Factor Model

The [Fama-French five-factor model](https://www.sciencedirect.com/science/article/abs/pii/S0304405X14002323) extends the original CAPM by attributing portfolio returns to five systematic risk premiums:

| Factor | Symbol | Captures |
|--------|--------|----------|
| Market excess return | **Rm-Rf** | Broad equity risk premium |
| Size | **SMB** | Small-cap premium (Small Minus Big) |
| Value | **HML** | Value premium (High Minus Low book-to-market) |
| Profitability | **RMW** | Profitability premium (Robust Minus Weak) |
| Investment | **CMA** | Investment premium (Conservative Minus Aggressive) |

Each ETF in the portfolio has a pre-configured **factor loading** for each of these factors, estimated from its historical return series relative to the Fama-French factor data. The portfolio's aggregate loading for each factor is the **value-weighted average** across all positions:

$$\beta_{\text{portfolio}} = \sum_i w_i \cdot \beta_i$$

where $w_i = V_i / V_{\text{total}}$ is the weight of holding $i$ by market value.

---

## Supported ETFs

| Ticker | Name | Region | Style |
|--------|------|--------|-------|
| **AVUV** | Avantis U.S. Small Cap Value ETF | US | Small + Value |
| **DFUS** | Dimensional US Equity ETF | US | Market (core) |
| **AVDV** | Avantis International Small Cap Value ETF | Developed | Small + Value |
| **DFAI** | Dimensional International Core Equity ETF | Developed | Market (core) |
| **AVES** | Avantis Emerging Markets Value ETF | Emerging | Value |
| **AVEM** | Avantis Emerging Markets Equity ETF | Emerging | Market (core) |

---

## Architecture

```
┌─────────────────────────────┐
│   React + TypeScript        │
│   (Vite, Tailwind, Recharts)│
│                             │
│  ┌─────┐ ┌──────┐ ┌──────┐ │
│  │Hold-│ │Factor│ │Rebal-│ │
│  │ings │ │& Ret.│ │ance  │ │
│  └──┬──┘ └──┬───┘ └──┬───┘ │
└─────┼───────┼─────────┼────┘
      │       │         │  HTTP
┌─────▼───────▼─────────▼────┐
│   FastAPI (Python)          │
│                             │
│  PortfolioService           │
│  ├─ factor loading calc     │
│  ├─ core-satellite split    │
│  └─ rebalance engine        │
│                             │
│  Data sources:              │
│  ├─ Yahoo Finance (prices)  │
│  └─ iShares ACWI (regions)  │
└─────────────────────────────┘
```

---

## Methodology

### 1. Regional Allocation Target

The global target allocation across US / Developed ex-US / Emerging markets is sourced live from the **iShares MSCI ACWI ETF** holdings CSV. The fund's country weights are bucketed into the three regions and normalized to sum to 1.0 (removing cash drag). This gives an objective, market-cap-weighted benchmark that updates dynamically.

### 2. Core-Satellite Fund Blending

Within each region, two funds typically exist — one with a high factor tilt (satellite) and one with a moderate tilt (core). The system solves for the blend that achieves the **target HML (value) loading** exactly:

$$w_{\text{satellite}} = \frac{L_{\text{target}} - L_{\text{core}}}{L_{\text{satellite}} - L_{\text{core}}}$$

For example, if the target HML loading for the US region is 0.35, AVUV (HML ≈ 0.54) and DFUS (HML ≈ 0.00) would be blended roughly 65%/35% to hit that target. The resulting blend fractions become each fund's **target proportion** of the total portfolio within that region.

### 3. Portfolio Factor Loadings

For each of the five factors, the current portfolio loading is:

$$\beta_f = \sum_i \frac{V_i}{V_{\text{total}}} \cdot \beta_{f,i}$$

Target loadings are computed the same way but using target proportions instead of current values — so they reflect where the portfolio *should* be, not where it is today.

### 4. Expected Returns

Expected returns are built up from the factor model plus user-configurable long-run premium assumptions (defaulting to academic estimates):

| Assumption | Default |
|------------|---------|
| Rm-Rf (market premium) | 5.0% |
| SMB (size premium) | 1.0% |
| HML (value premium) | 2.5% |
| RMW (profitability premium) | 2.5% |
| CMA (investment premium) | 1.5% |
| Rf (real risk-free rate) | 0.6% |
| Inflation | 2.5% |
| Portfolio volatility (σ) | 23% |

**Real arithmetic expected return:**

$$E[r_{\text{real, arith}}] = \sum_f \beta_f \cdot \lambda_f + R_f$$

where $\lambda_f$ is the premium for factor $f$ and $R_f$ is the real risk-free rate.

**Nominal arithmetic return:**

$$E[r_{\text{nom, arith}}] = (1 + E[r_{\text{real, arith}}]) \cdot (1 + \pi) - 1$$

**Real geometric return** (applying the variance drain approximation):

$$E[r_{\text{real, geo}}] = E[r_{\text{real, arith}}] - \frac{\sigma^2}{2}$$

**Nominal geometric return:**

$$E[r_{\text{nom, geo}}] = (1 + E[r_{\text{real, geo}}]) \cdot (1 + \pi) - 1$$

The geometric return is the most practically relevant figure — it reflects the **compound annual growth rate** an investor would actually experience over long horizons, reduced by the volatility drag of a 23% standard deviation portfolio.

### 5. Active Share

Active share measures how far the current portfolio has drifted from its target:

$$\text{Active Share} = \frac{1}{2} \sum_i \left| w_i - w_i^* \right|$$

A value of 0% means perfect alignment; 100% means no overlap at all. Typical drift from market moves or new contributions might show 5–15%.

### 6. Rebalancing Engine

Given an optional cash **infusion** amount:

1. Compute `total_value = current_value + infusion`
2. For each position: `target_value = target_proportion × total_value`
3. For each position: `adjustment = target_value - current_value`
4. For ETFs that **don't support fractional shares** (AVES, DFUS, DFAI): round the share adjustment to the nearest whole number; the rounding error (in dollars) is accumulated
5. The accumulated whole-share rounding error is **redistributed pro-rata** across fractional-eligible positions (AVUV, AVDV, AVEM), so the total infusion is always exact

This means every dollar of infusion is deployed — fractional positions absorb the rounding residual from whole-share positions.

---

## Worked Example

### Portfolio: Maximum Factor Loading

Consider a fully-deployed, factor-maximized portfolio:

| Ticker | Shares | Price | Value | Weight |
|--------|--------|-------|-------|--------|
| AVUV | 50 | $114.73 | $5,736.50 | 55.5% |
| AVDV | 30 | $105.53 | $3,165.90 | 30.7% |
| AVES | 20 | $63.39 | $1,267.80 | 12.3% |
| DFUS | 5 | $30.00 | $150.00 | 1.5% |

**Total portfolio value: $10,320.20**

---

### Step 1 — Factor Loading Calculation

Each ETF's factor loadings (from `config.yaml`):

| | Rm-Rf | SMB | HML | RMW | CMA |
|-|-------|-----|-----|-----|-----|
| AVUV | 1.07 | 0.89 | 0.54 | 0.28 | -0.08 |
| AVDV | 1.16 | 0.69 | 0.50 | 0.40 | -0.07 |
| AVES | 1.18 | 0.32 | 0.18 | 0.17 | 0.26 |
| DFUS | 1.00 | -0.02 | 0.00 | 0.05 | 0.04 |

Weighted average (using portfolio weights above):

$$\beta_{\text{Rm-Rf}} = 0.555 \times 1.07 + 0.307 \times 1.16 + 0.123 \times 1.18 + 0.015 \times 1.00 \approx 1.10$$

$$\beta_{\text{SMB}} = 0.555 \times 0.89 + 0.307 \times 0.69 + 0.123 \times 0.32 + 0.015 \times (-0.02) \approx 0.74$$

$$\beta_{\text{HML}} = 0.555 \times 0.54 + 0.307 \times 0.50 + 0.123 \times 0.18 + 0.015 \times 0.00 \approx 0.48$$

The portfolio carries a **strong size tilt** (SMB ≈ 0.74) and a **significant value tilt** (HML ≈ 0.48), consistent with a small-cap value strategy.

---

### Step 2 — Expected Returns (with default premiums)

**Total factor premium:**

$$\sum_f \beta_f \cdot \lambda_f = 1.10 \times 0.05 + 0.74 \times 0.01 + 0.48 \times 0.025 + \text{RMW} + \text{CMA}$$

$$\approx 0.055 + 0.0074 + 0.012 + 0.009 + (-0.001) \approx 8.3\%$$

**Real arithmetic return:**

$$E[r_{\text{real, arith}}] = 8.3\% + 0.6\% = 8.9\%$$

**Nominal arithmetic return:**

$$E[r_{\text{nom, arith}}] = (1.089)(1.025) - 1 \approx 11.6\%$$

**Variance drain** (σ = 23%):

$$\frac{\sigma^2}{2} = \frac{0.23^2}{2} \approx 2.6\%$$

**Real geometric return:**

$$E[r_{\text{real, geo}}] = 8.9\% - 2.6\% = 6.3\%$$

**Nominal geometric return (CAGR):**

$$E[r_{\text{nom, geo}}] = (1.063)(1.025) - 1 \approx 8.9\%$$

This is the **compound annual growth rate** you'd expect to see in your account over time — the headline number to compare against a simple market index fund.

**Excess premium** (over market):

$$\text{Excess} = 8.3\% - 5.0\% = +3.3\%$$

The factor tilts are expected to add roughly 3.3 percentage points annually above a plain market portfolio, before accounting for any tracking error or implementation costs.

---

### Step 3 — Rebalancing with a $1,000 Infusion

Suppose the portfolio has drifted and you want to add $1,000. After computing target proportions from the ACWI regional weights and the core-satellite blend:

| Ticker | Current | Target | Adjustment |
|--------|---------|--------|------------|
| AVUV | $5,736.50 | $6,025.43 | **+$288.93** (+2.52 shares) |
| AVDV | $3,165.90 | $3,408.07 | **+$242.17** (+2.30 shares) |
| AVES | $1,267.80 | $1,496.51 | **+$228.71** (+3 shares*) |
| DFUS | $150.00 | $390.19 | **+$240.19** (+8 shares*) |

\* AVES and DFUS don't support fractional shares — share counts are rounded to the nearest whole number, and the rounding residual is shifted into AVUV and AVDV.

After redistribution, every dollar of the $1,000 infusion is deployed. The **Whole Share Error** shown in the UI is the residual that gets absorbed by fractional positions — ideally small (< $50).

---

## Running Locally

**Backend (FastAPI):**
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend (Vite + React):**
```bash
cd frontend
npm install
npm run dev
```

Configure your holdings and ETF factor loadings in `config.yaml` at the project root.

---

## Configuration

`config.yaml` controls everything:

```yaml
current_portfolio:
  - ticker: AVUV
    shares: 11.73815
  - ticker: AVDV
    shares: 5.45139

factor_premiums:
  Rm-Rf: 0.05    # Market risk premium
  HML: 0.025     # Value premium
  SMB: 0.01      # Size premium
  RMW: 0.025     # Profitability premium
  CMA: 0.015     # Investment premium
  Rf: 0.006      # Real risk-free rate
  inflation: 0.025
  vol: 0.23      # Portfolio volatility

target_value_loadings:
  US: 1.0        # Controls DFUS/AVUV blend
  Developed: 1.0 # Controls DFAI/AVDV blend
  Emerging: 1.0  # Controls AVEM/AVES blend
```

`target_value_loadings` drives the core-satellite split: a higher value means more weight in the high-HML satellite fund (e.g. AVUV), a lower value blends in more of the core fund (e.g. DFUS). Setting all values to 1.0 allocates 100% to the satellite fund in each region.

---

*Built with FastAPI, React, TypeScript, Tailwind CSS, and Recharts.*

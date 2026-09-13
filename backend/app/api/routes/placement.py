from fastapi import APIRouter, HTTPException, Query

from ...core.placement_models import AccountCharacter, default_request
from ...schemas.placement import (
    AllocationCell,
    DefaultsResponse,
    FundDragOut,
    GrowthPoint,
    MarginalRatesOut,
    PlacementResponse,
    ReferenceYieldsResponse,
    SavingCheck,
    SolveRequest,
    StrategyOut,
)
from ...services import placement_service as ps
from ...services.yield_reference import get_reference_yields

router = APIRouter(prefix="/api/placement", tags=["placement"])

# Tolerance on the two independent routes to the annual saving. They are the
# same arithmetic reassociated, so anything above float noise is a real bug.
SAVING_TOLERANCE = 1e-6

# A target split is allowed to drift this far from 1.0 before the UI is warned.
SPLIT_TOLERANCE = 1e-6


@router.get("/defaults", response_model=DefaultsResponse)
async def defaults(use_cache: bool = Query(True)) -> DefaultsResponse:
    """Default inputs, plus trailing yields shown only as a reference column."""
    try:
        request = default_request()
        return DefaultsResponse(
            request=request,
            reference_yields=get_reference_yields(
                [f.ticker for f in request.funds], use_cache=use_cache
            ),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reference-yields", response_model=ReferenceYieldsResponse)
async def reference_yields(
    tickers: str = Query("AVUV,AVDV,AVES"),
    use_cache: bool = Query(True),
) -> ReferenceYieldsResponse:
    """Trailing 12-month yields. Never the model input -- see yield_reference."""
    try:
        wanted = [t.strip().upper() for t in tickers.split(",") if t.strip()]
        rows = get_reference_yields(wanted, use_cache=use_cache)
        stamps = [r.as_of for r in rows if r.as_of]
        return ReferenceYieldsResponse(
            reference_yields=rows,
            as_of=max(stamps) if stamps else None,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/solve", response_model=PlacementResponse)
async def solve(payload: SolveRequest) -> PlacementResponse:
    """Panels 1-3 in one pass. Inputs are ephemeral; nothing is persisted."""
    try:
        request = payload.request
        warnings: list[str] = []

        rates, drags = ps.build_drag_matrix(request)

        sheltered_cap, taxable_cap = ps.capacities(request.accounts)
        total = sheltered_cap + taxable_cap

        split_sum = sum(request.target_split.values())
        if abs(split_sum - 1.0) > SPLIT_TOLERANCE:
            warnings.append(f"Target split sums to {split_sum:.4%}, not 100%.")

        known = {f.ticker for f in request.funds}
        for ticker in request.target_split:
            if ticker not in known:
                warnings.append(f"{ticker} has a target weight but no assumptions.")

        for fund in request.funds:
            for name, field in (
                ("yield", fund.gross_yield),
                ("qualified share", fund.qualified_pct),
                ("foreign share", fund.foreign_share),
            ):
                if field.source == "unsourced":
                    warnings.append(f"{fund.ticker} {name} is unsourced.")

        # Fund dollar targets are a hard constraint on BOTH strategies --
        # placement must never change allocation.
        fund_targets = {t: total * w for t, w in request.target_split.items()}

        van_sheltered = ps.vanilla_placement(fund_targets, sheltered_cap, total)
        opt_sheltered = ps.solve_placement(fund_targets, drags, sheltered_cap)

        van_drag = ps.strategy_drag(van_sheltered, fund_targets, drags)
        opt_drag = ps.strategy_drag(opt_sheltered, fund_targets, drags)

        direct = van_drag - opt_drag
        decomposed = sum(
            d.benefit * (opt_sheltered.get(d.ticker, 0.0) - van_sheltered.get(d.ticker, 0.0))
            for d in drags
        )

        growth = ps.project(request, drags, request.target_split)

        return PlacementResponse(
            rates=MarginalRatesOut(
                taxable_income=rates.taxable_income,
                standard_deduction=rates.standard_deduction,
                fed_ordinary=rates.fed_ordinary,
                fed_ltcg=rates.fed_ltcg,
                niit=rates.niit,
                state_rate=rates.state_rate,
                ordinary_rate=rates.ordinary,
                qualified_rate=rates.qualified,
            ),
            drags=[
                FundDragOut(
                    ticker=d.ticker,
                    gross_yield=d.gross_yield,
                    qualified_pct=d.qualified_pct,
                    foreign_share=d.foreign_share,
                    withholding_rate=d.withholding_rate,
                    foreign_tax=d.foreign_tax,
                    blended_rate=d.blended_rate,
                    us_tax=d.us_tax,
                    drag_taxable=d.drag_taxable,
                    drag_sheltered=d.drag_sheltered,
                    benefit=d.benefit,
                )
                for d in drags
            ],
            total_contributions=total,
            sheltered_capacity=sheltered_cap,
            taxable_capacity=taxable_cap,
            sheltered_share=(sheltered_cap / total) if total > 0 else 0.0,
            fund_targets=fund_targets,
            vanilla=_strategy(
                "Vanilla", van_sheltered, fund_targets, request, van_drag, total
            ),
            optimal=_strategy(
                "Optimal", opt_sheltered, fund_targets, request, opt_drag, total
            ),
            annual_saving=direct,
            saving_bps=(direct / total * 10_000) if total > 0 else 0.0,
            saving_check=SavingCheck(
                direct=direct,
                decomposed=decomposed,
                agree=abs(direct - decomposed) < SAVING_TOLERANCE,
            ),
            growth=[
                GrowthPoint(
                    year=g.year,
                    vanilla_total=g.vanilla_total,
                    optimal_total=g.optimal_total,
                    gap=g.gap,
                )
                for g in growth
            ],
            vanilla_terminal=growth[-1].vanilla_total if growth else 0.0,
            optimal_terminal=growth[-1].optimal_total if growth else 0.0,
            terminal_gap=growth[-1].gap if growth else 0.0,
            warnings=warnings,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _strategy(
    name: str,
    sheltered: dict,
    fund_targets: dict,
    request,
    annual_drag: float,
    total: float,
) -> StrategyOut:
    """Spread each fund's sheltered dollars across the sheltered accounts.

    The accounts inside a character are interchangeable -- they share a column in
    the cost matrix -- so the split across them is presentational. Pro rata to
    each account's own contribution keeps the grid readable.
    """
    cells: list[AllocationCell] = []
    for account in request.accounts:
        cap = sum(
            a.amount for a in request.accounts if a.character == account.character
        )
        if cap <= 0:
            continue
        weight = account.amount / cap
        for ticker, target in fund_targets.items():
            in_shelter = sheltered.get(ticker, 0.0)
            amount = (
                in_shelter
                if account.character == AccountCharacter.sheltered
                else target - in_shelter
            )
            if amount * weight != 0:
                cells.append(
                    AllocationCell(
                        account=account.name, ticker=ticker, amount=amount * weight
                    )
                )

    return StrategyOut(
        name=name,
        cells=cells,
        sheltered=sheltered,
        annual_drag=annual_drag,
        drag_bps=(annual_drag / total * 10_000) if total > 0 else 0.0,
    )

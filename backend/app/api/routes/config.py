from fastapi import APIRouter, HTTPException
from typing import Dict

from ...core.config import config_manager
from ...core.models import Region
from ...schemas.config import (
    ConfigResponse,
    UpdateFactorPremiumsRequest,
    UpdateEquityConfigRequest,
    UpdateTargetValueLoadingsRequest,
    TargetProportionsResponse
)
from ...services.equity_service import get_equities

router = APIRouter(prefix="/api/config", tags=["config"])


@router.get("", response_model=ConfigResponse)
async def get_config():
    """Get all configuration parameters."""
    try:
        return ConfigResponse(
            factor_premiums=config_manager.get_factor_premiums(),
            equities=config_manager.get_equities_config(),
            target_value_loadings=config_manager.get_target_value_loadings()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/factor-premiums")
async def update_factor_premiums(request: UpdateFactorPremiumsRequest):
    """Update factor premiums configuration."""
    try:
        config_manager.update_factor_premiums(request.factor_premiums)
        return {"status": "success", "message": "Factor premiums updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/equity/{ticker}")
async def update_equity_config(ticker: str, request: UpdateEquityConfigRequest):
    """Update specific equity configuration."""
    try:
        config_manager.update_equity_config(ticker, request.equity_config)
        return {"status": "success", "message": f"Equity {ticker} configuration updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/target-value-loadings")
async def update_target_value_loadings(request: UpdateTargetValueLoadingsRequest):
    """Update target value loadings for regions."""
    try:
        config_manager.update_target_value_loadings(request.target_value_loadings)
        return {"status": "success", "message": "Target value loadings updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/target-proportions", response_model=TargetProportionsResponse)
async def get_target_proportions(use_cache: bool = False):
    """Get calculated target proportions showing how they're derived from config."""
    try:
        from ...services.market_service import get_global_market_split

        equities, fund_proportions = get_equities(use_cache=use_cache)
        regional_split = get_global_market_split(use_cache=use_cache)

        # Calculate final target proportions
        final_proportions = {}
        for ticker_str, proportion_in_region in fund_proportions.items():
            equity = equities[getattr(Region, ticker_str).value] if hasattr(Region, ticker_str) else None
            if equity:
                region = equity.region
                final_proportions[ticker_str] = regional_split[region] * proportion_in_region
            else:
                # Find the equity by ticker
                for eq in equities.values():
                    if eq.ticker.value == ticker_str:
                        final_proportions[ticker_str] = regional_split[eq.region] * proportion_in_region
                        break

        return TargetProportionsResponse(
            regional_split=regional_split,
            fund_proportions_in_region=fund_proportions,
            final_target_proportions=final_proportions
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

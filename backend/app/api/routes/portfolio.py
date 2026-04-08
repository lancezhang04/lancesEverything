from fastapi import APIRouter, HTTPException, Query
from typing import List

from ...services.portfolio_service import PortfolioService
from ...core.config import config_manager
from ...core.models import RegionalDistribution
from ...schemas.portfolio import (
    PortfolioResponse,
    RegionalDistributionResponse,
    FactorAnalysisResponse,
    FactorLoadingRow,
    ExpectedReturns,
    RebalanceRequest,
    RebalanceResponse,
    RebalanceAdjustment
)

router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])


@router.get("", response_model=PortfolioResponse)
async def get_portfolio(use_cache: bool = Query(False)):
    """Get current portfolio with all positions and loadings."""
    try:
        service = PortfolioService(use_cache=use_cache)
        positions = service.get_positions_data()

        return PortfolioResponse(
            total_value=service.total_value,
            active_share=service.active_share,
            positions=positions,
            market_loading=service.market_loading,
            size_loading=service.size_loading,
            value_loading=service.value_loading,
            profitability_loading=service.profitability_loading,
            investment_loading=service.investment_loading,
            target_market_loading=service.target_market_loading,
            target_size_loading=service.target_size_loading,
            target_value_loading=service.target_value_loading,
            target_profitability_loading=service.target_profitability_loading,
            target_investment_loading=service.target_investment_loading
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/regional-distribution", response_model=RegionalDistributionResponse)
async def get_regional_distribution(use_cache: bool = Query(False)):
    """Get regional distribution of portfolio."""
    try:
        service = PortfolioService(use_cache=use_cache)
        dist_data = service.get_regional_distribution()

        distributions = [
            RegionalDistribution(
                region=region,
                current=data["current"],
                target=data["target"]
            )
            for region, data in dist_data.items()
        ]

        return RegionalDistributionResponse(distributions=distributions)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/factor-analysis", response_model=FactorAnalysisResponse)
async def get_factor_analysis(use_cache: bool = Query(False)):
    """Get factor loadings and expected returns analysis."""
    try:
        service = PortfolioService(use_cache=use_cache)
        factor_premiums = config_manager.get_factor_premiums()

        loadings = [
            FactorLoadingRow(
                factor="Rm-Rf",
                loading=service.market_loading,
                target_loading=service.target_market_loading,
                premium=factor_premiums.rm_rf,
                portfolio_premium=factor_premiums.rm_rf * service.market_loading
            ),
            FactorLoadingRow(
                factor="SMB",
                loading=service.size_loading,
                target_loading=service.target_size_loading,
                premium=factor_premiums.smb,
                portfolio_premium=factor_premiums.smb * service.size_loading
            ),
            FactorLoadingRow(
                factor="HML",
                loading=service.value_loading,
                target_loading=service.target_value_loading,
                premium=factor_premiums.hml,
                portfolio_premium=factor_premiums.hml * service.value_loading
            ),
            FactorLoadingRow(
                factor="RMW",
                loading=service.profitability_loading,
                target_loading=service.target_profitability_loading,
                premium=factor_premiums.rmw,
                portfolio_premium=factor_premiums.rmw * service.profitability_loading
            ),
            FactorLoadingRow(
                factor="CMA",
                loading=service.investment_loading,
                target_loading=service.target_investment_loading,
                premium=factor_premiums.cma,
                portfolio_premium=factor_premiums.cma * service.investment_loading
            ),
        ]

        total_portfolio_premium = sum(row.portfolio_premium for row in loadings)
        excess_premium = total_portfolio_premium - factor_premiums.rm_rf

        # Calculate expected returns
        real_er = 0.002 / (1 + factor_premiums.inflation)
        arithmetic_return = total_portfolio_premium + factor_premiums.rf - real_er
        nominal_arithmetic_return = (1 + arithmetic_return) * (1 + factor_premiums.inflation) - 1
        geometric_return = arithmetic_return - factor_premiums.vol ** 2 / 2
        nominal_geometric_return = (1 + geometric_return) * (1 + factor_premiums.inflation) - 1

        expected_returns = ExpectedReturns(
            nominal_arithmetic=nominal_arithmetic_return,
            real_arithmetic=arithmetic_return,
            nominal_geometric=nominal_geometric_return,
            real_geometric=geometric_return,
            assumptions={
                "inflation": factor_premiums.inflation,
                "vol": factor_premiums.vol,
                "rf": factor_premiums.rf
            }
        )

        return FactorAnalysisResponse(
            loadings=loadings,
            excess_premium=excess_premium,
            expected_returns=expected_returns
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/rebalance", response_model=RebalanceResponse)
async def calculate_rebalance(request: RebalanceRequest, use_cache: bool = Query(False)):
    """Calculate rebalancing adjustments for a given infusion amount."""
    try:
        service = PortfolioService(use_cache=use_cache)
        result = service.calculate_rebalance(request.infusion)

        adjustments = [RebalanceAdjustment(**adj) for adj in result["adjustments"]]

        return RebalanceResponse(
            adjustments=adjustments,
            total_infusion=result["total_infusion"],
            whole_share_error=result["whole_share_error"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from typing import List, Dict
from pydantic import BaseModel

from ..core.models import Position, Region, RegionalDistribution


class PortfolioResponse(BaseModel):
    total_value: float
    active_share: float
    positions: List[Position]
    market_loading: float
    size_loading: float
    value_loading: float
    profitability_loading: float
    investment_loading: float
    target_market_loading: float
    target_size_loading: float
    target_value_loading: float
    target_profitability_loading: float
    target_investment_loading: float


class RegionalDistributionResponse(BaseModel):
    distributions: List[RegionalDistribution]


class FactorLoadingRow(BaseModel):
    factor: str
    loading: float
    target_loading: float
    premium: float
    portfolio_premium: float


class ExpectedReturns(BaseModel):
    nominal_arithmetic: float
    real_arithmetic: float
    nominal_geometric: float
    real_geometric: float
    assumptions: Dict[str, float]  # inflation, vol, rf


class FactorAnalysisResponse(BaseModel):
    loadings: List[FactorLoadingRow]
    excess_premium: float
    expected_returns: ExpectedReturns


class RebalanceRequest(BaseModel):
    infusion: float


class RebalanceAdjustment(BaseModel):
    ticker: str
    current_shares: float
    current_value: float
    target_value: float
    adjustment_shares: float
    adjustment_value: float
    adjustment_error: float
    final_shares: float
    final_value: float
    price: float
    fractional: bool


class RebalanceResponse(BaseModel):
    adjustments: List[RebalanceAdjustment]
    total_infusion: float
    whole_share_error: float

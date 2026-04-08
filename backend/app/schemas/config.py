from typing import Dict
from pydantic import BaseModel

from ..core.models import Region, EquityConfig, FactorPremiums


class ConfigResponse(BaseModel):
    factor_premiums: FactorPremiums
    equities: Dict[str, EquityConfig]
    target_value_loadings: Dict[Region, float]


class UpdateFactorPremiumsRequest(BaseModel):
    factor_premiums: FactorPremiums


class UpdateEquityConfigRequest(BaseModel):
    equity_config: EquityConfig


class UpdateTargetValueLoadingsRequest(BaseModel):
    target_value_loadings: Dict[Region, float]


class TargetProportionsResponse(BaseModel):
    """Response showing how target proportions are calculated."""
    regional_split: Dict[Region, float]
    fund_proportions_in_region: Dict[str, float]
    final_target_proportions: Dict[str, float]

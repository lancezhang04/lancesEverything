from typing import Dict, List, Optional

from pydantic import BaseModel

from ..core.placement_models import PlacementRequest
from ..services.yield_reference import ReferenceYield


class MarginalRatesOut(BaseModel):
    """Derived from gross compensation, never asked for directly."""
    taxable_income: float
    standard_deduction: float
    fed_ordinary: float
    fed_ltcg: float
    niit: float
    state_rate: float
    ordinary_rate: float
    qualified_rate: float


class FundDragOut(BaseModel):
    """One row of the Panel 1 matrix, with the decomposition kept inline.

    Every intermediate is returned so each cell is auditable against the
    formulas rather than taken on trust.
    """
    ticker: str
    gross_yield: float
    qualified_pct: float
    foreign_share: float
    withholding_rate: float
    # phi = q * foreign_share * withholding
    foreign_tax: float
    # kappa*qual + (1-kappa)*ord
    blended_rate: float
    # q * blended
    us_tax: float
    drag_taxable: float
    drag_sheltered: float
    benefit: float


class AllocationCell(BaseModel):
    account: str
    ticker: str
    amount: float


class StrategyOut(BaseModel):
    name: str
    cells: List[AllocationCell]
    # ticker -> dollars in the sheltered column
    sheltered: Dict[str, float]
    annual_drag: float
    drag_bps: float


class SavingCheck(BaseModel):
    """Two independent routes to the same number; they must agree.

    `direct` is vanilla drag minus optimal drag. `decomposed` is
    sum(benefit_i * (sheltered_optimal_i - sheltered_vanilla_i)).
    """
    direct: float
    decomposed: float
    agree: bool


class GrowthPoint(BaseModel):
    year: int
    vanilla_total: float
    optimal_total: float
    gap: float


class PlacementResponse(BaseModel):
    rates: MarginalRatesOut
    drags: List[FundDragOut]

    total_contributions: float
    sheltered_capacity: float
    taxable_capacity: float
    sheltered_share: float
    fund_targets: Dict[str, float]

    vanilla: StrategyOut
    optimal: StrategyOut
    annual_saving: float
    saving_bps: float
    saving_check: SavingCheck

    growth: List[GrowthPoint]
    vanilla_terminal: float
    optimal_terminal: float
    terminal_gap: float

    # Non-blocking input problems, e.g. a target split that does not sum to 1.
    warnings: List[str]


class DefaultsResponse(BaseModel):
    request: PlacementRequest
    reference_yields: List[ReferenceYield]


class SolveRequest(BaseModel):
    request: PlacementRequest


class ReferenceYieldsResponse(BaseModel):
    reference_yields: List[ReferenceYield]
    as_of: Optional[str] = None

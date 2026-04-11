import math
from typing import Dict, List

from ..core.models import Ticker, Equity, Position, Region
from ..core.config import config_manager
from .equity_service import get_equities
from .market_service import get_global_market_split


class PortfolioPosition:
    """Internal position class for calculations."""
    def __init__(self, equity: Equity, value: float, target_proportion: float):
        self.equity = equity
        self.value = value
        self.target_proportion = target_proportion
        self.difference: float = 0.0
        self.difference_shares: float = 0.0


class PortfolioService:
    def __init__(self, use_cache: bool = False):
        self.use_cache = use_cache
        self.equities, self.fund_proportion_in_region = get_equities(use_cache=use_cache)
        override = config_manager.get_regional_split_override()
        self.target_regional_split = override if override else get_global_market_split(use_cache=use_cache)
        self.positions: Dict[Ticker, PortfolioPosition] = {}
        # Compute full target proportions for ALL equities (not just held ones)
        self._all_target_proportions: Dict[Ticker, float] = {}
        for ticker, equity in self.equities.items():
            tp = (
                self.target_regional_split.get(equity.region, 0.0) *
                self.fund_proportion_in_region.get(ticker.value, 0.0)
            )
            self._all_target_proportions[ticker] = tp
        self._load_portfolio()

    def _load_portfolio(self):
        """Load portfolio from config."""
        holdings = config_manager.get_portfolio_holdings()

        for holding in holdings:
            ticker = Ticker[holding.ticker]
            equity = self.equities[ticker]
            value = holding.shares * equity.share_price
            target_proportion = (
                self.target_regional_split[equity.region] *
                self.fund_proportion_in_region[holding.ticker]
            )

            if target_proportion > 0.0 or value > 0.0:
                self.positions[ticker] = PortfolioPosition(equity, value, target_proportion)

    @property
    def total_value(self) -> float:
        return sum(pos.value for pos in self.positions.values())

    @property
    def market_loading(self) -> float:
        portfolio_value = self.total_value
        if portfolio_value == 0:
            return 0.0
        return sum(
            pos.equity.market_loading * (pos.value / portfolio_value)
            for pos in self.positions.values()
        )

    @property
    def size_loading(self) -> float:
        portfolio_value = self.total_value
        if portfolio_value == 0:
            return 0.0
        return sum(
            pos.equity.size_loading * (pos.value / portfolio_value)
            for pos in self.positions.values()
        )

    @property
    def value_loading(self) -> float:
        portfolio_value = self.total_value
        if portfolio_value == 0:
            return 0.0
        return sum(
            pos.equity.value_loading * (pos.value / portfolio_value)
            for pos in self.positions.values()
        )

    @property
    def profitability_loading(self) -> float:
        portfolio_value = self.total_value
        if portfolio_value == 0:
            return 0.0
        return sum(
            pos.equity.profitability_loading * (pos.value / portfolio_value)
            for pos in self.positions.values()
        )

    @property
    def investment_loading(self) -> float:
        portfolio_value = self.total_value
        if portfolio_value == 0:
            return 0.0
        return sum(
            pos.equity.investment_loading * (pos.value / portfolio_value)
            for pos in self.positions.values()
        )

    @property
    def target_market_loading(self) -> float:
        return sum(
            self.equities[ticker].market_loading * tp
            for ticker, tp in self._all_target_proportions.items()
        )

    @property
    def target_size_loading(self) -> float:
        return sum(
            self.equities[ticker].size_loading * tp
            for ticker, tp in self._all_target_proportions.items()
        )

    @property
    def target_value_loading(self) -> float:
        return sum(
            self.equities[ticker].value_loading * tp
            for ticker, tp in self._all_target_proportions.items()
        )

    @property
    def target_profitability_loading(self) -> float:
        return sum(
            self.equities[ticker].profitability_loading * tp
            for ticker, tp in self._all_target_proportions.items()
        )

    @property
    def target_investment_loading(self) -> float:
        return sum(
            self.equities[ticker].investment_loading * tp
            for ticker, tp in self._all_target_proportions.items()
        )

    @property
    def active_share(self) -> float:
        result = 0.0
        portfolio_value = self.total_value
        if portfolio_value == 0:
            return 0.0

        for pos in self.positions.values():
            result += math.fabs(pos.target_proportion * portfolio_value - pos.value)
        return result / portfolio_value / 2

    def get_regional_distribution(self) -> Dict[Region, Dict[str, float]]:
        """Get current and target regional distribution."""
        dist = {
            Region.US: {"current": 0.0, "target": 0.0},
            Region.Developed: {"current": 0.0, "target": 0.0},
            Region.Emerging: {"current": 0.0, "target": 0.0},
        }

        portfolio_value = self.total_value
        if portfolio_value > 0:
            for pos in self.positions.values():
                dist[pos.equity.region]["current"] += pos.value / portfolio_value

        for region in Region:
            dist[region]["target"] = self.target_regional_split.get(region, 0.0)

        return dist

    def get_positions_data(self) -> List[Position]:
        """Get all positions as Position models."""
        positions = []
        portfolio_value = self.total_value

        for pos in self.positions.values():
            current_proportion = pos.value / portfolio_value if portfolio_value > 0 else 0.0
            positions.append(Position(
                ticker=pos.equity.ticker,
                equity=pos.equity,
                value=pos.value,
                shares=pos.value / pos.equity.share_price if pos.equity.share_price > 0 else 0.0,
                current_proportion=current_proportion,
                target_proportion=pos.target_proportion,
                drift=current_proportion - pos.target_proportion
            ))

        return positions

    def calculate_rebalance(self, infusion: float) -> Dict:
        """Calculate rebalancing adjustments with infusion."""
        total_value = self.total_value + infusion
        total_whole_share_error = 0.0
        adjustments = []

        # Calculate adjustments
        for pos in self.positions.values():
            target_value = pos.target_proportion * total_value
            difference = target_value - pos.value
            difference_shares = difference / pos.equity.share_price if pos.equity.share_price > 0 else 0.0

            fractional_adjustment = 0.0
            if not pos.equity.fractional:
                difference_shares_rounded = round(difference_shares)
                fractional_adjustment = (difference_shares_rounded - difference_shares) * pos.equity.share_price
                total_whole_share_error += fractional_adjustment
                pos.difference = round(difference_shares_rounded * pos.equity.share_price, 2)
                pos.difference_shares = round(difference_shares_rounded, 2)
            else:
                pos.difference = round(difference, 2)
                pos.difference_shares = round(difference_shares, 2)

            adjustments.append({
                "ticker": pos.equity.ticker.value,
                "current_shares": pos.value / pos.equity.share_price if pos.equity.share_price > 0 else 0.0,
                "current_value": pos.value,
                "target_value": target_value,
                "adjustment_shares": pos.difference_shares,
                "adjustment_value": pos.difference,
                "adjustment_error": fractional_adjustment,
                "final_shares": (pos.value / pos.equity.share_price if pos.equity.share_price > 0 else 0.0) + pos.difference_shares,
                "final_value": pos.value + pos.difference,
                "price": pos.equity.share_price,
                "fractional": pos.equity.fractional
            })

        # Redistribute whole share error to fractional equities
        total_fractional_proportion = sum(
            pos.target_proportion for pos in self.positions.values()
            if pos.equity.fractional
        )

        if total_fractional_proportion > 0:
            for adj in adjustments:
                pos = self.positions[Ticker[adj["ticker"]]]
                if pos.equity.fractional:
                    fractional_adjustment = -total_whole_share_error * (pos.target_proportion / total_fractional_proportion)
                    pos.difference += fractional_adjustment
                    pos.difference_shares = pos.difference / pos.equity.share_price if pos.equity.share_price > 0 else 0.0

                    adj["adjustment_value"] = pos.difference
                    adj["adjustment_shares"] = pos.difference_shares
                    adj["adjustment_error"] = fractional_adjustment
                    adj["final_shares"] = (pos.value / pos.equity.share_price if pos.equity.share_price > 0 else 0.0) + pos.difference_shares
                    adj["final_value"] = pos.value + pos.difference

        total_infusion = sum(pos.difference for pos in self.positions.values())

        return {
            "adjustments": adjustments,
            "total_infusion": round(total_infusion, 2),
            "whole_share_error": round(total_whole_share_error, 2)
        }

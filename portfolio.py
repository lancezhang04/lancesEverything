import math

from tabulate import tabulate

from equity import Equity
from constants import TARGET_REGIONAL_SPLIT, TARGET_VALUE_FUND_SPLIT, Region


class Position:
    equity: Equity
    value: float
    target_proportion: float

    # TODO: probably refactor these out
    difference: float = None
    difference_shares: float = None

    def __init__(self, equity: Equity, value: float):
        self.value = value
        self.equity = equity

        self.target_proportion = 1.0
        self.target_proportion *= TARGET_REGIONAL_SPLIT[equity.region]
        if equity.is_value:
            self.target_proportion *= TARGET_VALUE_FUND_SPLIT[equity.region]
        else:
            self.target_proportion *= 1 - TARGET_VALUE_FUND_SPLIT[equity.region]


class Portfolio:
    positions: dict[Equity, Position]

    def __init__(self, positions: list[Position]):
        super().__init__()
        self.positions = {position.equity: position for position in positions}

    @property
    def value(self) -> float:
        return sum(position.value for position in self.positions.values())

    @property
    def value_tilt(self) -> float:
        portfolio_value = self.value
        return sum(
            position.equity.value_tilt * (position.value / portfolio_value)
            for position in self.positions.values()
        )

    @property
    def size_tilt(self) -> float:
        portfolio_value = self.value
        return sum(
            position.equity.size_tilt * (position.value / portfolio_value)
            for position in self.positions.values()
        )

    @property
    def profitability_tilt(self) -> float:
        portfolio_value = self.value
        return sum(
            position.equity.profitability_tilt * (position.value / portfolio_value)
            for position in self.positions.values()
        )

    @property
    def target_value_tilt(self) -> float:
        return sum(
            position.equity.value_tilt * position.target_proportion
            for position in self.positions.values()
        )

    @property
    def target_size_tilt(self) -> float:
        return sum(
            position.equity.size_tilt * position.target_proportion
            for position in self.positions.values()
        )

    @property
    def target_profitability_tilt(self) -> float:
        portfolio_value = self.value
        return sum(
            position.equity.profitability_tilt * position.target_proportion
            for position in self.positions.values()
        )

    def regional_distribution(self) -> dict[Region, float]:
        dist = {
            Region.US: 0.0,
            Region.Developed: 0.0,
            Region.Emerging: 0.0,
        }
        portfolio_value = self.value
        for position in self.positions.values():
            dist[position.equity.region] += position.value / portfolio_value
        return dist

    @property
    def active_share(self) -> float:
        result = 0.0
        portfolio_value = self.value

        for position in self.positions.values():
            result += math.fabs(position.target_proportion * portfolio_value - position.value)
        return result / portfolio_value / 2

    def format_data(self) -> dict[Equity, dict[str, str]]:
        data = dict()
        for pos in self.positions.values():
            data[pos.equity] = {
                "Ticker": str(pos.equity.ticker) + ("*" if not pos.equity.fractional else ""),
                "Est. Value Tilt": f"{pos.equity.value_tilt:.2%}",
                "Price": str(pos.equity.share_price),
                "Shares": f"{pos.value / pos.equity.share_price:.2f}",
                "Current Value": f"{pos.value:.2f}",
                "Target Value": f"{pos.target_proportion * self.value:.2f}",
                "Current %": f"{pos.value / self.value:.2%}",
                "Target %": f"{pos.target_proportion:.2%}",
                "Drift": f"{(pos.value / self.value) - pos.target_proportion:.2%}",
            }
        return data

    def display(self) -> None:
        # TODO: Consider adding regional composition and estimated tilt %
        data = self.format_data()
        print(f"\nPortfolio Total Value: ${self.value:,.2f}")
        print(tabulate(data.values(), headers='keys', tablefmt='grid', showindex=False))
        print("* No fractional shares")

    def balance_with_infusion(self, infusion: float) -> None:
        data = self.format_data()
        total_value = self.value + infusion
        total_whole_share_error = 0.0

        for position in self.positions.values():
            target_value = position.target_proportion * total_value
            difference = target_value - position.value
            difference_shares = difference / position.equity.share_price

            if not position.equity.fractional:
                difference_shares_rounded = round(difference_shares)
                fractional_adjustment = (difference_shares_rounded - difference_shares) * position.equity.share_price
                total_whole_share_error += fractional_adjustment

                position.difference = round(difference_shares_rounded * position.equity.share_price, 2)
                position.difference_shares = round(difference_shares_rounded, 2)
            else:
                fractional_adjustment = 0.0
                position.difference = round(difference, 2)
                position.difference_shares = round(difference_shares, 2)

            data[position.equity]["Adjustment Value"] = f"{position.difference:.2f}"
            data[position.equity]["Adjustment Shares"] = str(position.difference_shares)
            data[position.equity]["Adjustment Error"] = f"{fractional_adjustment:.2f}"

        # Redistribute the whole share error to equities that support fractional shares
        total_fractional_proportion = sum(
            position.target_proportion for position in self.positions.values()
            if position.equity.fractional
        )
        whole_share_error_cancelled = 0.0
        for position in self.positions.values():
            if position.equity.fractional:
                fractional_adjustment = -total_whole_share_error * (position.target_proportion / total_fractional_proportion)
                position.difference += fractional_adjustment
                position.difference_shares = position.difference / position.equity.share_price

                whole_share_error_cancelled += fractional_adjustment
                data[position.equity]["Adjustment Value"] = f"{position.difference:.2f}"
                data[position.equity]["Adjustment Shares"] = str(position.difference_shares)
                data[position.equity]["Adjustment Error"] = f"{fractional_adjustment:.2f}"

        print()
        print(tabulate(data.values(), headers='keys', tablefmt='grid', showindex=False))
        # print(f"Total adjustment: {total_adjustment:,.2f} | {cancelled:,.2f} cancelled")
        print(f"Total infusion: {sum(position.difference for position in self.positions.values()):,.2f}")

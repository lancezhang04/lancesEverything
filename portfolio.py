import math

from tabulate import tabulate

from equity import Equity
from constants import Region


class Position:
    equity: Equity
    value: float
    target_proportion: float

    # TODO: probably refactor these out
    difference: float = None
    difference_shares: float = None

    def __init__(self, equity: Equity, value: float, target_regional_split: dict, target_fund_proportion_in_region: dict):
        self.value = value
        self.equity = equity
        self.target_proportion = target_regional_split[equity.region] * \
            target_fund_proportion_in_region[equity.ticker.value]

class Portfolio:
    positions: dict[Equity, Position]

    def __init__(self, positions: list[Position]):
        super().__init__()
        self.positions = {position.equity: position for position in positions if position.target_proportion > 0.0}

    @property
    def value(self) -> float:
        return sum(position.value for position in self.positions.values())

    @property
    def market_loading(self) -> float:
        portfolio_value = self.value
        return sum(
            position.equity.market_loading * (position.value / portfolio_value)
            for position in self.positions.values()
        )

    @property
    def size_loading(self) -> float:
        portfolio_value = self.value
        return sum(
            position.equity.size_loading * (position.value / portfolio_value)
            for position in self.positions.values()
        )

    @property
    def value_loading(self) -> float:
        portfolio_value = self.value
        return sum(
            position.equity.value_loading * (position.value / portfolio_value)
            for position in self.positions.values()
        )

    @property
    def profitability_loading(self) -> float:
        portfolio_value = self.value
        return sum(
            position.equity.profitability_loading * (position.value / portfolio_value)
            for position in self.positions.values()
        )

    @property
    def investment_loading(self) -> float:
        portfolio_value = self.value
        return sum(
            position.equity.investment_loading * (position.value / portfolio_value)
            for position in self.positions.values()
        )

    @property
    def target_market_loading(self) -> float:
        return sum(
            position.equity.market_loading * position.target_proportion
            for position in self.positions.values()
        )

    @property
    def target_size_loading(self) -> float:
        return sum(
            position.equity.size_loading * position.target_proportion
            for position in self.positions.values()
        )

    @property
    def target_value_loading(self) -> float:
        return sum(
            position.equity.value_loading * position.target_proportion
            for position in self.positions.values()
        )

    @property
    def target_profitability_loading(self) -> float:
        return sum(
            position.equity.profitability_loading * position.target_proportion
            for position in self.positions.values()
        )

    @property
    def target_investment_loading(self) -> float:
        return sum(
            position.equity.investment_loading * position.target_proportion
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
                "Est. Value Loading": f"{pos.equity.value_loading:.2%}",
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
        # TODO: Consider adding regional composition and estimated loading %
        data = self.format_data()
        print(f"\nPortfolio Total Value: ${self.value:,.2f}")
        print(tabulate(data.values(), headers='keys', tablefmt='grid', showindex=False))
        print("* No fractional shares")

    def display_loadings(self) -> None:
        from constants import FACTOR_PREMIUMS

        loadings_data = [
            [
                "Rm-Rf",
                self.market_loading,
                self.target_market_loading,
                FACTOR_PREMIUMS["Rm-Rf"],
                FACTOR_PREMIUMS["Rm-Rf"] * self.market_loading
            ],
            [
                "SMB",
                self.size_loading,
                self.target_size_loading,
                FACTOR_PREMIUMS["SMB"],
                FACTOR_PREMIUMS["SMB"] * self.size_loading
            ],
            [
                "HML",
                self.value_loading,
                self.target_value_loading,
                FACTOR_PREMIUMS["HML"],
                FACTOR_PREMIUMS["HML"] * self.value_loading
            ],
            [
                "RMW",
                self.profitability_loading,
                self.target_profitability_loading,
                FACTOR_PREMIUMS["RMW"],
                FACTOR_PREMIUMS["RMW"] * self.profitability_loading
            ],
            [
                "CMA",
                self.investment_loading,
                self.target_investment_loading,
                FACTOR_PREMIUMS["CMA"],
                FACTOR_PREMIUMS["CMA"] * self.investment_loading
            ],
        ]

        total_portfolio_premium = sum(row[4] for row in loadings_data)

        print(f"\nEstimated Portfolio Factor Loadings and Return")
        print(tabulate(
            loadings_data,
            headers=["Factor", "Loading", "Target Loading", "Est. Factor Premium", "Est. Portfolio Premium"],
            tablefmt='grid',
            floatfmt=".4f"
        ))
        # print(f"Total Est. Portfolio Premium: {total_portfolio_premium:.2%}")

        real_er = 0.002 / (1 + FACTOR_PREMIUMS["inflation"])  # TODO: confirm this is the correct calculation, add to config
        arithmetic_return = total_portfolio_premium + FACTOR_PREMIUMS["Rf"] - real_er
        nominal_arithmetic_return = (1 + arithmetic_return) * (1 + FACTOR_PREMIUMS["inflation"]) - 1
        geometric_return = arithmetic_return - FACTOR_PREMIUMS["vol"] ** 2 / 2
        nominal_geometric_return = (1 + geometric_return) * (1 + FACTOR_PREMIUMS["inflation"]) - 1

        print("\n Estimated Expected Returns")
        print(tabulate(
            [
                ["Arithmetic Return", arithmetic_return, nominal_arithmetic_return],
                ["Geometric Return", geometric_return, nominal_geometric_return],
            ],
            headers=["", "Real", "Nominal"],
            tablefmt='grid',
            floatfmt=".2%"
        ))


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

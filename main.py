import argparse

from portfolio import Position, Portfolio
from equity import Ticker, get_equities
from constants import get_portfolio_data, get_target_regional_split


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Portfolio Rebalancer")
    parser.add_argument(
        "--use_cache",
        action="store_true",
        help="Use cached market split and stock prices"
    )
    args = parser.parse_args()

    EQUITIES, TARGET_FUND_PROPORTION_IN_REGION = get_equities(use_cache=args.use_cache)
    PORTFOLIO_DATA = get_portfolio_data()
    TARGET_REGIONAL_SPLIT = get_target_regional_split(use_cache=args.use_cache)
    current_portfolio = Portfolio([
        Position(
            value=item['shares'] * EQUITIES[Ticker[item['ticker']]].share_price,
            equity=EQUITIES[Ticker[item['ticker']]],
            target_regional_split=TARGET_REGIONAL_SPLIT,
            target_fund_proportion_in_region=TARGET_FUND_PROPORTION_IN_REGION
        )
        for item in PORTFOLIO_DATA
    ])

    print()
    current_portfolio.display()

    print()
    current_portfolio.display_regional_distribution(TARGET_REGIONAL_SPLIT)

    print()
    current_portfolio.display_loadings()

    while True:
        infusion_value = float(input("\n\nEnter infusion value: "))
        current_portfolio.balance_with_infusion(infusion_value)

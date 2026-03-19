from portfolio import Position, Portfolio
from equity import Ticker, EQUITIES
from constants import PORTFOLIO_DATA, TARGET_REGIONAL_SPLIT

current_portfolio = Portfolio([
    Position(value=item['value'], equity=EQUITIES[Ticker[item['ticker']]])
    for item in PORTFOLIO_DATA
])


if __name__ == "__main__":
    print()
    print(f"Current value tilt: {current_portfolio.value_tilt:.2%} ({current_portfolio.target_value_tilt:.2%} target)")
    print(f"Current size tilt: {current_portfolio.size_tilt:.2%} ({current_portfolio.target_size_tilt:.2%} target)")

    print()
    regional_dist = current_portfolio.regional_distribution()
    print("Regional distribution:")
    for region, proportion in regional_dist.items():
        print(f"\t{region} - {proportion:.2%} ({TARGET_REGIONAL_SPLIT[region]:.2%} target)")

    print()
    print(f"Active share: {current_portfolio.active_share:.2%}")
    current_portfolio.display()

    while True:
        infusion_value = int(input("\n\nEnter infusion value: "))
        current_portfolio.balance_with_infusion(infusion_value)

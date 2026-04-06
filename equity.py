from collections import defaultdict
from enum import Enum
import json
from pathlib import Path
from pydantic import BaseModel, ConfigDict

import yfinance as yf
from tqdm import tqdm

from constants import Region


class Ticker(Enum):
    DFUS = "DFUS"  # DFA U.S. index
    DFAI = "DFAI"  # DFA international (developed) index
    AVEM = "AVEM"  # Avantis emerging markets index
    AVUV = "AVUV"  # Avantis American small cap value
    AVDV = "AVDV"  # Avantis international small cap value
    AVES = "AVES"  # Avantis emerging markets value


class Equity(BaseModel):
    model_config = ConfigDict(frozen=True)

    ticker: Ticker
    fractional: bool = True
    share_price: float

    market_loading: float
    size_loading: float
    value_loading: float
    profitability_loading: float
    investment_loading: float
    region: Region


def calculate_core_satellite_split(
        equities_loadings: dict[str, float],
        target_loading: float
) -> tuple[dict[str, float], float]:
    """
    Calculate the split between core and satellite funds based on target value loading. Find the closest match if a
    perfect solution is not possible. Returns the split for each equity and actual value loading for the split.
    :param equities_loadings: The value loadings of the equities to split
    :param target_loading: The target value loading
    :return: Equities split and actual value loading
    """
    if len(equities_loadings) == 0 or len(equities_loadings) > 2:
        raise ValueError("There must be exactly one or two equities to split.")

    if len(equities_loadings) == 1:
        equity_name = list(equities_loadings.keys())[0]
        return {equity_name: 1.0}, equities_loadings[equity_name]

    equity1, equity2 = equities_loadings.keys()
    first_proportion = ((target_loading - equities_loadings[equity2]) /
                        (equities_loadings[equity1] - equities_loadings[equity2]))
    if first_proportion >= 1:
        return {equity1: 1.0, equity2: 0.0}, equities_loadings[equity1]
    if first_proportion <= 0:
        return {equity1: 0.0, equity2: 1.0}, equities_loadings[equity2]

    return (
        {equity1: first_proportion, equity2: 1 - first_proportion},
        equities_loadings[equity1] * first_proportion + equities_loadings[equity2] * (1 - first_proportion)
    )


CACHE_DIR = Path(".cache")
STOCK_PRICES_CACHE = CACHE_DIR / "stock_prices.json"


def _fetch_stock_prices(tickers: list[str]) -> dict[str, float]:
    """Fetch stock prices from yfinance."""
    prices = {}
    for ticker_str in tqdm(tickers, ncols=80):
        prices[ticker_str] = yf.Ticker(ticker_str).info["regularMarketPrice"]
    return prices


def get_stock_prices(tickers: list[str], use_cache: bool = False) -> dict[str, float]:
    """Get stock prices, optionally using cached data."""
    if use_cache and STOCK_PRICES_CACHE.exists():
        with open(STOCK_PRICES_CACHE, 'r') as f:
            return json.load(f)

    prices = _fetch_stock_prices(tickers)

    # Save to cache
    CACHE_DIR.mkdir(exist_ok=True)
    with open(STOCK_PRICES_CACHE, 'w') as f:
        json.dump(prices, f, indent=2)

    return prices


def get_equities(use_cache: bool = False):
    """Load equities with optional caching."""
    from constants import EQUITIES_CONFIG, TARGET_VALUE_LOADINGS

    loadings_by_region = defaultdict(dict)
    fund_proportion_in_region = dict()

    for ticker_str, data in EQUITIES_CONFIG.items():
        loadings_by_region[Region(data["region"])][ticker_str] = data["value_loading"]

    for region, fund_loadings in loadings_by_region.items():
        fund_proportion_in_region.update(calculate_core_satellite_split(
            equities_loadings=fund_loadings,
            target_loading=TARGET_VALUE_LOADINGS[region],
        )[0])

    tickers = list(EQUITIES_CONFIG.keys())
    if use_cache:
        print("\033[91mWarning: Using cached stock prices\033[0m")
    else:
        print("Loading equities...")
    stock_prices = get_stock_prices(tickers, use_cache=use_cache)

    equities = {}
    for ticker_str, data in EQUITIES_CONFIG.items():
        if ticker_str not in Ticker.__members__:
            raise ValueError(f"Invalid ticker in config.yaml: {ticker_str}")

        ticker = Ticker[ticker_str]
        equities[ticker] = Equity(
            ticker=ticker,
            fractional=data.get("fractional", True),
            share_price=stock_prices[ticker_str],
            market_loading=data["market_loading"],
            size_loading=data["size_loading"],
            value_loading=data["value_loading"],
            profitability_loading=data["profitability_loading"],
            investment_loading=data["investment_loading"],
            region=Region[data["region"]],
        )
    return equities, fund_proportion_in_region

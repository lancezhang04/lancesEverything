import json
from pathlib import Path
from typing import Dict
from collections import defaultdict
import time

import yfinance as yf
import pandas as pd

from ..core.models import Ticker, Equity, Region
from ..core.config import config_manager


# Cache directory in project root
CACHE_DIR = Path(__file__).parent.parent.parent.parent / ".cache"
STOCK_PRICES_CACHE = CACHE_DIR / "stock_prices.json"


def calculate_core_satellite_split(
    equities_loadings: Dict[str, float],
    target_loading: float
) -> tuple[Dict[str, float], float]:
    """
    Calculate the split between core and satellite funds based on target value loading.
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


def fetch_stock_prices(tickers: list[str]) -> Dict[str, float]:
    """Fetch stock prices from yfinance."""
    prices = {}
    print(f"\n=== Fetching prices for {len(tickers)} tickers ===")

    for i, ticker_str in enumerate(tickers):
        try:
            price = yf.Ticker(ticker_str).info["regularMarketPrice"]
            prices[ticker_str] = float(price)
            print(f"  {ticker_str}: ${prices[ticker_str]:.2f}")
        except Exception as e:
            print(f"  {ticker_str}: Error - {e}")
            prices[ticker_str] = 0.0

    return prices


def get_stock_prices(tickers: list[str], use_cache: bool = False) -> Dict[str, float]:
    """Get stock prices, optionally using cached data."""
    if use_cache and STOCK_PRICES_CACHE.exists():
        with open(STOCK_PRICES_CACHE, 'r') as f:
            return json.load(f)

    prices = fetch_stock_prices(tickers)

    # Only save to cache if we got valid prices (at least one non-zero)
    has_valid_prices = any(price > 0 for price in prices.values())
    if has_valid_prices:
        CACHE_DIR.mkdir(exist_ok=True)
        with open(STOCK_PRICES_CACHE, 'w') as f:
            json.dump(prices, f, indent=2)
        print(f"  Cached {len(prices)} prices")
    else:
        print(f"  WARNING: No valid prices fetched, not updating cache")
        # If cache exists, fall back to it
        if STOCK_PRICES_CACHE.exists():
            print(f"  Using existing cache instead")
            with open(STOCK_PRICES_CACHE, 'r') as f:
                prices = json.load(f)

    return prices


def get_equities(use_cache: bool = False) -> tuple[Dict[Ticker, Equity], Dict[str, float]]:
    """Load equities with optional caching."""
    equities_config = config_manager.get_equities_config()
    target_value_loadings = config_manager.get_target_value_loadings()

    loadings_by_region = defaultdict(dict)
    fund_proportion_in_region = dict()

    for ticker_str, data in equities_config.items():
        loadings_by_region[data.region][ticker_str] = data.value_loading

    for region, fund_loadings in loadings_by_region.items():
        fund_proportion_in_region.update(calculate_core_satellite_split(
            equities_loadings=fund_loadings,
            target_loading=target_value_loadings[region],
        )[0])

    tickers = list(equities_config.keys())
    stock_prices = get_stock_prices(tickers, use_cache=use_cache)

    equities = {}
    for ticker_str, data in equities_config.items():
        ticker = Ticker[ticker_str]
        equities[ticker] = Equity(
            ticker=ticker,
            fractional=data.fractional,
            share_price=stock_prices[ticker_str],
            market_loading=data.market_loading,
            size_loading=data.size_loading,
            value_loading=data.value_loading,
            profitability_loading=data.profitability_loading,
            investment_loading=data.investment_loading,
            region=data.region,
        )

    return equities, fund_proportion_in_region

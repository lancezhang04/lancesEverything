from enum import Enum

import yaml


def load_config():
    with open("config.yaml", "r") as f:
        return yaml.safe_load(f)


config_data = load_config()

EQUITIES_CONFIG = config_data["equities"]


class Region(Enum):
    US = "US"
    Developed = "Developed"
    Emerging = "Emerging"


TARGET_VALUE_LOADINGS = {
    Region[k]: v for k, v in config_data["target_value_loadings"].items()
}
FACTOR_PREMIUMS = config_data.get("factor_premiums")


def get_portfolio_data():
    """Get portfolio data from config."""
    return config_data["current_portfolio"]


def get_target_regional_split(use_cache: bool = False):
    """Get target regional split, optionally using cached data."""
    from market_split import get_global_market_split

    if use_cache:
        print("\033[91mWarning: Using cached market split data\033[0m")
    else:
        print("Retrieving global market split...")

    return {
        Region[k]: v for k, v in get_global_market_split(use_cache=use_cache).items()
    }

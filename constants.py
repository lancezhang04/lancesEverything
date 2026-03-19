from enum import Enum

import yaml

from market_split import get_global_market_split


def load_config():
    with open("config.yaml", "r") as f:
        return yaml.safe_load(f)

config_data = load_config()

EQUITIES_DATA = config_data["equities"]


class Region(Enum):
    US = "US"
    Developed = "Developed"
    Emerging = "Emerging"


print("Retrieving global market split...")
TARGET_REGIONAL_SPLIT = {
    Region[k]: v for k, v in get_global_market_split().items()
}
# print("Global market split:")
# for region, proportion in TARGET_REGIONAL_SPLIT.items():
#     print(f"\t{region} - {proportion:.2%}")

TARGET_VALUE_SPLIT = {
    Region[k]: v for k, v in config_data["target_value_split"].items()
}

PORTFOLIO_DATA = config_data["current_portfolio"]

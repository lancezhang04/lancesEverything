from enum import Enum
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

    is_value: bool
    value_tilt: float
    size_tilt: float
    region: Region


# TODO: estimate true value/size tilt based on regression (?)
def load_equities():
    from constants import EQUITIES_DATA
    equities = {}
    print("Loading equities...")
    for ticker_str, data in tqdm(EQUITIES_DATA.items(), ncols=80):
        if ticker_str not in Ticker.__members__:
            raise ValueError(f"Invalid ticker in config.yaml: {ticker_str}")

        ticker = Ticker[ticker_str]
        equities[ticker] = Equity(
            ticker=ticker,
            fractional=data.get("fractional", True),
            share_price=yf.Ticker(ticker_str).info["regularMarketPrice"],
            value_tilt=data["value_tilt"],
            size_tilt=data["size_tilt"],
            is_value=data["is_value"],
            region=Region[data["region"]],
        )
    return equities


EQUITIES = load_equities()

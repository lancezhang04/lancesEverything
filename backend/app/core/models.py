from enum import Enum
from pydantic import BaseModel, ConfigDict


class Region(str, Enum):
    US = "US"
    Developed = "Developed"
    Emerging = "Emerging"


class Ticker(str, Enum):
    DFUS = "DFUS"
    DFAI = "DFAI"
    AVEM = "AVEM"
    AVUV = "AVUV"
    AVDV = "AVDV"
    AVES = "AVES"


class EquityConfig(BaseModel):
    market_loading: float
    size_loading: float
    value_loading: float
    profitability_loading: float
    investment_loading: float
    region: Region
    fractional: bool = True


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


class Position(BaseModel):
    ticker: Ticker
    equity: Equity
    value: float
    shares: float
    current_proportion: float
    target_proportion: float
    drift: float


class PortfolioHolding(BaseModel):
    ticker: str
    shares: float


class FactorPremiums(BaseModel):
    rm_rf: float
    hml: float
    smb: float
    rmw: float
    cma: float
    rf: float
    inflation: float
    vol: float


class RegionalDistribution(BaseModel):
    region: Region
    current: float
    target: float

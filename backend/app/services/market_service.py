import json
from pathlib import Path
from typing import Dict

import pandas as pd
import requests
import io

from ..core.models import Region


# Cache directory in project root
CACHE_DIR = Path(__file__).parent.parent.parent.parent / ".cache"
MARKET_SPLIT_CACHE = CACHE_DIR / "market_split.json"

EMERGING_COUNTRIES = [
    'Taiwan', 'Korea (South)', 'China', 'India', 'Brazil',
    'Saudi Arabia', 'South Africa', 'Mexico',
    'Kuwait', 'Hungary', 'Thailand', 'Indonesia', 'Poland',
    'Qatar', 'Peru', 'United Arab Emirates', 'Malaysia',
    'Colombia', 'Greece', 'Chile', 'Turkey', 'Philippines',
    'Czech Republic', 'Egypt',
    "Russian Federation",
]

DEVELOPED_COUNTRIES_EX_US = [
    'Netherlands', 'United Kingdom', 'Switzerland', 'Canada',
    'Australia', 'Japan', 'Germany', 'France', 'Spain',
    'Denmark', 'Hong Kong', 'Italy', 'Singapore', 'Sweden',
    'Belgium', 'Finland', 'Israel', 'Austria', 'Norway',
    'Ireland', 'Portugal', 'New Zealand'
]


def fetch_market_split() -> Dict[str, float]:
    """Fetch current market split from iShares MSCI ACWI ETF."""
    url = "https://www.ishares.com/us/products/239600/ishares-msci-acwi-etf/1467271812596.ajax?fileType=csv&fileName=ACWI_holdings&dataType=fund"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    response = requests.get(url, headers=headers)

    df = pd.read_csv(io.StringIO(response.text), skiprows=9)
    df = df.dropna(subset=['Weight (%)', 'Location'])
    df = df[df["Asset Class"] == "Equity"]
    df['Weight (%)'] = pd.to_numeric(df['Weight (%)'], errors='coerce')

    country_weights = df.groupby('Location')['Weight (%)'].sum() / 100

    all_countries = set(["United States"] + EMERGING_COUNTRIES + DEVELOPED_COUNTRIES_EX_US)
    if all_countries != set(country_weights.keys()):
        raise ValueError("Mismatch between expected and actual countries in ETF weights")

    us_weight = country_weights.get('United States', 0)
    emerging_weight = sum([country_weights.get(country, 0) for country in EMERGING_COUNTRIES])
    developed_ex_us_weight = sum([country_weights.get(country, 0) for country in DEVELOPED_COUNTRIES_EX_US])

    # Normalize to 1.0 to account for the cash drag in the ETF
    total = us_weight + developed_ex_us_weight + emerging_weight
    return {
        "US": round(us_weight / total, 4),
        "Developed": round(developed_ex_us_weight / total, 4),
        "Emerging": round(emerging_weight / total, 4)
    }


def get_global_market_split(use_cache: bool = False) -> Dict[Region, float]:
    """Get global market split, optionally using cached data."""
    if use_cache and MARKET_SPLIT_CACHE.exists():
        with open(MARKET_SPLIT_CACHE, 'r') as f:
            data = json.load(f)
            return {Region[k]: v for k, v in data.items()}

    split = fetch_market_split()

    # Save to cache
    CACHE_DIR.mkdir(exist_ok=True)
    with open(MARKET_SPLIT_CACHE, 'w') as f:
        json.dump(split, f, indent=2)

    return {Region[k]: v for k, v in split.items()}

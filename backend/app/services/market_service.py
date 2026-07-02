import json
from pathlib import Path
from typing import Dict, Optional

import requests

from ..core.models import Region


# Cache directory in project root
CACHE_DIR = Path(__file__).parent.parent.parent.parent / ".cache"
MARKET_SPLIT_CACHE = CACHE_DIR / "market_split.json"

# Source for MSCI ACWI country weights. We previously scraped the iShares ACWI
# holdings CSV, but BlackRock walled that endpoint behind an HTML consent page
# (it now returns the product page instead of CSV), which took every portfolio
# endpoint down. stockanalysis.com exposes the same country breakdown as free,
# key-less JSON that is reachable from cloud servers. See git history for the
# old iShares implementation.
ACWI_HOLDINGS_URL = "https://stockanalysis.com/etf/ACWI/holdings/__data.json"

_USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)

# Country taxonomy. Note: DFA/Avantis (the funds this portfolio holds) classify
# South Korea as an emerging market, so it lives here rather than in developed.
EMERGING_COUNTRIES = frozenset({
    'Taiwan', 'Korea (South)', 'China', 'India', 'Brazil',
    'Saudi Arabia', 'South Africa', 'Mexico',
    'Kuwait', 'Hungary', 'Thailand', 'Indonesia', 'Poland',
    'Qatar', 'Peru', 'United Arab Emirates', 'Malaysia',
    'Colombia', 'Greece', 'Chile', 'Turkey', 'Philippines',
    'Czech Republic', 'Egypt',
    'Russian Federation',
})

DEVELOPED_COUNTRIES_EX_US = frozenset({
    'Netherlands', 'United Kingdom', 'Switzerland', 'Canada',
    'Australia', 'Japan', 'Germany', 'France', 'Spain',
    'Denmark', 'Hong Kong', 'Italy', 'Singapore', 'Sweden',
    'Belgium', 'Finland', 'Israel', 'Austria', 'Norway',
    'Ireland', 'Portugal', 'New Zealand',
})

# Source spellings that differ from our taxonomy above.
COUNTRY_ALIASES = {
    'Korea': 'Korea (South)',
    'Korea, Republic Of': 'Korea (South)',
    'South Korea': 'Korea (South)',
    'Czechia': 'Czech Republic',
    'Russia': 'Russian Federation',
}

# Last-resort fallback used only when both the live source and the on-disk cache
# are unavailable. Approximate MSCI ACWI regional weights (snapshot 2026-07);
# whenever the live source is reachable these are refreshed automatically.
DEFAULT_MARKET_SPLIT = {
    "US": 0.6404,
    "Developed": 0.2516,
    "Emerging": 0.1080,
}


def _parse_country_weights(payload: dict) -> Dict[str, float]:
    """Extract {country_name: weight_pct} from stockanalysis.com's SvelteKit
    __data.json. That format stores every value once in a flat list and has
    objects reference those values by integer index."""
    for node in payload.get('nodes', []):
        if not isinstance(node, dict):
            continue
        flat = node.get('data')
        if not isinstance(flat, list):
            continue
        rows: Dict[str, float] = {}
        for item in flat:
            if isinstance(item, dict) and 'country' in item and 'weight' in item:
                name = flat[item['country']]
                weight = flat[item['weight']]
                if isinstance(name, str) and isinstance(weight, (int, float)):
                    rows[name] = float(weight)
        if rows:
            return rows
    return {}


def fetch_market_split() -> Dict[str, float]:
    """Fetch current US / Developed-ex-US / Emerging weights from the ACWI
    country breakdown. Raises on network, parse, or sanity-check failure so the
    caller can fall back."""
    response = requests.get(ACWI_HOLDINGS_URL, headers={'User-Agent': _USER_AGENT}, timeout=15)
    response.raise_for_status()

    country_weights = _parse_country_weights(response.json())
    if not country_weights:
        raise ValueError("Could not parse country weights from ACWI holdings source")

    us_weight = developed_weight = emerging_weight = unknown_weight = 0.0
    unknown_countries = []
    for name, weight in country_weights.items():
        canonical = COUNTRY_ALIASES.get(name, name)
        if canonical == 'United States':
            us_weight += weight
        elif canonical in DEVELOPED_COUNTRIES_EX_US:
            developed_weight += weight
        elif canonical in EMERGING_COUNTRIES:
            emerging_weight += weight
        else:
            unknown_weight += weight
            unknown_countries.append(name)

    if unknown_countries:
        # Don't fail on newly-listed countries — just surface them. They're
        # excluded from the normalized total below (typically <0.1%).
        print(f"  Market split: ignoring {len(unknown_countries)} unclassified "
              f"countries ({unknown_weight:.2f}%): {', '.join(unknown_countries)}")

    total = us_weight + developed_weight + emerging_weight
    # If the source format changed, we'd get implausible numbers — bail so the
    # caller falls back to cache/default instead of serving garbage.
    if us_weight == 0.0 or total < 50.0:
        raise ValueError(
            f"Implausible market split (US={us_weight:.1f}%, classified total={total:.1f}%)"
        )

    # Normalize to 1.0 to absorb cash drag and any ignored countries.
    return {
        "US": round(us_weight / total, 4),
        "Developed": round(developed_weight / total, 4),
        "Emerging": round(emerging_weight / total, 4),
    }


def _read_cache() -> Optional[Dict[Region, float]]:
    if not MARKET_SPLIT_CACHE.exists():
        return None
    try:
        with open(MARKET_SPLIT_CACHE, 'r') as f:
            data = json.load(f)
        return {Region[k]: v for k, v in data.items()}
    except Exception:
        return None


def _write_cache(split: Dict[str, float]) -> None:
    try:
        CACHE_DIR.mkdir(exist_ok=True)
        with open(MARKET_SPLIT_CACHE, 'w') as f:
            json.dump(split, f, indent=2)
    except Exception:
        pass  # cache is best-effort (filesystem may be read-only/ephemeral)


def get_global_market_split(use_cache: bool = False) -> Dict[Region, float]:
    """Get the global market split, resilient to the live source being down.

    Resolution order: fresh cache (if requested) → live fetch → last-good cache
    → bundled default. Never raises, so portfolio endpoints stay up even when
    the upstream data source changes or is unreachable.
    """
    if use_cache:
        cached = _read_cache()
        if cached is not None:
            return cached

    try:
        split = fetch_market_split()
        _write_cache(split)
        return {Region[k]: v for k, v in split.items()}
    except Exception as e:
        print(f"  WARNING: live market split fetch failed ({e})")

    cached = _read_cache()
    if cached is not None:
        print("  Falling back to cached market split")
        return cached

    print("  Falling back to bundled default market split")
    return {Region[k]: v for k, v in DEFAULT_MARKET_SPLIT.items()}

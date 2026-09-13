"""Trailing 12-month distribution yield, fetched and cached.

This is a REFERENCE column only. It is never the model input.

A trailing yield is the wrong input for a 40-year projection: it moves inversely
with price, so it overstates after a drawdown and understates after a run-up.
It is shown beside the long-run assumption purely so divergence between the two
is visible.
"""
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Optional

from pydantic import BaseModel

# Cache directory in project root, matching equity_service / market_service.
CACHE_DIR = Path(__file__).parent.parent.parent.parent / ".cache"
YIELD_CACHE = CACHE_DIR / "reference_yields.json"

CACHE_TTL_HOURS = 24


class ReferenceYield(BaseModel):
    ticker: str
    # None when neither a live fetch nor a cache entry is available.
    ttm_yield: Optional[float] = None
    price: Optional[float] = None
    # 'live' | 'cache' | 'unavailable'
    source: str = "unavailable"
    as_of: Optional[str] = None


def _read_cache() -> Dict[str, dict]:
    if not YIELD_CACHE.exists():
        return {}
    try:
        with open(YIELD_CACHE, "r") as f:
            return json.load(f)
    except Exception:
        return {}


def _write_cache(payload: Dict[str, dict]) -> None:
    try:
        CACHE_DIR.mkdir(exist_ok=True)
        with open(YIELD_CACHE, "w") as f:
            json.dump(payload, f, indent=2)
    except Exception:
        pass  # filesystem may be read-only/ephemeral


def _fresh(entry: dict) -> bool:
    stamp = entry.get("as_of")
    if not stamp:
        return False
    try:
        age = datetime.now(timezone.utc) - datetime.fromisoformat(stamp)
    except Exception:
        return False
    return age < timedelta(hours=CACHE_TTL_HOURS)


def _fetch_one(ticker: str) -> Optional[dict]:
    """TTM distributions over latest close, via yfinance.

    Deliberately avoids `Ticker.info`, which Yahoo rate-limits aggressively; the
    chart/dividends endpoints are separate and far more reliable.
    """
    try:
        import yfinance as yf

        tk = yf.Ticker(ticker)
        hist = tk.history(period="1y", auto_adjust=False)
        dividends = tk.dividends
        if hist is None or len(hist) == 0 or dividends is None or len(dividends) == 0:
            return None

        price = float(hist["Close"].iloc[-1])
        cutoff = dividends.index.max() - timedelta(days=365)
        ttm = float(dividends[dividends.index > cutoff].sum())
        if price <= 0 or ttm <= 0:
            return None

        return {
            "ttm_yield": ttm / price,
            "price": price,
            "as_of": datetime.now(timezone.utc).isoformat(),
        }
    except Exception:
        return None


def get_reference_yields(tickers: List[str], use_cache: bool = True) -> List[ReferenceYield]:
    """Cache-if-fresh, then live, then stale cache, then unavailable. Never raises.

    A failed fetch degrades to a flagged 'unavailable' row rather than blocking
    the panel -- the assumption, not this number, drives the model.
    """
    cache = _read_cache()
    out: List[ReferenceYield] = []
    dirty = False

    for ticker in tickers:
        entry = cache.get(ticker)

        if use_cache and entry and _fresh(entry):
            out.append(
                ReferenceYield(
                    ticker=ticker,
                    ttm_yield=entry.get("ttm_yield"),
                    price=entry.get("price"),
                    source="cache",
                    as_of=entry.get("as_of"),
                )
            )
            continue

        fetched = _fetch_one(ticker)
        if fetched is not None:
            cache[ticker] = fetched
            dirty = True
            out.append(
                ReferenceYield(
                    ticker=ticker,
                    ttm_yield=fetched["ttm_yield"],
                    price=fetched["price"],
                    source="live",
                    as_of=fetched["as_of"],
                )
            )
        elif entry:
            out.append(
                ReferenceYield(
                    ticker=ticker,
                    ttm_yield=entry.get("ttm_yield"),
                    price=entry.get("price"),
                    source="cache",
                    as_of=entry.get("as_of"),
                )
            )
        else:
            out.append(ReferenceYield(ticker=ticker))

    if dirty:
        _write_cache(cache)

    return out

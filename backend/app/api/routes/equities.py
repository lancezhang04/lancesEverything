from fastapi import APIRouter, HTTPException, Query, Body
from typing import Dict
import json
from pathlib import Path

from ...services.equity_service import get_stock_prices, STOCK_PRICES_CACHE, CACHE_DIR
from ...core.config import config_manager

router = APIRouter(prefix="/api/equities", tags=["equities"])


@router.get("/prices")
async def get_prices(use_cache: bool = Query(False)) -> Dict[str, float]:
    """Fetch latest stock prices for all configured equities."""
    try:
        equities_config = config_manager.get_equities_config()
        tickers = list(equities_config.keys())
        prices = get_stock_prices(tickers, use_cache=use_cache)
        return prices
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/prices/update")
async def update_prices(prices: Dict[str, float] = Body(...)) -> Dict[str, str]:
    """Manually update stock prices in cache. Use this if yfinance is failing."""
    try:
        CACHE_DIR.mkdir(exist_ok=True)
        with open(STOCK_PRICES_CACHE, 'w') as f:
            json.dump(prices, f, indent=2)
        return {"status": "success", "message": f"Updated {len(prices)} prices"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

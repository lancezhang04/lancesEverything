"""Endpoints for the "make a market" game.

Reads all funnel through GET /state so the client can poll one URL; everything
else is a thin write that delegates the rules to exchange_service.
"""

import os

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Response
from pydantic import BaseModel
from typing import Optional

from ...services import exchange_service as ex

router = APIRouter(prefix="/api/exchange", tags=["exchange"])


class LoginRequest(BaseModel):
    username: str
    password: str


class ProductRequest(BaseModel):
    name: str
    description: str = ""
    expiry: str = ""
    unit_value: float = 0.5


class QuoteRequest(BaseModel):
    bid: float
    ask: float


class TradeRequest(BaseModel):
    side: str


class ValueRequest(BaseModel):
    value: float


class SettleRequest(BaseModel):
    value: Optional[float] = None


def current_user(authorization: str = Header(default="")) -> dict:
    token = authorization.removeprefix("Bearer ").strip()
    try:
        return ex.user_for_token(token)
    except ex.ExchangeError as e:
        raise HTTPException(status_code=401, detail=str(e))


def admin_user(user: dict = Depends(current_user)) -> dict:
    if not user["is_admin"]:
        raise HTTPException(status_code=403, detail="Admins only.")
    return user


def _run(fn, *args, **kwargs):
    """Call a service function, turning rule violations into a 400."""
    try:
        return fn(*args, **kwargs)
    except ex.ExchangeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login")
async def login(request: LoginRequest):
    return _run(ex.login, request.username, request.password)


@router.get("/state")
async def get_state(user: dict = Depends(current_user)):
    return ex.state_for(user["username"])


@router.post("/products/{product_id}/join")
async def join(product_id: int, user: dict = Depends(current_user)):
    _run(ex.join, product_id, user["username"])
    return {"status": "success"}


@router.post("/products/{product_id}/quote")
async def quote(product_id: int, request: QuoteRequest, user: dict = Depends(current_user)):
    _run(ex.quote, product_id, user["username"], request.bid, request.ask)
    return {"status": "success"}


@router.post("/products/{product_id}/pass")
async def abstain(product_id: int, user: dict = Depends(current_user)):
    _run(ex.abstain, product_id, user["username"])
    return {"status": "success"}


@router.post("/products/{product_id}/trade")
async def trade(product_id: int, request: TradeRequest, user: dict = Depends(current_user)):
    _run(ex.trade, product_id, user["username"], request.side)
    return {"status": "success"}


@router.post("/products")
async def create_product(request: ProductRequest, user: dict = Depends(admin_user)):
    return _run(
        ex.create_product, request.name, request.description, request.expiry, request.unit_value
    )


@router.put("/products/{product_id}/value")
async def set_value(product_id: int, request: ValueRequest, user: dict = Depends(admin_user)):
    _run(ex.set_current_value, product_id, request.value)
    return {"status": "success"}


@router.post("/products/{product_id}/settle")
async def settle(product_id: int, request: SettleRequest, user: dict = Depends(admin_user)):
    _run(ex.settle, product_id, request.value)
    return {"status": "success"}


@router.post("/products/{product_id}/advance")
async def advance(product_id: int, user: dict = Depends(admin_user)):
    _run(ex.advance, product_id)
    return {"status": "success"}


@router.delete("/users/{username}")
async def delete_user(username: str, user: dict = Depends(admin_user)):
    _run(ex.delete_user, username)
    return {"status": "success"}


@router.get("/export.csv")
async def export_csv(user: dict = Depends(admin_user)):
    return Response(
        content=ex.export_csv(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=exchange.csv"},
    )


@router.post("/dev/seed")
async def dev_seed(phase: str = Query(default="QUOTING")):
    """Wipe state and rebuild a game at the requested phase. Local testing only."""
    if os.environ.get("EXCHANGE_DEV") != "1":
        raise HTTPException(status_code=404, detail="Not found.")

    ex.reset()
    for name in ("alice", "bob", "carol"):
        ex.login(name, "pass")
    product = ex.create_product(
        "Times Tyler says 'clear as mud'", "Tally until end of day.", "", 0.5
    )
    pid = product["id"]
    for name in ("alice", "bob", "carol"):
        ex.join(pid, name)

    if phase in ("TRADING", "OPEN"):
        ex.quote(pid, "alice", 5, 10)
        ex.quote(pid, "bob", 6, 9)   # bob ends up the market maker
        ex.abstain(pid, "carol")
        ex.abstain(pid, "alice")
    if phase == "OPEN":
        ex.trade(pid, "alice", "BUY")
        ex.trade(pid, "carol", "SELL")
        ex.set_current_value(pid, 7)

    return {"status": "success", "phase": ex.state_for("admin")["products"][0]["phase"]}

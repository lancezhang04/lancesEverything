"""Endpoints for the "make a market" game.

Reads all funnel through GET /state so the client can poll one URL; everything
else is a thin write that delegates the rules to exchange_service.
"""

import json
import os
from datetime import datetime, timedelta, timezone

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
    """Exactly one of these: an absolute value, or a step to apply."""
    value: Optional[float] = None
    delta: Optional[float] = None


class SettleRequest(BaseModel):
    value: Optional[float] = None


class AdminRequest(BaseModel):
    is_admin: bool


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


@router.post("/products/{product_id}/value")
async def update_value(product_id: int, request: ValueRequest, user: dict = Depends(current_user)):
    """Set or step the tally. Admins write the confirmed value, players a proposal."""
    _run(
        ex.update_value,
        product_id,
        user["username"],
        user["is_admin"],
        request.value,
        request.delta,
    )
    return {"status": "success"}


@router.post("/products/{product_id}/value/confirm")
async def confirm_value(product_id: int, user: dict = Depends(admin_user)):
    _run(ex.confirm_value, product_id)
    return {"status": "success"}


@router.post("/session/clear")
async def clear_session(user: dict = Depends(admin_user)):
    """Wipe every product. Accounts survive."""
    ex.clear_session()
    return {"status": "success"}


@router.post("/products/{product_id}/settle")
async def settle(product_id: int, request: SettleRequest, user: dict = Depends(admin_user)):
    _run(ex.settle, product_id, request.value)
    return {"status": "success"}


@router.post("/products/{product_id}/advance")
async def advance(product_id: int, user: dict = Depends(admin_user)):
    _run(ex.advance, product_id)
    return {"status": "success"}


@router.delete("/products/{product_id}")
async def delete_product(product_id: int, user: dict = Depends(admin_user)):
    _run(ex.delete_product, product_id)
    return {"status": "success"}


@router.delete("/products/{product_id}/positions/{username}")
async def remove_position(product_id: int, username: str, user: dict = Depends(admin_user)):
    _run(ex.remove_position, product_id, username)
    return {"status": "success"}


@router.delete("/users/{username}")
async def delete_user(username: str, user: dict = Depends(admin_user)):
    _run(ex.delete_user, username)
    return {"status": "success"}


@router.put("/users/{username}/admin")
async def set_admin(username: str, request: AdminRequest, user: dict = Depends(admin_user)):
    _run(ex.set_admin, username, request.is_admin)
    return {"status": "success"}


@router.get("/export.json")
async def export_session(user: dict = Depends(admin_user)):
    """Session archive for committing to frontend/src/data/sessions/."""
    session = ex.export_session()
    return Response(
        content=json.dumps(session, indent=2),
        media_type="application/json",
        headers={
            "Content-Disposition": f'attachment; filename={session["session"]}.json'
        },
    )


_EXTRA_PLAYERS = ("dave", "erin", "frank")


def _seed_extra_board() -> None:
    """Fill the board out with more players, products and history.

    The primary product is left exactly as the plain seed builds it, so the
    walkthrough still applies; everything here is extra context sitting around
    it, with one product parked in each of the other phases.
    """
    for name in _EXTRA_PLAYERS:
        ex.login(name, "pass")
    ex.set_admin("dave", True)  # a second admin, to test handing the role over

    # SETTLED: a finished round, so positions show realised P&L.
    pid = ex.create_product("Slides in Tyler's deck", "Counted at the end.", "", 1.0)["id"]
    for name in ("alice", "bob", "carol", "dave"):
        ex.join(pid, name)
    ex.quote(pid, "alice", 15, 25)
    ex.quote(pid, "bob", 18, 22)   # bob makes the market
    for name in ("alice", "carol", "dave"):
        ex.abstain(pid, name)
    ex.trade(pid, "alice", "BUY")
    ex.trade(pid, "carol", "SELL")
    ex.trade(pid, "dave", "BUY")
    ex.update_value(pid, "admin", True, value=24)
    ex.settle(pid)

    # OPEN, expired, and carrying a player's unverified tally awaiting confirm.
    pid = ex.create_product("Minutes until first 'circle back'", "", "", 0.25)["id"]
    for name in ("alice", "bob", "carol", "erin"):
        ex.join(pid, name)
    ex.quote(pid, "erin", 8, 14)
    ex.quote(pid, "carol", 9, 12)
    for name in ("alice", "bob", "erin"):
        ex.abstain(pid, name)
    ex.trade(pid, "alice", "BUY")
    ex.trade(pid, "bob", "SELL")
    ex.trade(pid, "erin", "BUY")
    ex.update_value(pid, "admin", True, value=11)
    ex.update_value(pid, "alice", False, delta=1)
    # Backdated only once the round is built: join and trade both refuse an
    # already-expired product, so this state can't be reached going forwards.
    ex._products[pid]["expiry"] = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()

    # TRADING, half filled: bob has traded, carol and dave haven't.
    pid = ex.create_product("Coffees Tyler drinks before noon", "", "", 2.0)["id"]
    for name in ("bob", "carol", "dave", "frank"):
        ex.join(pid, name)
    ex.quote(pid, "dave", 2, 6)
    ex.quote(pid, "frank", 3, 5)
    for name in ("bob", "carol", "dave"):
        ex.abstain(pid, name)
    ex.trade(pid, "bob", "BUY")

    # QUOTING, one wide market posted, expiry still ahead of it.
    next_week = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    pid = ex.create_product(
        "Times someone says 'let's take this offline'", "", next_week, 0.5
    )["id"]
    for name in ("alice", "dave", "erin", "frank"):
        ex.join(pid, name)
    ex.quote(pid, "erin", 20, 40)


@router.post("/dev/seed")
async def dev_seed(phase: str = Query(default="QUOTING"), full: bool = Query(default=False)):
    """Wipe state and rebuild a game at the requested phase. Local testing only.

    ``full=1`` adds three more players and four more products around the
    primary one, covering every phase at once.
    """
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
        ex.update_value(pid, "admin", True, value=7)

    if full:
        _seed_extra_board()

    state = ex.state_for("admin")
    return {
        "status": "success",
        "phase": state["products"][0]["phase"],
        "products": len(state["products"]),
        "users": len(state["users"]),
    }

"""In-memory exchange for the "make a market" game.

All state lives in module-level dicts and is wiped on restart, which is fine for
a 5-20 player game. This only works on a *single* worker process: with more than
one, players would land on different processes and see different markets.

Every mutating helper holds ``_lock``, so the rules stay safe even if a caller
awaits mid-request.

A product moves through four phases:

    QUOTING  players post progressively tighter markets, or pass
    TRADING  everyone except the market maker lifts the ask or hits the bid
    OPEN     trades are locked in; admin updates the running tally
    SETTLED  admin fixes the final value and P&L is realised
"""

from __future__ import annotations

import csv
import hashlib
import io
import secrets
import threading
from datetime import datetime, timezone
from typing import Dict, List, Optional

ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin_pass"

QUOTING = "QUOTING"
TRADING = "TRADING"
OPEN = "OPEN"
SETTLED = "SETTLED"

_lock = threading.RLock()
_users: Dict[str, dict] = {}
_tokens: Dict[str, str] = {}
_products: Dict[int, dict] = {}
_next_product_id = 1


class ExchangeError(Exception):
    """A rule violation. Routes turn this into a 400 with the message shown to the player."""


# --------------------------------------------------------------------------- helpers


def _hash(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _product(product_id: int) -> dict:
    product = _products.get(product_id)
    if product is None:
        raise ExchangeError(f"No product with id {product_id}.")
    return product


def _require_phase(product: dict, *phases: str) -> None:
    if product["phase"] not in phases:
        raise ExchangeError(
            f"'{product['name']}' is in the {product['phase']} phase — that action isn't available."
        )


def _require_participant(product: dict, username: str) -> None:
    if username not in product["participants"]:
        raise ExchangeError("Join this product before taking part.")


def _is_expired(product: dict) -> bool:
    """Expiry is a soft gate: it blocks new quotes and trades but never auto-settles."""
    raw = product.get("expiry")
    if not raw:
        return False
    try:
        expiry = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
    except ValueError:
        return False
    if expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc) >= expiry


def _require_live(product: dict) -> None:
    if _is_expired(product):
        raise ExchangeError(f"'{product['name']}' has expired and is awaiting settlement.")


def _others(product: dict) -> List[str]:
    return [u for u in product["participants"] if u != product["maker"]]


def _maybe_advance(product: dict) -> None:
    """Move the product on if the current phase has run its course."""
    if product["phase"] == QUOTING:
        others = _others(product)
        if product["maker"] and others and all(u in product["passed"] for u in others):
            product["phase"] = TRADING
    elif product["phase"] == TRADING:
        others = _others(product)
        if others and all(u in product["trades"] for u in others):
            product["phase"] = OPEN


# --------------------------------------------------------------------------- accounts


def login(username: str, password: str) -> dict:
    """Sign in, or create the account if the username is new."""
    username = username.strip()
    if not username or not password:
        raise ExchangeError("Username and password are both required.")
    with _lock:
        user = _users.get(username)
        if user is None:
            user = {"username": username, "password_hash": _hash(password), "is_admin": False}
            _users[username] = user
        elif user["password_hash"] != _hash(password):
            raise ExchangeError("Wrong password.")
        token = secrets.token_hex(16)
        _tokens[token] = username
        return {"token": token, "username": username, "is_admin": user["is_admin"]}


def user_for_token(token: Optional[str]) -> dict:
    username = _tokens.get(token or "")
    user = _users.get(username or "")
    if user is None:
        raise ExchangeError("Not signed in.")
    return user


def delete_user(username: str) -> None:
    with _lock:
        if username == ADMIN_USERNAME:
            raise ExchangeError("The admin account can't be deleted.")
        if username not in _users:
            raise ExchangeError(f"No user named '{username}'.")
        del _users[username]
        for token, owner in list(_tokens.items()):
            if owner == username:
                del _tokens[token]
        # Drop them from products still in play so phases don't stall on a ghost,
        # but leave recorded trades alone so the CSV keeps a full history.
        for product in _products.values():
            if product["phase"] in (QUOTING, TRADING):
                if username in product["participants"]:
                    product["participants"].remove(username)
                if username in product["passed"]:
                    product["passed"].remove(username)
                _maybe_advance(product)


# --------------------------------------------------------------------------- products


def create_product(name: str, description: str, expiry: str, unit_value: float) -> dict:
    global _next_product_id
    if not name.strip():
        raise ExchangeError("Product name is required.")
    with _lock:
        product = {
            "id": _next_product_id,
            "name": name.strip(),
            "description": description,
            "expiry": expiry,
            "unit_value": float(unit_value),
            "phase": QUOTING,
            "bid": None,
            "ask": None,
            "maker": None,
            "participants": [],
            "passed": [],
            "trades": {},
            "quote_history": [],
            "current_value": None,
            "settle_value": None,
            "created_at": _now(),
        }
        _products[_next_product_id] = product
        _next_product_id += 1
        return product


def join(product_id: int, username: str) -> None:
    with _lock:
        product = _product(product_id)
        _require_phase(product, QUOTING)
        _require_live(product)
        if username not in product["participants"]:
            product["participants"].append(username)


def quote(product_id: int, username: str, bid: float, ask: float) -> None:
    """Post a market. After the first one, each must be strictly tighter than the last."""
    with _lock:
        product = _product(product_id)
        _require_phase(product, QUOTING)
        _require_live(product)
        _require_participant(product, username)
        if username in product["passed"]:
            raise ExchangeError("You've passed on this product — you're out of the quoting round.")
        bid, ask = float(bid), float(ask)
        if bid >= ask:
            raise ExchangeError("Bid must be below ask.")
        if product["maker"] is not None:
            tighter = bid >= product["bid"] and ask <= product["ask"]
            unchanged = bid == product["bid"] and ask == product["ask"]
            if not tighter or unchanged:
                raise ExchangeError(
                    f"Your market must be tighter than {product['bid']:g} @ {product['ask']:g}."
                )
        product["bid"], product["ask"], product["maker"] = bid, ask, username
        product["quote_history"].append(
            {"user": username, "bid": bid, "ask": ask, "at": _now()}
        )
        _maybe_advance(product)


def abstain(product_id: int, username: str) -> None:
    with _lock:
        product = _product(product_id)
        _require_phase(product, QUOTING)
        _require_participant(product, username)
        if username == product["maker"]:
            raise ExchangeError("You're the current market maker — you can't pass on your own market.")
        if username not in product["passed"]:
            product["passed"].append(username)
        _maybe_advance(product)


def trade(product_id: int, username: str, side: str) -> None:
    side = (side or "").upper()
    if side not in ("BUY", "SELL"):
        raise ExchangeError("Side must be BUY or SELL.")
    with _lock:
        product = _product(product_id)
        _require_phase(product, TRADING)
        _require_live(product)
        _require_participant(product, username)
        if username == product["maker"]:
            raise ExchangeError("You made the market — you take the other side of every trade.")
        if username in product["trades"]:
            raise ExchangeError("You've already traded on this product. No take-backs.")
        product["trades"][username] = side
        _maybe_advance(product)


def set_current_value(product_id: int, value: float) -> None:
    """Admin updates the running tally. Drives live mark-to-market P&L."""
    with _lock:
        product = _product(product_id)
        if product["phase"] == SETTLED:
            raise ExchangeError("This product is settled — change the settlement value instead.")
        product["current_value"] = float(value)


def settle(product_id: int, value: Optional[float] = None) -> None:
    """Fix the final value. Defaults to the running tally if one has been set."""
    with _lock:
        product = _product(product_id)
        final = product["current_value"] if value is None else float(value)
        if final is None:
            raise ExchangeError("Set a current value first, or pass a settlement value.")
        if product["maker"] is None:
            raise ExchangeError("This product never had a market made on it.")
        product["settle_value"] = final
        product["current_value"] = final
        product["phase"] = SETTLED


def advance(product_id: int) -> None:
    """Admin escape hatch: force the phase forward when players stall."""
    with _lock:
        product = _product(product_id)
        if product["phase"] == QUOTING:
            if product["maker"] is None:
                raise ExchangeError("Nobody has made a market yet.")
            product["phase"] = TRADING
        elif product["phase"] == TRADING:
            product["phase"] = OPEN
        else:
            raise ExchangeError("Use settle to close an open product.")


# --------------------------------------------------------------------------- views


def _positions(product: dict) -> List[dict]:
    """Every participant's standing on one product, including the maker's net."""
    mark = product["settle_value"] if product["phase"] == SETTLED else product["current_value"]
    rows: List[dict] = []
    maker_pnl = 0.0

    for username, side in product["trades"].items():
        price = product["ask"] if side == "BUY" else product["bid"]
        pnl = None
        if mark is not None and price is not None:
            units = (mark - price) if side == "BUY" else (price - mark)
            pnl = units * product["unit_value"]
            maker_pnl -= pnl
        rows.append({"user": username, "side": side, "price": price, "pnl": pnl})

    for username in product["participants"]:
        if username != product["maker"] and username not in product["trades"]:
            rows.append({"user": username, "side": "PENDING", "price": None, "pnl": None})

    if product["maker"]:
        rows.append(
            {
                "user": product["maker"],
                "side": "MAKER",
                "price": None,
                "pnl": maker_pnl if mark is not None else None,
            }
        )
    return rows


def _public(product: dict) -> dict:
    return {
        **{k: product[k] for k in (
            "id", "name", "description", "expiry", "unit_value", "phase",
            "bid", "ask", "maker", "participants", "passed", "trades",
            "quote_history", "current_value", "settle_value",
        )},
        "expired": _is_expired(product),
        "positions": _positions(product),
    }


def state_for(username: str) -> dict:
    """One fat read: everything the client needs to render, for polling."""
    with _lock:
        user = _users[username]
        products = [_public(p) for p in _products.values()]
        positions = [
            {
                "product_id": product["id"],
                "product": product["name"],
                "unit_value": product["unit_value"],
                "phase": product["phase"],
                "bid": product["bid"],
                "ask": product["ask"],
                "mark": product["settle_value"] if product["phase"] == SETTLED else product["current_value"],
                **{k: v for k, v in row.items() if k != "user"},
            }
            for product in products
            for row in product["positions"]
            if row["user"] == username
        ]
        return {
            "me": {"username": username, "is_admin": user["is_admin"]},
            "products": products,
            "positions": positions,
            "users": (
                [{"username": u["username"], "is_admin": u["is_admin"]} for u in _users.values()]
                if user["is_admin"]
                else []
            ),
        }


def export_csv() -> str:
    with _lock:
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(
            ["product_id", "product", "phase", "user", "side", "price",
             "bid", "ask", "mark", "unit_value", "pnl"]
        )
        for product in _products.values():
            mark = product["settle_value"] if product["phase"] == SETTLED else product["current_value"]
            for row in _positions(product):
                writer.writerow(
                    [product["id"], product["name"], product["phase"], row["user"],
                     row["side"], row["price"], product["bid"], product["ask"],
                     mark, product["unit_value"], row["pnl"]]
                )
        return buffer.getvalue()


# --------------------------------------------------------------------------- test support


def reset(seed_admin: bool = True) -> None:
    """Wipe all state. Used by the dev seed endpoint."""
    global _next_product_id
    with _lock:
        _users.clear()
        _tokens.clear()
        _products.clear()
        _next_product_id = 1
        if seed_admin:
            _users[ADMIN_USERNAME] = {
                "username": ADMIN_USERNAME,
                "password_hash": _hash(ADMIN_PASSWORD),
                "is_admin": True,
            }


reset()

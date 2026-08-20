---
name: test-exchange
description: Spin up the /exchange "make a market" game locally with mock accounts and a seeded product, ready to click through in the browser. Use when testing, debugging, or demoing the exchange feature.
---

# Test the exchange locally

Gets a full game running on localhost with three mock players and an admin, so
the market-making flow can be clicked through end to end.

Accept an optional starting phase as an argument: `QUOTING` (default), `TRADING`,
or `OPEN`. Use a later phase to jump straight to the part being tested instead of
replaying a whole round.

Also accept an optional `--full` flag, in either order (`/test-exchange OPEN --full`).
It keeps the primary product exactly as it is without the flag and adds three more
players and four more products around it, one parked in each phase. Reach for it
when testing anything that needs a populated board — the product list, filtering
and sorting, cross-product P&L, the admin screens — and leave it off when walking
a single round end to end, where the extra products are just noise.

## 1. Bootstrap the backend venv if it's missing

Build it with **Python 3.12**, not the default `python3`. The pinned
`pydantic==2.5.3` and `pandas==2.2.0` predate 3.13 and have no wheels for it, so
`python3 -m venv` on a 3.13 default fails trying to compile pydantic-core from
Rust source:

```bash
cd backend
[ -d venv ] || python3.12 -m venv venv
./venv/bin/pip install -q -r requirements.txt
```

If 3.12 isn't installed, `brew install python@3.12` — or, since the exchange
itself is pure standard library, skip the venv entirely and test it through the
curl recipes at the bottom of this file with only `fastapi`, `pydantic` and
`uvicorn` installed.

## 2. Start both servers in the background

The seed endpoint is gated behind `EXCHANGE_DEV=1` and 404s without it, so the
backend must be started with that set:

```bash
cd backend && EXCHANGE_DEV=1 ./venv/bin/uvicorn app.main:app --reload --port 8000
```

```bash
cd frontend && npm install && npm run dev
```

Run both with `run_in_background: true`. Vite proxies `/api` to port 8000
(`frontend/vite.config.ts`), so local dev is same-origin and CORS never applies —
unlike production, where the frontend is on Cloudflare and the API is elsewhere.

Wait for the backend to answer before seeding:

```bash
curl -sf http://localhost:8000/health
```

## 3. Seed the game

Replace `QUOTING` with the requested phase, and add `&full=1` for `--full`:

```bash
curl -sX POST "http://localhost:8000/api/exchange/dev/seed?phase=QUOTING" | python3 -m json.tool
```

The response reports the phase it landed on plus the product and user counts, which
is the quickest check that the flag took effect: 1 product and 4 users without it,
5 and 7 with it.

This wipes all exchange state and rebuilds it, creating:

| Account | Password | Role |
|---|---|---|
| `admin` | `admin_pass` | creates products, updates the running value, settles, exports CSV |
| `alice` | `pass` | player |
| `bob` | `pass` | player |
| `carol` | `pass` | player |

Plus one product, *"Times Tyler says 'clear as mud'"*, at 0.50 per unit with all
three players joined.

At `TRADING` alice has quoted 5 @ 10, bob has tightened to 6 @ 9 and is the market
maker, and the others have passed. At `OPEN` alice has lifted the ask, carol has
hit the bid, and the running value is 7.

### What `--full` adds

Three more players — `dave`, `erin`, `frank`, all with password `pass` — and four
more products. `dave` is also made an admin, so handing the role over and having two
admins at once can be tested. The four extra products cover the states a single
round can't show at the same time:

| Product | Phase | What it exercises |
|---|---|---|
| *Slides in Tyler's deck* | `SETTLED` | realised P&L — bob made 18 @ 22, settled at 24, so the buyers are up and the seller is down |
| *Minutes until first 'circle back'* | `OPEN` | an expired product awaiting settlement, carrying alice's unverified tally of 12 against a confirmed 11 |
| *Coffees Tyler drinks before noon* | `TRADING` | a half-filled book — bob has traded, carol and dave haven't |
| *Times someone says 'let's take this offline'* | `QUOTING` | a fresh wide market (erin at 20 @ 40) with an expiry a week out |

Unit values vary across them (0.25 to 2.0) so P&L bugs that only show up at a
non-default multiplier have somewhere to surface.

## 4. Report how to drive it

Tell the user to open **http://localhost:5173/exchange**, and that testing several
players at once needs **separate incognito windows** — the auth token lives in
localStorage, so two players can't share one browser profile.

Suggest a path through the game that matches the seeded phase. From `QUOTING`:
sign in as alice and quote 5 @ 10, tighten to 6 @ 9 as bob, pass as carol and
alice, then trade as alice and carol, then sign in as admin to update the current
value and settle.

That path is unchanged by `--full` — the primary product is seeded identically
either way, and the extra products sit alongside it untouched.

## Checking state without the UI

To inspect the raw game state, log in and reuse the token:

```bash
TOKEN=$(curl -sX POST http://localhost:8000/api/exchange/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"bob","password":"pass"}' | python3 -c 'import json,sys; print(json.load(sys.stdin)["token"])')

curl -s http://localhost:8000/api/exchange/state \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

Swap in the `admin`/`admin_pass` token to reach the admin-only routes
(`POST /products`, `PUT /products/{id}/value`, `POST /products/{id}/settle`,
`DELETE /users/{name}`, `GET /export.json`).

`GET /export.json` is the session archive that the Past sessions tab replays.
To check a change to it end to end, download it and drop it in
`frontend/src/data/sessions/` — files there are picked up at build time, so it
appears in the session picker with no manifest to update.

## Notes

- All state is in memory in `backend/app/services/exchange_service.py`. Restarting
  the backend wipes every account and product — expected, not a bug. `--reload`
  also wipes state on any backend file edit, so re-seed after touching the backend.
- Only ever run one uvicorn worker. State is per-process, so multiple workers
  would put players in different games.
- If a game stalls because someone never joined or never acted, the admin can call
  `POST /products/{id}/advance` to force the phase forward.
- The expired product under `--full` is backdated after its round is built, because
  `join` and `trade` both refuse an already-expired product. Expiry is a soft gate:
  it blocks new quotes and trades but never auto-settles, so an admin can still
  settle that product by hand.

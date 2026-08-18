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

Replace `QUOTING` with the requested phase:

```bash
curl -sX POST "http://localhost:8000/api/exchange/dev/seed?phase=QUOTING" | python3 -m json.tool
```

This wipes all exchange state and rebuilds it, creating:

| Account | Password | Role |
|---|---|---|
| `admin` | `admin_pass` | creates products, updates the running value, settles, exports CSV |
| `alice` | `pass` | player |
| `bob` | `pass` | player |
| `carol` | `pass` | player |

Plus one product, *"Times Tyler says 'clear as mud'"*, at $0.50 per unit with all
three players joined.

At `TRADING` alice has quoted 5 @ 10, bob has tightened to 6 @ 9 and is the market
maker, and the others have passed. At `OPEN` alice has lifted the ask, carol has
hit the bid, and the running value is 7.

## 4. Report how to drive it

Tell the user to open **http://localhost:5173/exchange**, and that testing several
players at once needs **separate incognito windows** — the auth token lives in
localStorage, so two players can't share one browser profile.

Suggest a path through the game that matches the seeded phase. From `QUOTING`:
sign in as alice and quote 5 @ 10, tighten to 6 @ 9 as bob, pass as carol and
alice, then trade as alice and carol, then sign in as admin to update the current
value and settle.

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
`DELETE /users/{name}`, `GET /export.csv`).

## Notes

- All state is in memory in `backend/app/services/exchange_service.py`. Restarting
  the backend wipes every account and product — expected, not a bug. `--reload`
  also wipes state on any backend file edit, so re-seed after touching the backend.
- Only ever run one uvicorn worker. State is per-process, so multiple workers
  would put players in different games.
- If a game stalls because someone never joined or never acted, the admin can call
  `POST /products/{id}/advance` to force the phase forward.

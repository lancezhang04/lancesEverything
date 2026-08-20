# Development

[← back to README](../README.md)

## Layout

```
config.yaml              portfolio holdings, factor loadings, premium assumptions
backend/
  app/
    main.py              FastAPI app, CORS, router wiring
    api/routes/          portfolio · config · equities · exchange
    core/                config manager (YAML + in-memory overrides), models
    services/
      portfolio_service.py   loadings, active share, rebalancing
      equity_service.py      prices, core-satellite blend
      market_service.py      MSCI ACWI regional split + cache/fallback
      exchange_service.py    the whole LanceX game, in memory
frontend/
  src/
    components/
      layout/            home page, dashboard shell, header, footer
      holdings/ factors/ targets/ rebalance/    portfolio tabs
      workout/           day tables, activation radar, HIIT card, methodology
      exchange/          LanceX board, product detail, leaderboard, admin, recaps
    data/
      workoutData.ts     the entire workout program
      sessions/*.json    archived LanceX game nights (bundled at build time)
.cache/                  stock prices + market split, refreshed on demand
```

Routes: `/` home · `/portfolio` · `/workout` · `/exchange`.

## Prerequisites

**Python 3.12** for the backend — `pydantic==2.5.3` and `pandas==2.2.0` predate
3.13 and have no wheels for it, so a 3.13 venv fails trying to build
pydantic-core from Rust source.

```bash
cd backend
python3.12 -m venv venv
./venv/bin/pip install -r requirements.txt
```

Node 18+ for the frontend (Vite 7).

## Running

```bash
# terminal 1 — API on :8000  (EXCHANGE_DEV=1 unlocks the LanceX seed endpoint)
cd backend && EXCHANGE_DEV=1 ./venv/bin/uvicorn app.main:app --reload --port 8000

# terminal 2 — app on :5173
cd frontend && npm install && npm run dev
```

Vite proxies `/api` to port 8000, so local dev is same-origin and CORS never
applies. Interactive API docs are at `localhost:8000/docs`.

Run **one** uvicorn worker only: LanceX state is per-process, so multiple workers
would put players in different games. `--reload` also wipes that state whenever a
backend file changes — re-seed after editing.

## Environment

| Variable | Side | Purpose |
|----------|------|---------|
| `ALLOWED_ORIGINS` | backend | Comma-separated extra CORS origins (localhost:5173 and :3000 are always allowed) |
| `EXCHANGE_DEV` | backend | `1` enables `POST /api/exchange/dev/seed`; without it the route 404s |
| `VITE_API_URL` | frontend | Absolute API base for production builds; unset means same-origin |

## Data sources and caching

Both live feeds degrade instead of failing:

- **Share prices** — Yahoo Finance chart API → `.cache/stock_prices.json`. Every
  portfolio endpoint takes `?use_cache=true` to skip the network.
- **Regional split** — MSCI ACWI country weights from stockanalysis.com →
  `.cache/market_split.json`, with a hardcoded snapshot as the last resort. When
  the app is running on stale data it says so in the UI rather than pretending.

## Deploying

`npm run build` type-checks and emits static files to `frontend/dist` (deployed
on Cloudflare). The API runs separately, which is why the frontend is
cross-origin in production and same-origin in dev — set `VITE_API_URL` at build
time and add the site's origin to `ALLOWED_ORIGINS` on the API.

Because the deployed frontend is static, anything it needs without an API call
has to be bundled — which is why archived LanceX sessions are committed JSON
files rather than an endpoint.

## Claude Code skills

`.claude/skills/` holds two project skills for the exchange:

| Skill | Does |
|-------|------|
| `/test-exchange [PHASE] [--full]` | Starts both servers and seeds a game at the requested phase |
| `/stop-exchange` | Stops them and confirms both ports are free |

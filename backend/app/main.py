import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import portfolio, config, equities

app = FastAPI(
    title="Portfolio Rebalancer API",
    description="API for portfolio rebalancing and factor analysis",
    version="1.0.0"
)

# Configure CORS — extend via ALLOWED_ORIGINS env var (comma-separated)
_default_origins = ["http://localhost:5173", "http://localhost:3000"]
_extra_origins = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "").split(",") if o.strip()]
_allowed_origins = _default_origins + _extra_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(portfolio.router)
app.include_router(config.router)
app.include_router(equities.router)


@app.get("/")
async def root():
    return {"message": "Portfolio Rebalancer API", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import portfolio, config, equities

app = FastAPI(
    title="Portfolio Rebalancer API",
    description="API for portfolio rebalancing and factor analysis",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Vite default port
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

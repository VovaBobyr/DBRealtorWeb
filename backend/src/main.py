"""FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.routers import alerts, dashboard, listings, trends

app = FastAPI(
    title="DBRealtor Web API",
    description="Read-only analytics API over the DBRealtor scraper database.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:80", "http://localhost"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(dashboard.router)
app.include_router(trends.router)
app.include_router(listings.router)
app.include_router(alerts.router)


@app.get("/health", tags=["meta"])
async def health() -> dict[str, str]:
    return {"status": "ok"}

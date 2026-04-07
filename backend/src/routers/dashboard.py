"""GET /api/dashboard/summary — top-level summary stats."""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_session
from src.models import Listing, ScrapeRun

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


class LastScrapeRun(BaseModel):
    status: str
    started_at: datetime
    finished_at: datetime | None
    listings_found: int


class DashboardSummary(BaseModel):
    total_listings: int
    new_today: int
    avg_price_czk: float | None
    last_scrape_run: LastScrapeRun | None


@router.get("/summary", response_model=DashboardSummary)
async def get_summary(session: AsyncSession = Depends(get_session)) -> DashboardSummary:
    today_cutoff = datetime.now(timezone.utc) - timedelta(hours=24)

    total_result = await session.execute(
        select(func.count()).select_from(Listing).where(Listing.is_active.is_(True))
    )
    total_listings: int = total_result.scalar_one()

    new_today_result = await session.execute(
        select(func.count())
        .select_from(Listing)
        .where(Listing.is_active.is_(True), Listing.first_seen_at >= today_cutoff)
    )
    new_today: int = new_today_result.scalar_one()

    avg_result = await session.execute(
        select(func.avg(Listing.price_czk))
        .where(
            Listing.is_active.is_(True),
            Listing.locality.ilike("%Praha%"),
            Listing.price_czk.isnot(None),
        )
    )
    avg_price_czk: float | None = avg_result.scalar_one()

    run_result = await session.execute(
        select(ScrapeRun).order_by(ScrapeRun.started_at.desc()).limit(1)
    )
    last_run = run_result.scalar_one_or_none()

    last_scrape_run: LastScrapeRun | None = None
    if last_run is not None:
        last_scrape_run = LastScrapeRun(
            status=last_run.status,
            started_at=last_run.started_at,
            finished_at=last_run.finished_at,
            listings_found=last_run.listings_found,
        )

    return DashboardSummary(
        total_listings=total_listings,
        new_today=new_today,
        avg_price_czk=round(avg_price_czk) if avg_price_czk is not None else None,
        last_scrape_run=last_scrape_run,
    )

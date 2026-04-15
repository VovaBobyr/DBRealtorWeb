"""GET /api/trends/price       — monthly avg price trend.
GET /api/trends/new-per-day  — daily new-listing count (same locality/type/months filters).
GET /api/trends/new-listings — daily count, days-window filter (legacy).
"""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_session

router = APIRouter(prefix="/api/trends", tags=["trends"])


class PriceTrendPoint(BaseModel):
    month: str
    avg_price_czk: int
    avg_price_per_m2: int | None
    count: int


class NewListingsDayPoint(BaseModel):
    day: str
    count: int


class NewPerDayPoint(BaseModel):
    date: str
    count: int


@router.get("/price", response_model=list[PriceTrendPoint])
async def get_price_trend(
    locality: str = Query(default="Praha", description="Locality substring filter"),
    property_type: str = Query(default="flat", description="flat|house|land|commercial"),
    months: int = Query(default=12, ge=1, le=60, description="Number of months to look back"),
    session: AsyncSession = Depends(get_session),
) -> list[PriceTrendPoint]:
    cutoff = datetime.now(timezone.utc) - timedelta(days=months * 31)

    rows = await session.execute(
        text(
            """
            SELECT
                to_char(ph.recorded_at, 'YYYY-MM')      AS month,
                ROUND(AVG(ph.price_czk))::bigint         AS avg_price_czk,
                CASE
                    WHEN AVG(l.area_m2) > 0
                    THEN ROUND(AVG(ph.price_czk) / NULLIF(AVG(l.area_m2), 0))::bigint
                    ELSE NULL
                END                                      AS avg_price_per_m2,
                COUNT(*)::int                            AS cnt
            FROM price_history ph
            JOIN listings l ON l.id = ph.listing_id
            WHERE l.locality ILIKE :locality_pat
              AND l.property_type = :property_type
              AND ph.recorded_at >= :cutoff
              AND ph.price_czk IS NOT NULL
            GROUP BY month
            ORDER BY month
            """
        ),
        {
            "locality_pat": f"%{locality}%",
            "property_type": property_type,
            "cutoff": cutoff,
        },
    )

    return [
        PriceTrendPoint(
            month=r.month,
            avg_price_czk=r.avg_price_czk,
            avg_price_per_m2=r.avg_price_per_m2,
            count=r.cnt,
        )
        for r in rows
    ]


@router.get("/new-per-day", response_model=list[NewPerDayPoint])
async def get_new_per_day(
    locality: str = Query(default="Praha", description="Locality substring filter"),
    property_type: str = Query(default="flat", description="flat|house|land|commercial"),
    months: int = Query(default=12, ge=1, le=60, description="Number of months to look back"),
    session: AsyncSession = Depends(get_session),
) -> list[NewPerDayPoint]:
    """Count of new listings per calendar day, filtered by locality and property type.

    Uses the same locality/property_type/months parameters as /price so both
    charts on the Trends page share a single set of controls.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=months * 31)
    rows = await session.execute(
        text(
            """
            SELECT
                DATE(first_seen_at AT TIME ZONE 'Europe/Prague') AS date,
                COUNT(*)::int                                     AS count
            FROM listings
            WHERE locality      ILIKE :locality_pat
              AND property_type = :property_type
              AND first_seen_at >= :cutoff
            GROUP BY date
            ORDER BY date
            """
        ),
        {
            "locality_pat": f"%{locality}%",
            "property_type": property_type,
            "cutoff": cutoff,
        },
    )
    return [NewPerDayPoint(date=str(r.date), count=r.count) for r in rows]


@router.get("/new-listings", response_model=list[NewListingsDayPoint])
async def get_new_listings_trend(
    days: int = Query(default=30, ge=7, le=365, description="Number of days to look back"),
    session: AsyncSession = Depends(get_session),
) -> list[NewListingsDayPoint]:
    """Daily count of listings first seen within the given window.

    Counts all listings regardless of current active status — a listing that
    appeared on day X and was later delisted still counts for that day.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    rows = await session.execute(
        text(
            """
            SELECT
                DATE(first_seen_at AT TIME ZONE 'Europe/Prague') AS day,
                COUNT(*)::int                                     AS count
            FROM listings
            WHERE first_seen_at >= :cutoff
            GROUP BY day
            ORDER BY day
            """
        ),
        {"cutoff": cutoff},
    )
    return [NewListingsDayPoint(day=str(r.day), count=r.count) for r in rows]

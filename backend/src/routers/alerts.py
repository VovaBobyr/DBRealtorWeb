"""GET /api/alerts — new listings and price drops."""

import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_session
from src.models import Listing

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


class NewListingItem(BaseModel):
    id: uuid.UUID
    sreality_id: str
    title: str
    locality: str | None
    property_type: str
    listing_type: str
    price_czk: int | None
    area_m2: int | None
    first_seen_at: datetime
    url: str


class PriceDropItem(BaseModel):
    sreality_id: str
    title: str
    locality: str | None
    url: str
    old_price_czk: int
    new_price_czk: int
    drop_pct: float


class AlertsResponse(BaseModel):
    new_listings: list[NewListingItem]
    price_drops: list[PriceDropItem]


@router.get("", response_model=AlertsResponse)
async def get_alerts(
    hours: int = Query(default=24, ge=1, le=168),
    min_drop_pct: float = Query(default=5.0, ge=0.1, le=100.0),
    session: AsyncSession = Depends(get_session),
) -> AlertsResponse:
    since = datetime.now(timezone.utc) - timedelta(hours=hours)

    new_result = await session.execute(
        select(Listing)
        .where(Listing.first_seen_at >= since, Listing.is_active.is_(True))
        .order_by(Listing.first_seen_at.desc())
    )
    new_rows = list(new_result.scalars().all())

    new_listings = [
        NewListingItem(
            id=r.id,
            sreality_id=r.sreality_id,
            title=r.title,
            locality=r.locality,
            property_type=r.property_type,
            listing_type=r.listing_type,
            price_czk=r.price_czk,
            area_m2=r.area_m2,
            first_seen_at=r.first_seen_at,
            url=r.url,
        )
        for r in new_rows
    ]

    drop_rows = await session.execute(
        text(
            """
            WITH ranked AS (
                SELECT
                    ph.listing_id,
                    ph.price_czk,
                    ph.recorded_at,
                    LAG(ph.price_czk) OVER (
                        PARTITION BY ph.listing_id ORDER BY ph.recorded_at
                    ) AS prev_price_czk
                FROM price_history ph
            )
            SELECT
                l.sreality_id,
                l.title,
                l.locality,
                l.url,
                r.prev_price_czk  AS old_price_czk,
                r.price_czk       AS new_price_czk,
                ROUND(
                    (r.prev_price_czk - r.price_czk)::numeric
                    / r.prev_price_czk * 100,
                    2
                ) AS drop_pct
            FROM ranked r
            JOIN listings l ON l.id = r.listing_id
            WHERE r.recorded_at >= :since
              AND r.prev_price_czk IS NOT NULL
              AND r.price_czk < r.prev_price_czk
              AND (r.prev_price_czk - r.price_czk)::float
                  / r.prev_price_czk * 100 >= :min_drop_pct
              AND l.is_active = TRUE
            ORDER BY drop_pct DESC
            """
        ),
        {"since": since, "min_drop_pct": min_drop_pct},
    )

    price_drops = [
        PriceDropItem(
            sreality_id=r.sreality_id,
            title=r.title,
            locality=r.locality,
            url=r.url,
            old_price_czk=r.old_price_czk,
            new_price_czk=r.new_price_czk,
            drop_pct=float(r.drop_pct),
        )
        for r in drop_rows
    ]

    return AlertsResponse(new_listings=new_listings, price_drops=price_drops)

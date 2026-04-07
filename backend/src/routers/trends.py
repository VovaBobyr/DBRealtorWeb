"""GET /api/trends/price — monthly avg price trend."""

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

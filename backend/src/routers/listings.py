"""GET /api/listings — paginated listing browser."""

import uuid
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_session
from src.models import Listing

router = APIRouter(prefix="/api/listings", tags=["listings"])

SortField = Literal["price_czk", "area_m2", "first_seen_at", "price_per_m2"]
SortOrder = Literal["asc", "desc"]


class ListingItem(BaseModel):
    id: uuid.UUID
    sreality_id: str
    listing_type: str
    property_type: str
    title: str
    price_czk: int | None
    area_m2: int | None
    price_per_m2: int | None
    locality: str | None
    first_seen_at: datetime
    last_seen_at: datetime
    url: str


class ListingsPage(BaseModel):
    items: list[ListingItem]
    total: int
    page: int
    pages: int


def _compute_price_per_m2(price: int | None, area: int | None) -> int | None:
    if price is not None and area is not None and area > 0:
        return round(price / area)
    return None


@router.get("", response_model=ListingsPage)
async def get_listings(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    locality: str | None = Query(default=None, description="Substring match on locality"),
    property_type: str | None = Query(default=None),
    listing_type: str | None = Query(default=None),
    sort_by: SortField = Query(default="first_seen_at"),
    order: SortOrder = Query(default="desc"),
    session: AsyncSession = Depends(get_session),
) -> ListingsPage:
    base: Select[tuple[Listing]] = select(Listing).where(Listing.is_active.is_(True))

    if locality:
        base = base.where(Listing.locality.ilike(f"%{locality}%"))
    if property_type:
        if property_type not in ("flat", "house", "land", "commercial"):
            raise HTTPException(status_code=422, detail="Invalid property_type")
        base = base.where(Listing.property_type == property_type)
    if listing_type:
        if listing_type not in ("sale", "rent"):
            raise HTTPException(status_code=422, detail="Invalid listing_type")
        base = base.where(Listing.listing_type == listing_type)

    count_result = await session.execute(select(func.count()).select_from(base.subquery()))
    total: int = count_result.scalar_one()

    # Sorting — price_per_m2 is a computed column, sort in Python after fetch
    # for all other fields use DB-level ORDER BY
    if sort_by != "price_per_m2":
        col = getattr(Listing, sort_by)
        base = base.order_by(col.asc() if order == "asc" else col.desc())
    else:
        # fallback order for initial fetch; we re-sort after computing
        base = base.order_by(Listing.price_czk.desc())

    offset = (page - 1) * limit

    if sort_by != "price_per_m2":
        base = base.offset(offset).limit(limit)
        rows_result = await session.execute(base)
        rows = list(rows_result.scalars().all())
    else:
        # fetch all for sort, then slice — acceptable for typical dataset sizes
        rows_result = await session.execute(base)
        all_rows = list(rows_result.scalars().all())
        all_rows.sort(
            key=lambda r: (
                _compute_price_per_m2(r.price_czk, r.area_m2) or 0
            ),
            reverse=(order == "desc"),
        )
        rows = all_rows[offset : offset + limit]

    pages = max(1, (total + limit - 1) // limit)

    items = [
        ListingItem(
            id=r.id,
            sreality_id=r.sreality_id,
            listing_type=r.listing_type,
            property_type=r.property_type,
            title=r.title,
            price_czk=r.price_czk,
            area_m2=r.area_m2,
            price_per_m2=_compute_price_per_m2(r.price_czk, r.area_m2),
            locality=r.locality,
            first_seen_at=r.first_seen_at,
            last_seen_at=r.last_seen_at,
            url=r.url,
        )
        for r in rows
    ]

    return ListingsPage(items=items, total=total, page=page, pages=pages)

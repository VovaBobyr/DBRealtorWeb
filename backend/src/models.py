"""Read-only SQLAlchemy ORM models mirroring the scraper's schema.

The scraper project owns migrations. This file must NEVER be used to
generate or run Alembic migrations — it is strictly for reading data.
"""

import uuid
from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    Text,
    Uuid,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Listing(Base):
    """A real estate listing scraped from sreality.cz."""

    __tablename__ = "listings"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True)
    sreality_id: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    listing_type: Mapped[str] = mapped_column(
        Enum("sale", "rent", name="listing_type_enum"), nullable=False
    )
    property_type: Mapped[str] = mapped_column(
        Enum("flat", "house", "land", "commercial", name="property_type_enum"),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    price_czk: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    area_m2: Mapped[int | None] = mapped_column(Integer, nullable=True)
    floor: Mapped[int | None] = mapped_column(Integer, nullable=True)
    locality: Mapped[str | None] = mapped_column(Text, nullable=True)
    gps_lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    gps_lon: Mapped[float | None] = mapped_column(Float, nullable=True)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    images: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    raw_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    first_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False)

    price_history: Mapped[list["PriceHistory"]] = relationship(back_populates="listing")


class PriceHistory(Base):
    """A price snapshot for a listing, recorded on each change."""

    __tablename__ = "price_history"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True)
    listing_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("listings.id"), nullable=False
    )
    price_czk: Mapped[int] = mapped_column(BigInteger, nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    listing: Mapped["Listing"] = relationship(back_populates="price_history")


class ScrapeRun(Base):
    """Metadata for a single scrape run."""

    __tablename__ = "scrape_runs"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    listings_found: Mapped[int] = mapped_column(Integer, nullable=False)
    listings_new: Mapped[int] = mapped_column(Integer, nullable=False)
    listings_updated: Mapped[int] = mapped_column(Integer, nullable=False)
    errors: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    status: Mapped[str] = mapped_column(
        Enum("running", "success", "failed", name="scrape_run_status_enum"),
        nullable=False,
    )

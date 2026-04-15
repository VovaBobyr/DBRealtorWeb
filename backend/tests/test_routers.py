"""Integration tests for all API routers.

These tests hit a real PostgreSQL database. They assert on response shape
and HTTP status codes, not on specific row counts (which change with each
scrape run).
"""

import pytest
from httpx import AsyncClient


# ---------------------------------------------------------------------------
# /health
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_health(client: AsyncClient) -> None:
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_dashboard_summary_shape(client: AsyncClient) -> None:
    response = await client.get("/api/dashboard/summary")
    assert response.status_code == 200
    data = response.json()
    assert "total_listings" in data
    assert "new_today" in data
    assert "avg_price_czk" in data
    assert "last_scrape_run" in data
    assert isinstance(data["total_listings"], int)
    assert isinstance(data["new_today"], int)
    if data["avg_price_czk"] is not None:
        assert isinstance(data["avg_price_czk"], (int, float))
    if data["last_scrape_run"] is not None:
        run = data["last_scrape_run"]
        assert "status" in run
        assert "started_at" in run
        assert "listings_found" in run


# ---------------------------------------------------------------------------
# Trends
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_trends_price_returns_list(client: AsyncClient) -> None:
    response = await client.get("/api/trends/price?locality=Praha&property_type=flat&months=12")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    for point in data:
        assert "month" in point
        assert "avg_price_czk" in point
        assert "count" in point
        assert isinstance(point["count"], int)


@pytest.mark.asyncio
async def test_trends_price_months_validation(client: AsyncClient) -> None:
    response = await client.get("/api/trends/price?months=0")
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# /api/trends/new-per-day
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_new_per_day_returns_list(client: AsyncClient) -> None:
    response = await client.get(
        "/api/trends/new-per-day?locality=Praha&property_type=flat&months=12"
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    for point in data:
        assert "date" in point
        assert "count" in point
        assert isinstance(point["date"], str)
        assert isinstance(point["count"], int)
        assert point["count"] > 0


@pytest.mark.asyncio
async def test_new_per_day_months_validation(client: AsyncClient) -> None:
    response = await client.get("/api/trends/new-per-day?months=0")
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_new_per_day_months_upper_bound(client: AsyncClient) -> None:
    response = await client.get("/api/trends/new-per-day?months=61")
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_new_per_day_dates_ordered(client: AsyncClient) -> None:
    """Dates must be ascending — the chart expects chronological order."""
    response = await client.get(
        "/api/trends/new-per-day?locality=Praha&property_type=flat&months=12"
    )
    assert response.status_code == 200
    dates = [p["date"] for p in response.json()]
    assert dates == sorted(dates)


@pytest.mark.asyncio
async def test_trends_price_months_upper_bound(client: AsyncClient) -> None:
    response = await client.get("/api/trends/price?months=61")
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# Listings
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_listings_default_page(client: AsyncClient) -> None:
    response = await client.get("/api/listings")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert "page" in data
    assert "pages" in data
    assert data["page"] == 1
    assert isinstance(data["total"], int)
    assert isinstance(data["items"], list)


@pytest.mark.asyncio
async def test_listings_item_fields(client: AsyncClient) -> None:
    response = await client.get("/api/listings?limit=1")
    assert response.status_code == 200
    data = response.json()
    if data["items"]:
        item = data["items"][0]
        required = {
            "id", "sreality_id", "listing_type", "property_type",
            "title", "price_czk", "area_m2", "price_per_m2",
            "locality", "first_seen_at", "last_seen_at", "url",
        }
        assert required.issubset(item.keys())


@pytest.mark.asyncio
async def test_listings_locality_filter(client: AsyncClient) -> None:
    response = await client.get("/api/listings?locality=Praha")
    assert response.status_code == 200
    data = response.json()
    for item in data["items"]:
        if item["locality"] is not None:
            assert "Praha" in item["locality"] or "praha" in item["locality"].lower()


@pytest.mark.asyncio
async def test_listings_invalid_property_type(client: AsyncClient) -> None:
    response = await client.get("/api/listings?property_type=spaceship")
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_listings_pagination(client: AsyncClient) -> None:
    response = await client.get("/api/listings?page=1&limit=5")
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) <= 5


# ---------------------------------------------------------------------------
# Alerts
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_alerts_shape(client: AsyncClient) -> None:
    response = await client.get("/api/alerts")
    assert response.status_code == 200
    data = response.json()
    assert "new_listings" in data
    assert "price_drops" in data
    assert isinstance(data["new_listings"], list)
    assert isinstance(data["price_drops"], list)


@pytest.mark.asyncio
async def test_alerts_new_listing_fields(client: AsyncClient) -> None:
    response = await client.get("/api/alerts?hours=168")
    assert response.status_code == 200
    data = response.json()
    for item in data["new_listings"]:
        required = {
            "id", "sreality_id", "title", "locality",
            "property_type", "listing_type", "price_czk", "area_m2",
            "first_seen_at", "url",
        }
        assert required.issubset(item.keys())


@pytest.mark.asyncio
async def test_alerts_price_drop_fields(client: AsyncClient) -> None:
    response = await client.get("/api/alerts?hours=168&min_drop_pct=1")
    assert response.status_code == 200
    data = response.json()
    for drop in data["price_drops"]:
        required = {
            "sreality_id", "title", "locality", "url",
            "old_price_czk", "new_price_czk", "drop_pct",
        }
        assert required.issubset(drop.keys())
        assert drop["new_price_czk"] < drop["old_price_czk"]
        assert drop["drop_pct"] >= 1.0


@pytest.mark.asyncio
async def test_alerts_hours_validation(client: AsyncClient) -> None:
    response = await client.get("/api/alerts?hours=0")
    assert response.status_code == 422

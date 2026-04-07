"""Shared pytest fixtures for backend tests.

Tests run against a real PostgreSQL connection (DATABASE_URL must be set).
The DB is read-only from this project's perspective — no fixture data is
inserted; tests assert on shape/types rather than specific values.
"""

import os

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

# Ensure DATABASE_URL is present before importing app modules
if "DATABASE_URL" not in os.environ:
    pytest.exit(
        "DATABASE_URL environment variable is required for integration tests. "
        "Set it before running pytest.",
        returncode=1,
    )

from src.main import app  # noqa: E402 — must come after env check


@pytest_asyncio.fixture
async def client() -> AsyncClient:  # type: ignore[override]
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c

"""
Shared pytest fixtures for the Smart Proposal Generator API test suite.

Strategy
--------
- All handler-level tests use AsyncMock sessions injected via FastAPI's
  dependency-override mechanism, so no real PostgreSQL is required.
- The ASGI app is exercised through httpx.AsyncClient with ASGITransport.
- External services (DocuForge, Resend) are mocked at the httpx level.

Bootstrap note
--------------
`app.core.config.Settings` requires DATABASE_URL at import time (Pydantic
BaseSettings).  We inject a dummy DSN via the environment before any app
module is imported so the test suite works without a live database.
"""
from __future__ import annotations

import os

# Must be set before any app module is imported so pydantic-settings
# doesn't raise a ValidationError for the required `database_url` field.
os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+asyncpg://test_user:test_pass@localhost:5432/test_db",
)

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4
from datetime import datetime, timezone

from httpx import AsyncClient, ASGITransport

from app.main import app
from app.core.database import get_db


# ---------------------------------------------------------------------------
# Constants shared across test modules
# ---------------------------------------------------------------------------

TENANT_A = f"org_test_tenant_a_{uuid4().hex[:8]}"
TENANT_B = f"org_test_tenant_b_{uuid4().hex[:8]}"
USER_ID = f"user_{uuid4().hex[:8]}"


def tenant_headers(tenant_id: str, user_id: str | None = None) -> dict[str, str]:
    """Build standard request headers for a tenant."""
    h = {"X-Tenant-ID": tenant_id}
    if user_id:
        h["X-User-ID"] = user_id
    return h


# ---------------------------------------------------------------------------
# Mock DB session factory
# ---------------------------------------------------------------------------

def make_mock_db() -> AsyncMock:
    """Return a fully-wired AsyncMock that satisfies SQLAlchemy's AsyncSession API."""
    db = AsyncMock()
    db.add = MagicMock()          # synchronous in real SQLAlchemy
    db.flush = AsyncMock()
    db.refresh = AsyncMock()
    db.delete = AsyncMock()
    db.commit = AsyncMock()
    db.rollback = AsyncMock()
    db.execute = AsyncMock()
    db.close = AsyncMock()
    return db


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def mock_db() -> AsyncMock:
    """A fresh mock DB session for each test."""
    return make_mock_db()


@pytest.fixture
async def client_no_db(mock_db: AsyncMock):
    """
    ASGI test client with the DB dependency overridden by mock_db.
    Use this fixture for unit-style tests that don't need a real DB.
    """
    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c, mock_db
    app.dependency_overrides.pop(get_db, None)


@pytest.fixture
async def raw_client():
    """
    ASGI test client WITHOUT any dependency overrides.
    Use for tests that check header validation, routing, etc.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


# ---------------------------------------------------------------------------
# Reusable ORM-like fake objects
# ---------------------------------------------------------------------------

def make_fake_client(
    *,
    tenant_id: str = TENANT_A,
    client_id=None,
    name: str = "Acme Corp",
    company: str = "Acme",
    email: str = "contact@acme.com",
    industry: str = "SaaS",
    company_size: str = "50-100",
    score: int = 75,
) -> MagicMock:
    """Return a MagicMock that mimics a Client ORM object."""
    obj = MagicMock()
    obj.id = client_id or uuid4()
    obj.tenant_id = tenant_id
    obj.name = name
    obj.company = company
    obj.email = email
    obj.industry = industry
    obj.company_size = company_size
    obj.score = score
    obj.metadata_ = {}
    now = datetime.now(timezone.utc)
    obj.created_at = now
    obj.updated_at = now
    return obj


def make_fake_proposal(
    *,
    tenant_id: str = TENANT_A,
    proposal_id=None,
    client_id=None,
    created_by: str = USER_ID,
    title: str = "Test Proposal",
    status: str = "draft",
    template_id: str | None = "saas-latam",
    context: dict | None = None,
    sections: dict | None = None,
    tokens_used: int = 1500,
    model: str = "claude-sonnet-4-5",
) -> MagicMock:
    """Return a MagicMock that mimics a Proposal ORM object."""
    obj = MagicMock()
    obj.id = proposal_id or uuid4()
    obj.tenant_id = tenant_id
    obj.client_id = client_id or uuid4()
    obj.created_by = created_by
    obj.title = title
    obj.status = status
    obj.template_id = template_id
    obj.context = context or {"problem": "Needs automation"}
    obj.sections = sections or {
        "resumenEjecutivo": "Executive summary text",
        "problema": "The problem",
        "serviciosPropuestos": "Proposed services",
        "alcancePorServicio": "Scope per service",
        "timeline": "Q1 2026",
        "inversion": "$10,000",
        "casoDeExito": "Case study",
        "proximosPasos": "Next steps",
    }
    obj.tokens_used = tokens_used
    obj.model = model
    now = datetime.now(timezone.utc)
    obj.created_at = now
    obj.updated_at = now
    return obj

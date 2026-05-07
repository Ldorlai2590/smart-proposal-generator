"""
Unit tests for the proposals module.

Coverage
--------
- POST   /api/v1/proposals/              create proposal
- GET    /api/v1/proposals/              list proposals (tenant isolation)
- GET    /api/v1/proposals/{id}          get single proposal
- PATCH  /api/v1/proposals/{id}/status   update status
- PATCH  /api/v1/proposals/{id}/sections update sections

All DB calls are mocked — no real PostgreSQL required.
"""
from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

from tests.conftest import (
    TENANT_A,
    TENANT_B,
    USER_ID,
    tenant_headers,
    make_fake_proposal,
    make_fake_client,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _scalar_result(value):
    """Return a mock whose .scalar_one_or_none() returns `value`."""
    result = MagicMock()
    result.scalar_one_or_none.return_value = value
    return result


def _scalar_one_result(value):
    """Return a mock whose .scalar_one() returns `value`."""
    result = MagicMock()
    result.scalar_one.return_value = value
    return result


def _scalars_result(items: list):
    """Return a mock chain: .scalars().all() → items."""
    scalars_mock = MagicMock()
    scalars_mock.all.return_value = items
    result = MagicMock()
    result.scalars.return_value = scalars_mock
    return result


# ---------------------------------------------------------------------------
# 1. Create proposal — success
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_proposal_success(client_no_db):
    """POST /api/v1/proposals/ with valid data returns 201 + id/status."""
    http_client, mock_db = client_no_db

    fake_proposal = make_fake_proposal(tenant_id=TENANT_A, status="draft")
    client_uuid = fake_proposal.client_id

    # db.execute is called twice in handle_create_proposal? No — only
    # flush + refresh. The handler calls db.add, db.flush, db.refresh.
    # refresh is an AsyncMock; we patch it to inject the fake object's data.
    async def side_effect_refresh(obj):
        obj.id = fake_proposal.id
        obj.status = fake_proposal.status
        obj.created_at = fake_proposal.created_at

    mock_db.refresh.side_effect = side_effect_refresh

    payload = {
        "client_id": str(client_uuid),
        "title": "Test Proposal",
        "template_id": "saas-latam",
        "context": {"problem": "Needs automation"},
        "sections": {},
        "tokens_used": 0,
    }
    resp = await http_client.post(
        "/api/v1/proposals/",
        headers=tenant_headers(TENANT_A, USER_ID),
        json=payload,
    )

    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert "id" in data
    assert "status" in data
    assert data["status"] == "draft"


@pytest.mark.asyncio
async def test_create_proposal_with_sections_sets_generated_status(client_no_db):
    """When sections are provided at creation time, status must be 'generated'."""
    http_client, mock_db = client_no_db

    fake_proposal = make_fake_proposal(tenant_id=TENANT_A, status="generated")

    async def side_effect_refresh(obj):
        obj.id = fake_proposal.id
        obj.status = "generated"
        obj.created_at = fake_proposal.created_at

    mock_db.refresh.side_effect = side_effect_refresh

    payload = {
        "client_id": str(fake_proposal.client_id),
        "title": "AI Proposal",
        "sections": {
            "resumenEjecutivo": "Executive summary",
            "problema": "Problem statement",
        },
        "tokens_used": 1500,
        "model": "claude-sonnet-4-5",
    }

    # The router enqueues a background task that opens AsyncSessionLocal (real DB).
    # We patch the indexing coroutine so it is a no-op during unit tests.
    with patch("app.modules.proposals.router._index_proposal", new=AsyncMock(return_value=0)):
        resp = await http_client.post(
            "/api/v1/proposals/",
            headers=tenant_headers(TENANT_A, USER_ID),
            json=payload,
        )

    assert resp.status_code == 201, resp.text
    assert resp.json()["status"] == "generated"


# ---------------------------------------------------------------------------
# 2. Create proposal — missing tenant header
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_proposal_missing_tenant_returns_401_or_422(raw_client):
    """POST /api/v1/proposals/ without X-Tenant-ID must be rejected."""
    resp = await raw_client.post(
        "/api/v1/proposals/",
        json={"client_id": str(uuid4())},
    )
    assert resp.status_code in (401, 422), (
        f"Expected 401/422 for missing tenant, got {resp.status_code}"
    )


@pytest.mark.asyncio
async def test_create_proposal_short_tenant_returns_401(raw_client):
    """A tenant header shorter than 4 chars must be rejected."""
    resp = await raw_client.post(
        "/api/v1/proposals/",
        headers={"X-Tenant-ID": "ab"},
        json={"client_id": str(uuid4())},
    )
    assert resp.status_code == 401, (
        f"Expected 401 for short tenant, got {resp.status_code}"
    )


# ---------------------------------------------------------------------------
# 3. List proposals — tenant isolation
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_proposals_returns_only_own_tenant(client_no_db):
    """GET /api/v1/proposals/ must only return proposals for the requesting tenant."""
    http_client, mock_db = client_no_db

    proposal_a = make_fake_proposal(tenant_id=TENANT_A)

    # First execute → count (scalar_one), second execute → paginated list (scalars)
    count_result = _scalar_one_result(1)
    list_result = _scalars_result([proposal_a])
    mock_db.execute.side_effect = [count_result, list_result]

    resp = await http_client.get(
        "/api/v1/proposals/",
        headers=tenant_headers(TENANT_A),
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["total"] == 1
    assert len(body["data"]) == 1
    assert body["data"][0]["tenant_id"] == TENANT_A


@pytest.mark.asyncio
async def test_list_proposals_tenant_isolation(client_no_db):
    """Tenant B must receive an empty list even when Tenant A has proposals."""
    http_client, mock_db = client_no_db

    # Simulate DB returning 0 results for tenant B
    count_result = _scalar_one_result(0)
    list_result = _scalars_result([])
    mock_db.execute.side_effect = [count_result, list_result]

    resp = await http_client.get(
        "/api/v1/proposals/",
        headers=tenant_headers(TENANT_B),
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["total"] == 0
    assert body["data"] == []


@pytest.mark.asyncio
async def test_list_proposals_filter_by_status(client_no_db):
    """GET /api/v1/proposals/?status=generated must filter correctly."""
    http_client, mock_db = client_no_db

    generated = make_fake_proposal(tenant_id=TENANT_A, status="generated")
    count_result = _scalar_one_result(1)
    list_result = _scalars_result([generated])
    mock_db.execute.side_effect = [count_result, list_result]

    resp = await http_client.get(
        "/api/v1/proposals/",
        params={"status": "generated"},
        headers=tenant_headers(TENANT_A),
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()["data"]
    assert all(p["status"] == "generated" for p in data)


@pytest.mark.asyncio
async def test_list_proposals_filter_by_client_id(client_no_db):
    """GET /api/v1/proposals/?client_id=<uuid> must accept the param and return 200."""
    http_client, mock_db = client_no_db

    client_id = uuid4()
    proposal = make_fake_proposal(tenant_id=TENANT_A, client_id=client_id)
    count_result = _scalar_one_result(1)
    list_result = _scalars_result([proposal])
    mock_db.execute.side_effect = [count_result, list_result]

    resp = await http_client.get(
        "/api/v1/proposals/",
        params={"client_id": str(client_id)},
        headers=tenant_headers(TENANT_A),
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["total"] == 1


# ---------------------------------------------------------------------------
# 4. Get proposal by ID
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_proposal_by_id_returns_proposal(client_no_db):
    """GET /api/v1/proposals/{id} returns the correct proposal."""
    http_client, mock_db = client_no_db

    proposal = make_fake_proposal(tenant_id=TENANT_A)
    mock_db.execute.return_value = _scalar_result(proposal)

    resp = await http_client.get(
        f"/api/v1/proposals/{proposal.id}",
        headers=tenant_headers(TENANT_A),
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["id"] == str(proposal.id)
    assert body["tenant_id"] == TENANT_A
    assert body["title"] == proposal.title


@pytest.mark.asyncio
async def test_get_proposal_by_id_wrong_tenant_returns_404(client_no_db):
    """Tenant B requesting Tenant A's proposal must receive 404."""
    http_client, mock_db = client_no_db

    # DB returns None because the WHERE clause includes tenant_id = TENANT_B
    mock_db.execute.return_value = _scalar_result(None)

    proposal_id = uuid4()
    resp = await http_client.get(
        f"/api/v1/proposals/{proposal_id}",
        headers=tenant_headers(TENANT_B),
    )
    assert resp.status_code == 404, (
        f"Expected 404 for cross-tenant access, got {resp.status_code}"
    )


@pytest.mark.asyncio
async def test_get_proposal_by_id_not_found_returns_404(client_no_db):
    """Non-existent proposal ID returns 404."""
    http_client, mock_db = client_no_db

    mock_db.execute.return_value = _scalar_result(None)

    resp = await http_client.get(
        f"/api/v1/proposals/{uuid4()}",
        headers=tenant_headers(TENANT_A),
    )
    assert resp.status_code == 404, resp.text


# ---------------------------------------------------------------------------
# 5. Update proposal status
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_proposal_status_success(client_no_db):
    """PATCH /api/v1/proposals/{id}/status updates the status field."""
    http_client, mock_db = client_no_db

    proposal = make_fake_proposal(tenant_id=TENANT_A, status="draft")

    async def refresh_side_effect(obj):
        obj.status = "sent"

    mock_db.execute.return_value = _scalar_result(proposal)
    mock_db.refresh.side_effect = refresh_side_effect

    resp = await http_client.patch(
        f"/api/v1/proposals/{proposal.id}/status",
        params={"status": "sent"},
        headers=tenant_headers(TENANT_A),
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] == "sent"


@pytest.mark.asyncio
async def test_update_proposal_status_not_found_returns_404(client_no_db):
    """PATCH /api/v1/proposals/{id}/status returns 404 for unknown proposal."""
    http_client, mock_db = client_no_db

    mock_db.execute.return_value = _scalar_result(None)

    resp = await http_client.patch(
        f"/api/v1/proposals/{uuid4()}/status",
        params={"status": "sent"},
        headers=tenant_headers(TENANT_A),
    )
    assert resp.status_code == 404, resp.text


@pytest.mark.asyncio
async def test_update_proposal_status_wrong_tenant_returns_404(client_no_db):
    """PATCH /api/v1/proposals/{id}/status with wrong tenant returns 404."""
    http_client, mock_db = client_no_db

    # Handler scopes the SELECT to the requesting tenant; returns None for wrong tenant
    mock_db.execute.return_value = _scalar_result(None)

    proposal_id = uuid4()
    resp = await http_client.patch(
        f"/api/v1/proposals/{proposal_id}/status",
        params={"status": "accepted"},
        headers=tenant_headers(TENANT_B),
    )
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# 6. Update proposal sections (PATCH /proposals/{id}/sections)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_proposal_sections_success(client_no_db):
    """PATCH /api/v1/proposals/{id}/sections updates sections and sets status to generated."""
    http_client, mock_db = client_no_db

    proposal = make_fake_proposal(tenant_id=TENANT_A, status="draft", sections={})
    new_sections = {
        "resumenEjecutivo": "Updated executive summary",
        "problema": "Updated problem",
    }

    async def refresh_side_effect(obj):
        obj.sections = new_sections
        obj.status = "generated"
        obj.tokens_used = 2000
        obj.model = "claude-sonnet-4-5"

    mock_db.execute.return_value = _scalar_result(proposal)
    mock_db.refresh.side_effect = refresh_side_effect

    # The router enqueues a background task that opens AsyncSessionLocal (real DB).
    # Patch the indexing coroutine so it is a no-op during unit tests.
    with patch("app.modules.proposals.router._index_proposal", new=AsyncMock(return_value=0)):
        resp = await http_client.patch(
            f"/api/v1/proposals/{proposal.id}/sections",
            headers=tenant_headers(TENANT_A),
            json={
                "sections": new_sections,
                "tokens_used": 2000,
                "model": "claude-sonnet-4-5",
            },
        )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["status"] == "generated"
    assert body["sections"] == new_sections


@pytest.mark.asyncio
async def test_update_proposal_sections_not_found_returns_404(client_no_db):
    """PATCH /api/v1/proposals/{id}/sections returns 404 for unknown proposal."""
    http_client, mock_db = client_no_db

    mock_db.execute.return_value = _scalar_result(None)

    resp = await http_client.patch(
        f"/api/v1/proposals/{uuid4()}/sections",
        headers=tenant_headers(TENANT_A),
        json={"sections": {"resumenEjecutivo": "test"}},
    )
    assert resp.status_code == 404, resp.text


# ---------------------------------------------------------------------------
# 7. Handler unit tests (no HTTP layer)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_handle_create_proposal_sets_draft_when_no_sections():
    """handle_create_proposal sets status='draft' when sections dict is empty."""
    from app.modules.proposals.handlers import handle_create_proposal
    from app.modules.proposals.commands import CreateProposalCommand

    db = AsyncMock()
    db.add = MagicMock()
    db.flush = AsyncMock()

    created_obj: list = []

    async def capture_refresh(obj):
        # Simulate what the real DB would do after flush
        created_obj.append(obj)

    db.refresh.side_effect = capture_refresh

    cmd = CreateProposalCommand(
        tenant_id=TENANT_A,
        client_id=uuid4(),
        created_by=USER_ID,
        title="Draft Test",
        sections={},
    )

    result = await handle_create_proposal(cmd, db)
    assert result.status == "draft"
    db.add.assert_called_once()
    db.flush.assert_awaited_once()


@pytest.mark.asyncio
async def test_handle_create_proposal_sets_generated_when_sections_provided():
    """handle_create_proposal sets status='generated' when sections are present."""
    from app.modules.proposals.handlers import handle_create_proposal
    from app.modules.proposals.commands import CreateProposalCommand

    db = AsyncMock()
    db.add = MagicMock()
    db.flush = AsyncMock()
    db.refresh = AsyncMock()

    cmd = CreateProposalCommand(
        tenant_id=TENANT_A,
        client_id=uuid4(),
        created_by=USER_ID,
        title="AI Generated",
        sections={"resumenEjecutivo": "Summary text"},
        tokens_used=1000,
        model="claude-sonnet-4-5",
    )

    result = await handle_create_proposal(cmd, db)
    assert result.status == "generated"


@pytest.mark.asyncio
async def test_handle_get_proposal_raises_404_for_missing():
    """handle_get_proposal raises HTTPException 404 when proposal not found."""
    from fastapi import HTTPException
    from app.modules.proposals.handlers import handle_get_proposal
    from app.modules.proposals.queries import GetProposalQuery

    db = AsyncMock()
    result_mock = MagicMock()
    result_mock.scalar_one_or_none.return_value = None
    db.execute.return_value = result_mock

    with pytest.raises(HTTPException) as exc_info:
        await handle_get_proposal(
            GetProposalQuery(tenant_id=TENANT_A, proposal_id=uuid4()), db
        )
    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_handle_list_proposals_scopes_to_tenant():
    """handle_list_proposals passes tenant_id as a WHERE filter."""
    from app.modules.proposals.handlers import handle_list_proposals
    from app.modules.proposals.queries import ListProposalsQuery

    proposal = make_fake_proposal(tenant_id=TENANT_A)
    db = AsyncMock()

    count_result = MagicMock()
    count_result.scalar_one.return_value = 1

    scalars_mock = MagicMock()
    scalars_mock.all.return_value = [proposal]
    list_result = MagicMock()
    list_result.scalars.return_value = scalars_mock

    db.execute.side_effect = [count_result, list_result]

    proposals, total = await handle_list_proposals(
        ListProposalsQuery(tenant_id=TENANT_A, page=1, per_page=20), db
    )

    assert total == 1
    assert len(proposals) == 1
    assert proposals[0].tenant_id == TENANT_A

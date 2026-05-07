"""
Unit tests for the clients module.

Coverage
--------
- POST   /api/v1/clients/       create client
- GET    /api/v1/clients/       list clients (tenant isolation, search)
- GET    /api/v1/clients/{id}   get single client
- PATCH  /api/v1/clients/{id}   update client (partial)
- DELETE /api/v1/clients/{id}   delete client

All DB calls are mocked — no real PostgreSQL required.
"""
from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

from tests.conftest import (
    TENANT_A,
    TENANT_B,
    USER_ID,
    tenant_headers,
    make_fake_client,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _scalar_result(value):
    result = MagicMock()
    result.scalar_one_or_none.return_value = value
    return result


def _scalar_one_result(value):
    result = MagicMock()
    result.scalar_one.return_value = value
    return result


def _scalars_result(items: list):
    scalars_mock = MagicMock()
    scalars_mock.all.return_value = items
    result = MagicMock()
    result.scalars.return_value = scalars_mock
    return result


# ---------------------------------------------------------------------------
# 1. Create client — success
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_client_success(client_no_db):
    """POST /api/v1/clients/ with valid data returns 201 with client object."""
    http_client, mock_db = client_no_db

    fake_client = make_fake_client(tenant_id=TENANT_A)

    async def refresh_side_effect(obj):
        obj.id = fake_client.id
        obj.tenant_id = fake_client.tenant_id
        obj.name = fake_client.name
        obj.company = fake_client.company
        obj.email = fake_client.email
        obj.industry = fake_client.industry
        obj.company_size = fake_client.company_size
        obj.score = fake_client.score
        obj.created_at = fake_client.created_at
        obj.updated_at = fake_client.updated_at

    mock_db.refresh.side_effect = refresh_side_effect

    resp = await http_client.post(
        "/api/v1/clients/",
        headers=tenant_headers(TENANT_A),
        json={
            "name": "Acme Corp",
            "company": "Acme",
            "email": "contact@acme.com",
            "industry": "SaaS",
            "company_size": "50-100",
        },
    )

    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["name"] == "Acme Corp"
    assert body["tenant_id"] == TENANT_A
    assert "id" in body
    mock_db.add.assert_called_once()
    mock_db.flush.assert_awaited_once()


@pytest.mark.asyncio
async def test_create_client_minimal_fields(client_no_db):
    """POST /api/v1/clients/ with only required 'name' field returns 201."""
    http_client, mock_db = client_no_db

    fake_client = make_fake_client(tenant_id=TENANT_A, company=None, email=None)

    async def refresh_side_effect(obj):
        obj.id = fake_client.id
        obj.tenant_id = fake_client.tenant_id
        obj.name = fake_client.name
        obj.company = None
        obj.email = None
        obj.industry = None
        obj.company_size = None
        obj.score = 0
        obj.created_at = fake_client.created_at
        obj.updated_at = fake_client.updated_at

    mock_db.refresh.side_effect = refresh_side_effect

    resp = await http_client.post(
        "/api/v1/clients/",
        headers=tenant_headers(TENANT_A),
        json={"name": "Solo Founder"},
    )

    assert resp.status_code == 201, resp.text
    assert resp.json()["name"] == "Solo Founder"


# ---------------------------------------------------------------------------
# 2. Create client — missing tenant header
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_client_missing_tenant_header_returns_401_or_422(raw_client):
    """POST /api/v1/clients/ without X-Tenant-ID must be rejected."""
    resp = await raw_client.post(
        "/api/v1/clients/",
        json={"name": "Ghost Client"},
    )
    assert resp.status_code in (401, 422), (
        f"Expected 401/422 for missing tenant, got {resp.status_code}"
    )


@pytest.mark.asyncio
async def test_create_client_short_tenant_header_returns_401(raw_client):
    """POST /api/v1/clients/ with a 2-char tenant ID must return 401."""
    resp = await raw_client.post(
        "/api/v1/clients/",
        headers={"X-Tenant-ID": "ab"},
        json={"name": "Ghost Client"},
    )
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# 3. List clients — tenant isolation
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_clients_filtered_by_tenant(client_no_db):
    """GET /api/v1/clients/ returns only the requesting tenant's clients."""
    http_client, mock_db = client_no_db

    client_a = make_fake_client(tenant_id=TENANT_A, name="Tenant A Client")
    count_result = _scalar_one_result(1)
    list_result = _scalars_result([client_a])
    mock_db.execute.side_effect = [count_result, list_result]

    resp = await http_client.get(
        "/api/v1/clients/",
        headers=tenant_headers(TENANT_A),
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["total"] == 1
    assert body["data"][0]["tenant_id"] == TENANT_A
    assert body["data"][0]["name"] == "Tenant A Client"


@pytest.mark.asyncio
async def test_list_clients_tenant_b_sees_empty_list(client_no_db):
    """Tenant B receives an empty list even when Tenant A has clients."""
    http_client, mock_db = client_no_db

    count_result = _scalar_one_result(0)
    list_result = _scalars_result([])
    mock_db.execute.side_effect = [count_result, list_result]

    resp = await http_client.get(
        "/api/v1/clients/",
        headers=tenant_headers(TENANT_B),
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["total"] == 0
    assert resp.json()["data"] == []


@pytest.mark.asyncio
async def test_list_clients_search_param_accepted(client_no_db):
    """GET /api/v1/clients/?search=acme returns 200 with matching results."""
    http_client, mock_db = client_no_db

    matched = make_fake_client(tenant_id=TENANT_A, name="Acme Corp", company="Acme")
    count_result = _scalar_one_result(1)
    list_result = _scalars_result([matched])
    mock_db.execute.side_effect = [count_result, list_result]

    resp = await http_client.get(
        "/api/v1/clients/",
        params={"search": "acme"},
        headers=tenant_headers(TENANT_A),
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()["data"]
    assert len(data) == 1
    assert "Acme" in data[0]["company"]


@pytest.mark.asyncio
async def test_list_clients_pagination_params(client_no_db):
    """GET /api/v1/clients/?page=2&per_page=5 returns correct metadata."""
    http_client, mock_db = client_no_db

    count_result = _scalar_one_result(12)
    list_result = _scalars_result([])  # page 2 is empty in our mock
    mock_db.execute.side_effect = [count_result, list_result]

    resp = await http_client.get(
        "/api/v1/clients/",
        params={"page": 2, "per_page": 5},
        headers=tenant_headers(TENANT_A),
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["page"] == 2
    assert body["per_page"] == 5
    assert body["total"] == 12
    # pages = ceil(12/5) = 3
    assert body["pages"] == 3


# ---------------------------------------------------------------------------
# 4. Get client by ID
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_client_detail(client_no_db):
    """GET /api/v1/clients/{id} returns the correct client."""
    http_client, mock_db = client_no_db

    fake_client = make_fake_client(tenant_id=TENANT_A)
    mock_db.execute.return_value = _scalar_result(fake_client)

    resp = await http_client.get(
        f"/api/v1/clients/{fake_client.id}",
        headers=tenant_headers(TENANT_A),
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["id"] == str(fake_client.id)
    assert body["name"] == fake_client.name
    assert body["tenant_id"] == TENANT_A


@pytest.mark.asyncio
async def test_get_client_detail_wrong_tenant_returns_404(client_no_db):
    """Tenant B requesting Tenant A's client must receive 404."""
    http_client, mock_db = client_no_db

    # The WHERE clause includes tenant_id = TENANT_B so DB returns None
    mock_db.execute.return_value = _scalar_result(None)

    resp = await http_client.get(
        f"/api/v1/clients/{uuid4()}",
        headers=tenant_headers(TENANT_B),
    )
    assert resp.status_code == 404, (
        f"CROSS-TENANT LEAK: expected 404, got {resp.status_code}"
    )


@pytest.mark.asyncio
async def test_get_client_not_found_returns_404(client_no_db):
    """GET /api/v1/clients/{id} for a non-existent ID returns 404."""
    http_client, mock_db = client_no_db

    mock_db.execute.return_value = _scalar_result(None)

    resp = await http_client.get(
        f"/api/v1/clients/{uuid4()}",
        headers=tenant_headers(TENANT_A),
    )
    assert resp.status_code == 404, resp.text


# ---------------------------------------------------------------------------
# 5. Update client (partial)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_client_success(client_no_db):
    """PATCH /api/v1/clients/{id} with partial data updates only provided fields."""
    http_client, mock_db = client_no_db

    fake_client = make_fake_client(tenant_id=TENANT_A, industry="FinTech")

    async def refresh_side_effect(obj):
        obj.industry = "EdTech"
        obj.company = "New Company Name"

    mock_db.execute.return_value = _scalar_result(fake_client)
    mock_db.refresh.side_effect = refresh_side_effect

    resp = await http_client.patch(
        f"/api/v1/clients/{fake_client.id}",
        headers=tenant_headers(TENANT_A),
        json={"industry": "EdTech", "company": "New Company Name"},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["industry"] == "EdTech"
    assert body["company"] == "New Company Name"


@pytest.mark.asyncio
async def test_update_client_not_found_returns_404(client_no_db):
    """PATCH /api/v1/clients/{id} returns 404 for unknown client."""
    http_client, mock_db = client_no_db

    mock_db.execute.return_value = _scalar_result(None)

    resp = await http_client.patch(
        f"/api/v1/clients/{uuid4()}",
        headers=tenant_headers(TENANT_A),
        json={"industry": "EdTech"},
    )
    assert resp.status_code == 404, resp.text


@pytest.mark.asyncio
async def test_update_client_wrong_tenant_returns_404(client_no_db):
    """PATCH /api/v1/clients/{id} with wrong tenant must return 404, not 200."""
    http_client, mock_db = client_no_db

    mock_db.execute.return_value = _scalar_result(None)

    resp = await http_client.patch(
        f"/api/v1/clients/{uuid4()}",
        headers=tenant_headers(TENANT_B),
        json={"name": "Hijacked Name"},
    )
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# 6. Delete client
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_delete_client_success(client_no_db):
    """DELETE /api/v1/clients/{id} returns 204 and calls db.delete."""
    http_client, mock_db = client_no_db

    fake_client = make_fake_client(tenant_id=TENANT_A)
    mock_db.execute.return_value = _scalar_result(fake_client)

    resp = await http_client.delete(
        f"/api/v1/clients/{fake_client.id}",
        headers=tenant_headers(TENANT_A),
    )
    assert resp.status_code == 204, resp.text
    mock_db.delete.assert_awaited_once_with(fake_client)
    mock_db.flush.assert_awaited()


@pytest.mark.asyncio
async def test_delete_client_not_found_returns_404(client_no_db):
    """DELETE /api/v1/clients/{id} for unknown client returns 404."""
    http_client, mock_db = client_no_db

    mock_db.execute.return_value = _scalar_result(None)

    resp = await http_client.delete(
        f"/api/v1/clients/{uuid4()}",
        headers=tenant_headers(TENANT_A),
    )
    assert resp.status_code == 404, resp.text
    mock_db.delete.assert_not_awaited()


@pytest.mark.asyncio
async def test_delete_client_wrong_tenant_returns_404(client_no_db):
    """DELETE /api/v1/clients/{id} with wrong tenant must return 404."""
    http_client, mock_db = client_no_db

    # The handler scopes the SELECT to TENANT_B which doesn't own this client
    mock_db.execute.return_value = _scalar_result(None)

    resp = await http_client.delete(
        f"/api/v1/clients/{uuid4()}",
        headers=tenant_headers(TENANT_B),
    )
    assert resp.status_code == 404, (
        f"CROSS-TENANT DELETE: expected 404, got {resp.status_code}"
    )
    mock_db.delete.assert_not_awaited()


# ---------------------------------------------------------------------------
# 7. Handler unit tests (no HTTP layer)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_handle_create_client_assigns_tenant_id():
    """handle_create_client stores the provided tenant_id on the new object."""
    from app.modules.clients.handlers import handle_create_client
    from app.modules.clients.commands import CreateClientCommand

    db = AsyncMock()
    db.add = MagicMock()
    db.flush = AsyncMock()
    db.refresh = AsyncMock()

    cmd = CreateClientCommand(
        tenant_id=TENANT_A,
        name="Handler Test Client",
        company="Handler Corp",
        email="handler@test.com",
        industry="SaaS",
        company_size="10-50",
    )

    result = await handle_create_client(cmd, db)

    assert result.tenant_id == TENANT_A
    assert result.name == "Handler Test Client"
    db.add.assert_called_once()
    db.flush.assert_awaited_once()


@pytest.mark.asyncio
async def test_handle_get_client_raises_404_when_not_found():
    """handle_get_client raises HTTPException 404 for missing client."""
    from fastapi import HTTPException
    from app.modules.clients.handlers import handle_get_client
    from app.modules.clients.queries import GetClientQuery

    db = AsyncMock()
    result_mock = MagicMock()
    result_mock.scalar_one_or_none.return_value = None
    db.execute.return_value = result_mock

    with pytest.raises(HTTPException) as exc_info:
        await handle_get_client(
            GetClientQuery(tenant_id=TENANT_A, client_id=uuid4()), db
        )
    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_handle_update_client_only_updates_provided_fields():
    """handle_update_client applies only the non-None fields in the command."""
    from app.modules.clients.handlers import handle_update_client
    from app.modules.clients.commands import UpdateClientCommand

    db = AsyncMock()
    db.flush = AsyncMock()
    db.refresh = AsyncMock()

    original_client = make_fake_client(
        tenant_id=TENANT_A,
        name="Original Name",
        industry="FinTech",
        company="Original Co",
    )

    result_mock = MagicMock()
    result_mock.scalar_one_or_none.return_value = original_client
    db.execute.return_value = result_mock

    cmd = UpdateClientCommand(
        tenant_id=TENANT_A,
        client_id=original_client.id,
        industry="EdTech",  # only update industry
        # name and company not provided → should remain unchanged
    )

    await handle_update_client(cmd, db)

    # industry should be updated
    assert original_client.industry == "EdTech"
    # name should remain unchanged (cmd.name is None)
    assert original_client.name == "Original Name"


@pytest.mark.asyncio
async def test_handle_delete_client_calls_db_delete():
    """handle_delete_client calls db.delete and db.flush."""
    from app.modules.clients.handlers import handle_delete_client
    from app.modules.clients.commands import DeleteClientCommand

    db = AsyncMock()
    db.delete = AsyncMock()
    db.flush = AsyncMock()

    fake_client = make_fake_client(tenant_id=TENANT_A)

    result_mock = MagicMock()
    result_mock.scalar_one_or_none.return_value = fake_client
    db.execute.return_value = result_mock

    cmd = DeleteClientCommand(tenant_id=TENANT_A, client_id=fake_client.id)
    await handle_delete_client(cmd, db)

    db.delete.assert_awaited_once_with(fake_client)
    db.flush.assert_awaited_once()


@pytest.mark.asyncio
async def test_handle_list_clients_scopes_to_tenant():
    """handle_list_clients executes count + paginated select for the tenant."""
    from app.modules.clients.handlers import handle_list_clients
    from app.modules.clients.queries import ListClientsQuery

    client_a = make_fake_client(tenant_id=TENANT_A)
    db = AsyncMock()

    count_result = MagicMock()
    count_result.scalar_one.return_value = 1

    scalars_mock = MagicMock()
    scalars_mock.all.return_value = [client_a]
    list_result = MagicMock()
    list_result.scalars.return_value = scalars_mock

    db.execute.side_effect = [count_result, list_result]

    clients, total = await handle_list_clients(
        ListClientsQuery(tenant_id=TENANT_A, page=1, per_page=20), db
    )

    assert total == 1
    assert len(clients) == 1
    assert clients[0].tenant_id == TENANT_A


# ---------------------------------------------------------------------------
# 8. Client score — default value
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_client_default_score_is_zero(client_no_db):
    """Clients created without a score default to 0."""
    http_client, mock_db = client_no_db

    fake_client = make_fake_client(tenant_id=TENANT_A, score=0)

    async def refresh_side_effect(obj):
        obj.id = fake_client.id
        obj.tenant_id = fake_client.tenant_id
        obj.name = fake_client.name
        obj.company = fake_client.company
        obj.email = fake_client.email
        obj.industry = fake_client.industry
        obj.company_size = fake_client.company_size
        obj.score = 0
        obj.created_at = fake_client.created_at
        obj.updated_at = fake_client.updated_at

    mock_db.refresh.side_effect = refresh_side_effect

    resp = await http_client.post(
        "/api/v1/clients/",
        headers=tenant_headers(TENANT_A),
        json={"name": "New Client Without Score"},
    )
    assert resp.status_code == 201, resp.text
    assert resp.json()["score"] == 0

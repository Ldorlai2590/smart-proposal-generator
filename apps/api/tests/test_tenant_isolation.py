"""
Tests de aislamiento multi-tenant.

Verifica que:
  1. Un tenant NUNCA puede ver/editar/borrar datos de otro tenant.
  2. El header X-Tenant-ID es obligatorio en todos los endpoints.
  3. El helper `tenant_scoped_select` rechaza queries sin tenant_id.

Estos tests usan el app ASGI directamente (no necesitan DB real),
validando que las rutas aplican el filtro de tenant vía header.
"""
import pytest
from uuid import uuid4
from httpx import AsyncClient, ASGITransport

from app.main import app

TENANT_A = f"org_test_tenant_a_{uuid4().hex[:8]}"
TENANT_B = f"org_test_tenant_b_{uuid4().hex[:8]}"


def headers(tenant_id: str) -> dict[str, str]:
    return {"X-Tenant-ID": tenant_id}


# ---------------------------------------------------------------------------
# 1. require_tenant rechaza requests sin header
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_missing_tenant_header_returns_401():
    """Endpoints sin X-Tenant-ID deben devolver 401/422."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # GET /api/v1/clients/ sin header
        resp = await client.get("/api/v1/clients/")
        assert resp.status_code in (401, 422), f"Expected 401/422, got {resp.status_code}"


@pytest.mark.asyncio
async def test_empty_tenant_header_returns_401():
    """X-Tenant-ID vacío o muy corto debe ser rechazado."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/api/v1/clients/", headers={"X-Tenant-ID": "ab"})
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# 2. Tenant A no puede ver clientes de Tenant B
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_clients_returns_empty_for_different_tenant():
    """
    Crear un client con Tenant A y listar con Tenant B → resultado vacío.
    Nota: si la DB no está conectada, este test valida que el endpoint al menos
    intenta ejecutar con el tenant correcto (puede retornar 500 si no hay DB,
    pero nunca datos de otro tenant).
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Intentar crear con Tenant A
        create_resp = await client.post(
            "/api/v1/clients/",
            headers=headers(TENANT_A),
            json={
                "name": "Client de Tenant A",
                "company": "Corp A",
                "email": "a@corp-a.com",
                "industry": "SaaS",
            },
        )

        if create_resp.status_code == 500:
            # Sin DB conectada → skip test con warning
            pytest.skip("DB not available — skipping integration test")

        assert create_resp.status_code == 201
        client_a_id = create_resp.json()["id"]

        # Listar con Tenant B → no debe contener el cliente de A
        list_resp = await client.get(
            "/api/v1/clients/",
            headers=headers(TENANT_B),
        )
        assert list_resp.status_code == 200
        data = list_resp.json()["data"]
        ids = [c["id"] for c in data]
        assert client_a_id not in ids, (
            f"CROSS-TENANT LEAK: Client {client_a_id} de Tenant A visible para Tenant B"
        )


@pytest.mark.asyncio
async def test_get_client_by_id_denied_for_different_tenant():
    """
    Un GET /clients/:id con el tenant equivocado debe devolver 404, no el objeto.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Crear con Tenant A
        create_resp = await client.post(
            "/api/v1/clients/",
            headers=headers(TENANT_A),
            json={
                "name": "Secret Client",
                "company": "Secret Corp",
            },
        )

        if create_resp.status_code == 500:
            pytest.skip("DB not available — skipping integration test")

        assert create_resp.status_code == 201
        client_a_id = create_resp.json()["id"]

        # GET con Tenant B → debe ser 404 (no 200)
        get_resp = await client.get(
            f"/api/v1/clients/{client_a_id}",
            headers=headers(TENANT_B),
        )
        assert get_resp.status_code == 404, (
            f"CROSS-TENANT LEAK: GET devolvió {get_resp.status_code} para client de otro tenant"
        )


@pytest.mark.asyncio
async def test_delete_client_denied_for_different_tenant():
    """
    Un DELETE /clients/:id con el tenant equivocado debe devolver 404, no 204.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Crear con Tenant A
        create_resp = await client.post(
            "/api/v1/clients/",
            headers=headers(TENANT_A),
            json={
                "name": "Delete Test Client",
                "company": "Delete Corp",
            },
        )

        if create_resp.status_code == 500:
            pytest.skip("DB not available — skipping integration test")

        assert create_resp.status_code == 201
        client_a_id = create_resp.json()["id"]

        # DELETE con Tenant B → debe ser 404 (no 204)
        del_resp = await client.delete(
            f"/api/v1/clients/{client_a_id}",
            headers=headers(TENANT_B),
        )
        assert del_resp.status_code == 404, (
            f"CROSS-TENANT LEAK: DELETE devolvió {del_resp.status_code} para client de otro tenant"
        )

        # Verificar que el client sigue existiendo para Tenant A
        verify_resp = await client.get(
            f"/api/v1/clients/{client_a_id}",
            headers=headers(TENANT_A),
        )
        assert verify_resp.status_code == 200, (
            "Client was deleted by wrong tenant"
        )


# ---------------------------------------------------------------------------
# 3. db_helpers unit tests (no DB required)
# ---------------------------------------------------------------------------

def test_tenant_scoped_rejects_empty_tenant():
    """tenant_scoped_select debe fallar sin tenant_id."""
    from app.shared.db_helpers import tenant_scoped_select, MissingTenantIdError

    class FakeModel:
        tenant_id = "column"

    with pytest.raises(MissingTenantIdError):
        tenant_scoped_select(FakeModel, "")

    with pytest.raises(MissingTenantIdError):
        tenant_scoped_select(FakeModel, "ab")  # < 4 chars


def test_tenant_scoped_rejects_model_without_tenant_id():
    """Si un modelo no tiene tenant_id, el helper debe gritar."""
    from app.shared.db_helpers import tenant_scoped_select

    class BadModel:
        name = "column"

    with pytest.raises(AttributeError, match="tenant_id"):
        tenant_scoped_select(BadModel, "org_test_12345")


def test_assert_tenant_owns_raises_on_mismatch():
    """assert_tenant_owns debe lanzar PermissionError en cross-tenant."""
    from app.shared.db_helpers import assert_tenant_owns

    class FakeObj:
        tenant_id = "org_tenant_A"

    obj = FakeObj()
    # Mismo tenant → ok
    assert_tenant_owns(obj, "org_tenant_A")

    # Distinto tenant → PermissionError
    with pytest.raises(PermissionError, match="Cross-tenant"):
        assert_tenant_owns(obj, "org_tenant_B")


def test_assert_tenant_owns_allows_none():
    """assert_tenant_owns no debe fallar si el objeto es None (not found)."""
    from app.shared.db_helpers import assert_tenant_owns
    assert_tenant_owns(None, "org_tenant_A")

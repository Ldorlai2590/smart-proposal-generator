from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.shared.tenant import require_tenant
from app.modules.clients.commands import CreateClientCommand, UpdateClientCommand, DeleteClientCommand
from app.modules.clients.queries import GetClientQuery, ListClientsQuery
from app.modules.clients.handlers import (
    handle_create_client,
    handle_get_client,
    handle_list_clients,
    handle_update_client,
    handle_delete_client,
)
from app.modules.clients.schemas import ClientCreate, ClientUpdate, ClientOut, ClientListResponse

router = APIRouter(prefix="/clients", tags=["clients"])


@router.get("/", response_model=ClientListResponse)
async def list_clients(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),
    tenant_id: str = Depends(require_tenant),
    db: AsyncSession = Depends(get_db),
):
    """
    List clients for the current tenant.
    Supports optional text search across name, company, and email.
    All results are scoped to the authenticated tenant.
    """
    query = ListClientsQuery(tenant_id=tenant_id, page=page, per_page=per_page, search=search)
    clients, total = await handle_list_clients(query, db)
    pages = -(-total // per_page)  # ceiling division
    return ClientListResponse(
        data=[ClientOut.model_validate(c) for c in clients],
        total=total,
        page=page,
        per_page=per_page,
        pages=pages,
    )


@router.post("/", response_model=ClientOut, status_code=201)
async def create_client(
    body: ClientCreate,
    tenant_id: str = Depends(require_tenant),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new client for the current tenant.
    """
    cmd = CreateClientCommand(tenant_id=tenant_id, **body.model_dump())
    client = await handle_create_client(cmd, db)
    return ClientOut.model_validate(client)


@router.get("/{client_id}", response_model=ClientOut)
async def get_client(
    client_id: UUID,
    tenant_id: str = Depends(require_tenant),
    db: AsyncSession = Depends(get_db),
):
    """
    Get a single client by ID. Always filtered by tenant_id to prevent data leaks.
    """
    query = GetClientQuery(tenant_id=tenant_id, client_id=client_id)
    client = await handle_get_client(query, db)
    return ClientOut.model_validate(client)


@router.patch("/{client_id}", response_model=ClientOut)
async def update_client(
    client_id: UUID,
    body: ClientUpdate,
    tenant_id: str = Depends(require_tenant),
    db: AsyncSession = Depends(get_db),
):
    """
    Partially update a client. Only provided fields are updated.
    Always filtered by tenant_id to prevent cross-tenant writes.
    """
    cmd = UpdateClientCommand(
        tenant_id=tenant_id,
        client_id=client_id,
        **body.model_dump(exclude_none=True),
    )
    client = await handle_update_client(cmd, db)
    return ClientOut.model_validate(client)


@router.delete("/{client_id}", status_code=204)
async def delete_client(
    client_id: UUID,
    tenant_id: str = Depends(require_tenant),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a client. Always filtered by tenant_id to prevent cross-tenant deletes.
    """
    cmd = DeleteClientCommand(tenant_id=tenant_id, client_id=client_id)
    await handle_delete_client(cmd, db)

from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.core.database import get_db
from app.shared.tenant import require_tenant
from app.modules.clients.commands import CreateClientCommand, UpdateClientCommand
from app.modules.clients.queries import GetClientQuery, ListClientsQuery
from app.modules.clients.handlers import (
    handle_create_client,
    handle_get_client,
    handle_list_clients,
)

router = APIRouter(prefix="/clients", tags=["clients"])


class ClientResponse(BaseModel):
    id: UUID
    tenant_id: str
    name: str
    company: str | None
    email: str | None
    industry: str | None
    company_size: str | None
    score: int

    model_config = {"from_attributes": True}


class CreateClientRequest(BaseModel):
    name: str
    company: str | None = None
    email: str | None = None
    industry: str | None = None
    company_size: str | None = None


@router.post("/", response_model=ClientResponse, status_code=201)
async def create_client(
    body: CreateClientRequest,
    tenant_id: str = Depends(require_tenant),
    db: AsyncSession = Depends(get_db),
):
    cmd = CreateClientCommand(tenant_id=tenant_id, **body.model_dump())
    client = await handle_create_client(cmd, db)
    return client


@router.get("/", response_model=dict)
async def list_clients(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),
    tenant_id: str = Depends(require_tenant),
    db: AsyncSession = Depends(get_db),
):
    query = ListClientsQuery(tenant_id=tenant_id, page=page, per_page=per_page, search=search)
    clients, total = await handle_list_clients(query, db)
    return {
        "items": [ClientResponse.model_validate(c) for c in clients],
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": -(-total // per_page),
    }


@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(
    client_id: UUID,
    tenant_id: str = Depends(require_tenant),
    db: AsyncSession = Depends(get_db),
):
    query = GetClientQuery(tenant_id=tenant_id, client_id=client_id)
    return await handle_get_client(query, db)

from uuid import uuid4
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_

from app.modules.clients.models import Client
from app.modules.clients.commands import CreateClientCommand, UpdateClientCommand, DeleteClientCommand
from app.modules.clients.queries import GetClientQuery, ListClientsQuery
from fastapi import HTTPException


async def handle_create_client(cmd: CreateClientCommand, db: AsyncSession) -> Client:
    client = Client(
        id=uuid4(),
        tenant_id=cmd.tenant_id,
        name=cmd.name,
        company=cmd.company,
        email=cmd.email,
        industry=cmd.industry,
        company_size=cmd.company_size,
    )
    db.add(client)
    await db.flush()
    return client


async def handle_get_client(query: GetClientQuery, db: AsyncSession) -> Client:
    result = await db.execute(
        select(Client).where(
            Client.tenant_id == query.tenant_id,
            Client.id == query.client_id,
        )
    )
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return client


async def handle_list_clients(query: ListClientsQuery, db: AsyncSession) -> tuple[list[Client], int]:
    base_query = select(Client).where(Client.tenant_id == query.tenant_id)

    if query.search:
        base_query = base_query.where(
            or_(
                Client.name.ilike(f"%{query.search}%"),
                Client.company.ilike(f"%{query.search}%"),
            )
        )

    count_result = await db.execute(select(func.count()).select_from(base_query.subquery()))
    total = count_result.scalar_one()

    offset = (query.page - 1) * query.per_page
    result = await db.execute(base_query.offset(offset).limit(query.per_page))
    clients = list(result.scalars().all())

    return clients, total

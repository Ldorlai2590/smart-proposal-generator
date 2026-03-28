from uuid import UUID
from pydantic import BaseModel


class GetClientQuery(BaseModel):
    tenant_id: str
    client_id: UUID


class ListClientsQuery(BaseModel):
    tenant_id: str
    page: int = 1
    per_page: int = 20
    search: str | None = None

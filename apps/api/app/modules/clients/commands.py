from uuid import UUID
from pydantic import BaseModel


class CreateClientCommand(BaseModel):
    tenant_id: str
    name: str
    company: str | None = None
    email: str | None = None
    industry: str | None = None
    company_size: str | None = None
    score: int = 0


class UpdateClientCommand(BaseModel):
    tenant_id: str
    client_id: UUID
    name: str | None = None
    company: str | None = None
    email: str | None = None
    industry: str | None = None
    company_size: str | None = None


class DeleteClientCommand(BaseModel):
    tenant_id: str
    client_id: UUID

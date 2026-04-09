from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, EmailStr


class ClientCreate(BaseModel):
    name: str
    company: str | None = None
    email: str | None = None
    industry: str | None = None
    company_size: str | None = None


class ClientUpdate(BaseModel):
    name: str | None = None
    company: str | None = None
    email: str | None = None
    industry: str | None = None
    company_size: str | None = None


class ClientOut(BaseModel):
    id: UUID
    tenant_id: str
    name: str
    company: str | None
    email: str | None
    industry: str | None
    company_size: str | None
    score: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ClientListResponse(BaseModel):
    data: list[ClientOut]
    total: int
    page: int
    per_page: int
    pages: int

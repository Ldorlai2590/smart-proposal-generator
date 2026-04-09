from uuid import UUID
from datetime import datetime
from pydantic import BaseModel


class ProposalCreate(BaseModel):
    client_id: UUID
    title: str | None = None
    template_id: str | None = None
    context: dict = {}
    sections: dict = {}
    tokens_used: int = 0
    model: str | None = None


class ProposalUpdate(BaseModel):
    title: str | None = None
    sections: dict | None = None
    tokens_used: int | None = None
    model: str | None = None
    status: str | None = None


class ProposalOut(BaseModel):
    id: UUID
    tenant_id: str
    client_id: UUID
    created_by: str
    title: str | None
    status: str
    template_id: str | None
    context: dict
    sections: dict
    tokens_used: int
    model: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProposalSaveResponse(BaseModel):
    id: str
    status: str
    created_at: str


class ProposalListResponse(BaseModel):
    data: list[ProposalOut]
    total: int
    page: int
    per_page: int
    pages: int

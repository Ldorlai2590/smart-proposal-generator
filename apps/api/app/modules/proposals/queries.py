from uuid import UUID
from pydantic import BaseModel


class GetProposalQuery(BaseModel):
    tenant_id: str
    proposal_id: UUID


class ListProposalsQuery(BaseModel):
    tenant_id: str
    client_id: UUID | None = None
    status: str | None = None
    page: int = 1
    per_page: int = 20

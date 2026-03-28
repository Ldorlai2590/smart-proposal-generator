from uuid import UUID
from pydantic import BaseModel


class CreateProposalCommand(BaseModel):
    tenant_id: str
    client_id: UUID
    created_by: str
    title: str | None = None
    template_id: str | None = None
    context: dict = {}


class UpdateProposalSectionsCommand(BaseModel):
    tenant_id: str
    proposal_id: UUID
    sections: dict
    tokens_used: int = 0
    model: str | None = None


class UpdateProposalStatusCommand(BaseModel):
    tenant_id: str
    proposal_id: UUID
    status: str


class DeleteProposalCommand(BaseModel):
    tenant_id: str
    proposal_id: UUID

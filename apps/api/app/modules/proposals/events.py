from uuid import UUID
from pydantic import BaseModel
from datetime import datetime


class ProposalGeneratedEvent(BaseModel):
    proposal_id: UUID
    tenant_id: str
    client_id: UUID
    created_by: str
    timestamp: datetime


class ProposalExportedEvent(BaseModel):
    proposal_id: UUID
    tenant_id: str
    format: str
    file_url: str
    timestamp: datetime

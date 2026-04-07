from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from datetime import datetime

from app.core.database import get_db
from app.shared.tenant import require_tenant
from app.modules.proposals.commands import CreateProposalCommand, UpdateProposalSectionsCommand
from app.modules.proposals.queries import GetProposalQuery, ListProposalsQuery
from app.modules.proposals.handlers import (
    handle_create_proposal,
    handle_get_proposal,
    handle_update_sections,
    handle_list_proposals,
)
from app.modules.proposals.commands import UpdateProposalSectionsCommand

router = APIRouter(prefix="/proposals", tags=["proposals"])


class ProposalResponse(BaseModel):
    id: UUID
    tenant_id: str
    client_id: UUID
    title: str | None
    status: str
    sections: dict
    tokens_used: int
    created_at: datetime

    model_config = {"from_attributes": True}


class CreateProposalRequest(BaseModel):
    client_id: UUID
    title: str | None = None
    template_id: str | None = None
    context: dict = {}


class UpdateSectionsRequest(BaseModel):
    sections: dict
    tokens_used: int = 0
    model: str | None = None


@router.post("/", response_model=ProposalResponse, status_code=201)
async def create_proposal(
    body: CreateProposalRequest,
    tenant_id: str = Depends(require_tenant),
    db: AsyncSession = Depends(get_db),
):
    # TODO: extraer created_by del JWT de Clerk
    cmd = CreateProposalCommand(
        tenant_id=tenant_id,
        client_id=body.client_id,
        created_by="user_placeholder",
        title=body.title,
        template_id=body.template_id,
        context=body.context,
    )
    return await handle_create_proposal(cmd, db)


@router.patch("/{proposal_id}/sections", response_model=ProposalResponse)
async def update_proposal_sections(
    proposal_id: UUID,
    body: UpdateSectionsRequest,
    tenant_id: str = Depends(require_tenant),
    db: AsyncSession = Depends(get_db),
):
    cmd = UpdateProposalSectionsCommand(
        tenant_id=tenant_id,
        proposal_id=proposal_id,
        sections=body.sections,
        tokens_used=body.tokens_used,
        model=body.model,
    )
    proposal = await handle_update_sections(cmd, db)
    await db.commit()
    await db.refresh(proposal)
    return proposal


@router.get("/{proposal_id}", response_model=ProposalResponse)
async def get_proposal(
    proposal_id: UUID,
    tenant_id: str = Depends(require_tenant),
    db: AsyncSession = Depends(get_db),
):
    return await handle_get_proposal(GetProposalQuery(tenant_id=tenant_id, proposal_id=proposal_id), db)


@router.get("/", response_model=dict)
async def list_proposals(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    client_id: UUID | None = Query(None),
    status: str | None = Query(None),
    tenant_id: str = Depends(require_tenant),
    db: AsyncSession = Depends(get_db),
):
    query = ListProposalsQuery(
        tenant_id=tenant_id, page=page, per_page=per_page, client_id=client_id, status=status
    )
    proposals, total = await handle_list_proposals(query, db)
    return {
        "items": [ProposalResponse.model_validate(p) for p in proposals],
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": -(-total // per_page),
    }

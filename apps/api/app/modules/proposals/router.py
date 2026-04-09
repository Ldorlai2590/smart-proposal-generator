from uuid import UUID
from fastapi import APIRouter, Depends, Query, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.shared.tenant import require_tenant
from app.modules.proposals.commands import (
    CreateProposalCommand,
    UpdateProposalSectionsCommand,
    UpdateProposalStatusCommand,
)
from app.modules.proposals.queries import GetProposalQuery, ListProposalsQuery
from app.modules.proposals.handlers import (
    handle_create_proposal,
    handle_get_proposal,
    handle_update_sections,
    handle_update_status,
    handle_list_proposals,
)
from app.modules.proposals.schemas import (
    ProposalCreate,
    ProposalUpdate,
    ProposalOut,
    ProposalSaveResponse,
    ProposalListResponse,
)

router = APIRouter(prefix="/proposals", tags=["proposals"])


@router.get("/", response_model=ProposalListResponse)
async def list_proposals(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    client_id: UUID | None = Query(None),
    status: str | None = Query(None),
    tenant_id: str = Depends(require_tenant),
    db: AsyncSession = Depends(get_db),
):
    """
    List proposals for the current tenant.
    Optionally filter by client_id or status.
    """
    query = ListProposalsQuery(
        tenant_id=tenant_id,
        page=page,
        per_page=per_page,
        client_id=client_id,
        status=status,
    )
    proposals, total = await handle_list_proposals(query, db)
    pages = -(-total // per_page)
    return ProposalListResponse(
        data=[ProposalOut.model_validate(p) for p in proposals],
        total=total,
        page=page,
        per_page=per_page,
        pages=pages,
    )


@router.post("/", response_model=ProposalSaveResponse, status_code=201)
async def create_proposal(
    body: ProposalCreate,
    x_clerk_user_id: str | None = Header(None),
    tenant_id: str = Depends(require_tenant),
    db: AsyncSession = Depends(get_db),
):
    """
    Save a proposal to PostgreSQL.

    Accepts the full AI-generated payload in one shot:
    - client_id, title, template_id, context
    - sections (AI-generated content)
    - tokens_used, model

    If sections are provided, status is set to "generated" automatically.
    The X-Clerk-User-ID header is used as created_by when available.
    """
    created_by = x_clerk_user_id or "anonymous"

    cmd = CreateProposalCommand(
        tenant_id=tenant_id,
        client_id=body.client_id,
        created_by=created_by,
        title=body.title,
        template_id=body.template_id,
        context=body.context,
        sections=body.sections,
        tokens_used=body.tokens_used,
        model=body.model,
    )
    proposal = await handle_create_proposal(cmd, db)
    return ProposalSaveResponse(
        id=str(proposal.id),
        status=proposal.status,
        created_at=proposal.created_at.isoformat(),
    )


@router.get("/{proposal_id}", response_model=ProposalOut)
async def get_proposal(
    proposal_id: UUID,
    tenant_id: str = Depends(require_tenant),
    db: AsyncSession = Depends(get_db),
):
    """
    Get a single proposal by ID. Always filtered by tenant_id to prevent data leaks.
    """
    proposal = await handle_get_proposal(
        GetProposalQuery(tenant_id=tenant_id, proposal_id=proposal_id), db
    )
    return ProposalOut.model_validate(proposal)


@router.patch("/{proposal_id}/sections", response_model=ProposalOut)
async def update_proposal_sections(
    proposal_id: UUID,
    body: ProposalUpdate,
    tenant_id: str = Depends(require_tenant),
    db: AsyncSession = Depends(get_db),
):
    """
    Update sections of an existing proposal after AI streaming completes.
    Sets status to "generated".
    """
    cmd = UpdateProposalSectionsCommand(
        tenant_id=tenant_id,
        proposal_id=proposal_id,
        sections=body.sections or {},
        tokens_used=body.tokens_used or 0,
        model=body.model,
    )
    proposal = await handle_update_sections(cmd, db)
    return ProposalOut.model_validate(proposal)


@router.patch("/{proposal_id}/status", response_model=ProposalOut)
async def update_proposal_status(
    proposal_id: UUID,
    status: str,
    tenant_id: str = Depends(require_tenant),
    db: AsyncSession = Depends(get_db),
):
    """
    Update the status of a proposal (draft → generated → sent → accepted → rejected).
    """
    cmd = UpdateProposalStatusCommand(
        tenant_id=tenant_id,
        proposal_id=proposal_id,
        status=status,
    )
    proposal = await handle_update_status(cmd, db)
    return ProposalOut.model_validate(proposal)

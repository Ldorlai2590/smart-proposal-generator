from uuid import uuid4
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from fastapi import HTTPException

from app.modules.proposals.models import Proposal
from app.modules.proposals.commands import (
    CreateProposalCommand,
    UpdateProposalSectionsCommand,
    UpdateProposalStatusCommand,
)
from app.modules.proposals.queries import GetProposalQuery, ListProposalsQuery


async def handle_create_proposal(cmd: CreateProposalCommand, db: AsyncSession) -> Proposal:
    proposal = Proposal(
        id=uuid4(),
        tenant_id=cmd.tenant_id,
        client_id=cmd.client_id,
        created_by=cmd.created_by,
        title=cmd.title,
        template_id=cmd.template_id,
        context=cmd.context,
    )
    db.add(proposal)
    await db.flush()
    return proposal


async def handle_get_proposal(query: GetProposalQuery, db: AsyncSession) -> Proposal:
    result = await db.execute(
        select(Proposal).where(
            Proposal.tenant_id == query.tenant_id,
            Proposal.id == query.proposal_id,
        )
    )
    proposal = result.scalar_one_or_none()
    if not proposal:
        raise HTTPException(status_code=404, detail="Propuesta no encontrada")
    return proposal


async def handle_update_sections(cmd: UpdateProposalSectionsCommand, db: AsyncSession) -> Proposal:
    result = await db.execute(
        select(Proposal).where(
            Proposal.tenant_id == cmd.tenant_id,
            Proposal.id == cmd.proposal_id,
        )
    )
    proposal = result.scalar_one_or_none()
    if not proposal:
        raise HTTPException(status_code=404, detail="Propuesta no encontrada")

    proposal.sections = cmd.sections
    proposal.tokens_used = cmd.tokens_used
    proposal.model = cmd.model
    proposal.status = "generated"
    return proposal


async def handle_list_proposals(
    query: ListProposalsQuery, db: AsyncSession
) -> tuple[list[Proposal], int]:
    base_query = select(Proposal).where(Proposal.tenant_id == query.tenant_id)

    if query.client_id:
        base_query = base_query.where(Proposal.client_id == query.client_id)
    if query.status:
        base_query = base_query.where(Proposal.status == query.status)

    count_result = await db.execute(select(func.count()).select_from(base_query.subquery()))
    total = count_result.scalar_one()

    offset = (query.page - 1) * query.per_page
    result = await db.execute(
        base_query.order_by(Proposal.created_at.desc()).offset(offset).limit(query.per_page)
    )
    return list(result.scalars().all()), total

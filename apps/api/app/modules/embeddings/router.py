from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db, AsyncSessionLocal
from app.shared.tenant import require_tenant
from app.modules.embeddings.schemas import (
    SemanticSearchRequest,
    SemanticSearchResponse,
)
from app.modules.embeddings.service import generate_embedding, index_proposal
from app.modules.embeddings.commands import delete_embeddings_for_proposal
from app.modules.embeddings.queries import semantic_search
from app.modules.proposals.handlers import handle_get_proposal
from app.modules.proposals.queries import GetProposalQuery

router = APIRouter(prefix="/embeddings", tags=["embeddings"])


@router.post("/proposals/{proposal_id}/index", status_code=202)
async def index_proposal_endpoint(
    proposal_id: UUID,
    background_tasks: BackgroundTasks,
    tenant_id: str = Depends(require_tenant),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """
    Trigger (re-)indexing of a proposal for semantic search.

    The proposal must belong to the requesting tenant. Indexing is enqueued
    as a background task and the response is returned immediately (202).
    """
    # Verify proposal exists and belongs to this tenant before enqueueing
    proposal = await handle_get_proposal(
        GetProposalQuery(tenant_id=tenant_id, proposal_id=proposal_id), db
    )

    # Capture values for the background closure (don't hold the request session)
    _title = proposal.title
    _sections = dict(proposal.sections)

    async def _do_index() -> None:
        async with AsyncSessionLocal() as bg_db:
            await index_proposal(
                tenant_id=tenant_id,
                proposal_id=proposal_id,
                title=_title,
                sections=_sections,
                db=bg_db,
            )
            await bg_db.commit()

    background_tasks.add_task(_do_index)

    return {
        "status": "accepted",
        "proposal_id": str(proposal_id),
        "message": "Indexing enqueued",
    }


@router.post("/search", response_model=SemanticSearchResponse)
async def search_proposals(
    body: SemanticSearchRequest,
    tenant_id: str = Depends(require_tenant),
    db: AsyncSession = Depends(get_db),
) -> SemanticSearchResponse:
    """
    Semantic search over indexed proposals for the current tenant.

    Returns the most similar proposal chunks ranked by cosine distance.
    All results are strictly scoped to `tenant_id` — cross-tenant leakage
    is impossible because the tenant filter is applied first in the DB query.
    """
    if not body.query.strip():
        raise HTTPException(status_code=422, detail="La consulta no puede estar vacía")

    query_vector = generate_embedding(body.query)
    results = await semantic_search(
        tenant_id=tenant_id,
        query_embedding=query_vector,
        db=db,
        limit=body.limit,
    )

    return SemanticSearchResponse(
        results=results,
        query=body.query,
        total=len(results),
    )


@router.delete("/proposals/{proposal_id}", status_code=200)
async def delete_proposal_embeddings(
    proposal_id: UUID,
    tenant_id: str = Depends(require_tenant),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """
    Remove all embedding vectors for a proposal within the current tenant.

    Safe to call even if the proposal has no embeddings — returns count of
    deleted rows (0 if none existed).
    """
    deleted = await delete_embeddings_for_proposal(
        tenant_id=tenant_id,
        proposal_id=proposal_id,
        db=db,
    )
    return {
        "proposal_id": str(proposal_id),
        "deleted": deleted,
    }

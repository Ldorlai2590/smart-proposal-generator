from uuid import UUID, uuid4
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import delete

from app.modules.embeddings.models import ProposalEmbedding


async def create_embedding(
    tenant_id: str,
    proposal_id: UUID,
    content: str,
    embedding_vector: list[float],
    db: AsyncSession,
) -> ProposalEmbedding:
    """Persist a single embedding chunk for a proposal."""
    record = ProposalEmbedding(
        id=uuid4(),
        tenant_id=tenant_id,
        proposal_id=proposal_id,
        content=content,
        embedding=embedding_vector,
        created_at=datetime.now(timezone.utc),
    )
    db.add(record)
    await db.flush()
    await db.refresh(record)
    return record


async def delete_embeddings_for_proposal(
    tenant_id: str,
    proposal_id: UUID,
    db: AsyncSession,
) -> int:
    """
    Remove all embedding chunks for a proposal scoped to the tenant.
    Returns the number of deleted rows.
    """
    result = await db.execute(
        delete(ProposalEmbedding).where(
            ProposalEmbedding.tenant_id == tenant_id,
            ProposalEmbedding.proposal_id == proposal_id,
        )
    )
    await db.flush()
    return result.rowcount  # type: ignore[return-value]

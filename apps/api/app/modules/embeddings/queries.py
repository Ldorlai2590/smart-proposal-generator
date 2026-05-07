from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text

from app.modules.embeddings.models import ProposalEmbedding
from app.modules.embeddings.schemas import SemanticSearchResult


async def semantic_search(
    tenant_id: str,
    query_embedding: list[float],
    db: AsyncSession,
    limit: int = 5,
) -> list[SemanticSearchResult]:
    """
    Find the most semantically similar proposal chunks within a tenant.

    Uses cosine distance (<=> operator from pgvector). The tenant_id filter
    is applied FIRST to guarantee strict multi-tenant isolation.

    Returns results ordered from most to least similar (lowest distance first).
    """
    # Build the vector literal for pgvector — cast via SQL expression
    vector_literal = str(query_embedding)

    stmt = (
        select(
            ProposalEmbedding.proposal_id,
            ProposalEmbedding.content,
            (
                ProposalEmbedding.embedding.op("<=>")(
                    text(f"'{vector_literal}'::vector")
                )
            ).label("distance"),
        )
        .where(ProposalEmbedding.tenant_id == tenant_id)
        .order_by(text("distance"))
        .limit(limit)
    )

    result = await db.execute(stmt)
    rows = result.all()

    return [
        SemanticSearchResult(
            proposal_id=row.proposal_id,
            content=row.content,
            distance=float(row.distance),
        )
        for row in rows
    ]

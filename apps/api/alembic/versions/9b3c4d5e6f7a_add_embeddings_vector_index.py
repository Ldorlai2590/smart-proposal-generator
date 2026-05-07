"""add HNSW vector index on proposal_embeddings

Revision ID: 9b3c4d5e6f7a
Revises: 8a2b3c4d5e6f
Create Date: 2026-05-07 00:00:00.000000

The proposal_embeddings table (including the vector column) was already
created in the initial migration (200b07f62c59). This migration adds:

  1. An HNSW index on the embedding column for fast approximate nearest-
     neighbour search using cosine distance.  HNSW is preferred over IVFFlat
     for production workloads because it requires no training step and
     delivers better recall.

  2. A composite index on (tenant_id, proposal_id) to accelerate the common
     pattern of fetching all chunks for a given proposal within a tenant.
"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "9b3c4d5e6f7a"
down_revision: Union[str, None] = "8a2b3c4d5e6f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # HNSW index for cosine-distance ANN search.
    # m=16 (neighbours per layer) and ef_construction=64 are safe defaults
    # for a 1536-dim space; tune after profiling real query patterns.
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_embeddings_hnsw
        ON proposal_embeddings
        USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64)
        """
    )

    # Composite index to speed up per-proposal lookups (e.g. DELETE on re-index)
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_embeddings_tenant_proposal
        ON proposal_embeddings (tenant_id, proposal_id)
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_embeddings_tenant_proposal")
    op.execute("DROP INDEX IF EXISTS idx_embeddings_hnsw")

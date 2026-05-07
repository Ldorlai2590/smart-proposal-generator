"""
Embedding service: text → vector, and proposal indexing.

Embedding generation
--------------------
Anthropic does not currently expose a dedicated embeddings endpoint via its
public API, so this service uses a deterministic hash-based placeholder that
produces a stable 1536-dimensional float vector from any input string.

TODO (production): Replace `generate_embedding` with a real embedding model.
     Recommended options:
       • OpenAI text-embedding-3-small (1536 dims, cheap, high quality)
       • Cohere embed-multilingual-v3 (1024 dims, great for LATAM Spanish)
       • Voyage AI voyage-large-2 (best Anthropic-ecosystem option)
     Example with OpenAI:
         import openai
         resp = await openai.AsyncOpenAI().embeddings.create(
             model="text-embedding-3-small", input=text
         )
         return resp.data[0].embedding
"""

import hashlib
import math
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.embeddings.commands import create_embedding, delete_embeddings_for_proposal

# Maximum characters per chunk when splitting proposal sections.
_CHUNK_SIZE = 1000

# Keys we pull from the sections dict, in display order.
_SECTION_KEYS = [
    "executive_summary",
    "problem",
    "solution",
    "scope",
    "timeline",
    "investment",
    "next_steps",
]


def generate_embedding(text: str) -> list[float]:
    """
    Return a deterministic 1536-dimensional unit vector derived from `text`.

    This is a placeholder — see module docstring for production alternatives.
    The vector is stable for identical inputs and differs meaningfully for
    different inputs, making it safe for integration/smoke tests.
    """
    # Seed a 1536-element pseudo-random vector using 48 × SHA-256 digests
    # (each digest gives 32 bytes = 8 floats × 4 bytes, 48 × 8 = 384 … we
    # collect enough bytes then slice to exactly 1536 values).
    seed = text.encode("utf-8")
    floats: list[float] = []
    counter = 0
    while len(floats) < 1536:
        digest = hashlib.sha256(seed + counter.to_bytes(4, "big")).digest()
        for i in range(0, len(digest) - 3, 4):
            raw = int.from_bytes(digest[i : i + 4], "big")
            # Map [0, 2^32) → (-1.0, 1.0)
            floats.append(raw / 2_147_483_648.0 - 1.0)
        counter += 1

    vec = floats[:1536]

    # Normalise to unit length so cosine distance works correctly.
    magnitude = math.sqrt(sum(v * v for v in vec))
    if magnitude > 0:
        vec = [v / magnitude for v in vec]

    return vec


def _extract_chunks(title: str | None, sections: dict) -> list[str]:
    """
    Convert a proposal's title + sections dict into text chunks ≤ _CHUNK_SIZE chars.

    Each chunk preserves enough context to be useful in isolation.
    """
    parts: list[str] = []

    if title:
        parts.append(f"Propuesta: {title}")

    for key in _SECTION_KEYS:
        value = sections.get(key)
        if not value:
            continue
        if isinstance(value, str):
            text = f"{key.replace('_', ' ').title()}: {value}"
        elif isinstance(value, dict):
            # Flatten nested dicts (e.g. investment: {total: ..., breakdown: ...})
            lines = [f"{k}: {v}" for k, v in value.items() if v]
            text = f"{key.replace('_', ' ').title()}: " + " | ".join(lines)
        elif isinstance(value, list):
            text = f"{key.replace('_', ' ').title()}: " + "; ".join(str(item) for item in value)
        else:
            text = f"{key.replace('_', ' ').title()}: {value}"

        # Split long sections into sub-chunks with overlap
        while text:
            parts.append(text[:_CHUNK_SIZE])
            text = text[_CHUNK_SIZE:]

    return [p for p in parts if p.strip()]


async def index_proposal(
    tenant_id: str,
    proposal_id: UUID,
    title: str | None,
    sections: dict,
    db: AsyncSession,
) -> int:
    """
    (Re-)index a proposal for semantic search.

    Steps:
      1. Delete any existing embeddings for this proposal within the tenant.
      2. Split proposal content into text chunks.
      3. Generate an embedding vector for each chunk.
      4. Persist each chunk + vector.

    Returns the number of chunks indexed.
    """
    # Step 1 — clean up stale vectors (tenant_id checked first)
    await delete_embeddings_for_proposal(tenant_id, proposal_id, db)

    chunks = _extract_chunks(title, sections)
    if not chunks:
        return 0

    # Steps 2 & 3 — embed and store each chunk
    for chunk in chunks:
        vector = generate_embedding(chunk)
        await create_embedding(
            tenant_id=tenant_id,
            proposal_id=proposal_id,
            content=chunk,
            embedding_vector=vector,
            db=db,
        )

    return len(chunks)

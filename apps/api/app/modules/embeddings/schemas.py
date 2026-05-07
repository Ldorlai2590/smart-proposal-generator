from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field


class EmbeddingCreate(BaseModel):
    proposal_id: UUID
    content: str
    embedding: list[float] = Field(..., min_length=1536, max_length=1536)


class EmbeddingResponse(BaseModel):
    id: UUID
    tenant_id: str
    proposal_id: UUID
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class SemanticSearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=2000)
    limit: int = Field(5, ge=1, le=20)


class SemanticSearchResult(BaseModel):
    proposal_id: UUID
    content: str
    distance: float


class SemanticSearchResponse(BaseModel):
    results: list[SemanticSearchResult]
    query: str
    total: int

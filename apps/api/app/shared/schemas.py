from uuid import UUID
from datetime import datetime
from pydantic import BaseModel


class TenantContext(BaseModel):
    tenant_id: str  # Clerk orgId


class TimestampMixin(BaseModel):
    created_at: datetime
    updated_at: datetime | None = None


class PaginatedResponse[T](BaseModel):
    items: list[T]
    total: int
    page: int
    per_page: int
    pages: int

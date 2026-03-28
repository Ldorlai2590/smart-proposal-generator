from fastapi import Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db


async def get_tenant_id(x_tenant_id: str = Header(...)) -> str:
    """Extrae el tenant_id del header X-Tenant-ID (orgId de Clerk)."""
    if not x_tenant_id:
        raise HTTPException(status_code=401, detail="X-Tenant-ID header required")
    return x_tenant_id

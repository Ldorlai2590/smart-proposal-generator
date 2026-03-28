from fastapi import Depends, Header, HTTPException


async def require_tenant(x_tenant_id: str = Header(...)) -> str:
    """
    Dependency: extrae y valida el tenant_id de Clerk (orgId).
    Inyectar en TODOS los endpoints con: tenant_id: str = Depends(require_tenant)
    """
    if not x_tenant_id or len(x_tenant_id) < 4:
        raise HTTPException(status_code=401, detail="Tenant ID invalido")
    return x_tenant_id

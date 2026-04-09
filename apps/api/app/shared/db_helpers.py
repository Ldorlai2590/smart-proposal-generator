"""
Helpers de base de datos que centralizan el aislamiento multi-tenant.

Regla dorada del proyecto: NINGUNA query de lectura o escritura puede omitir
el filtro `tenant_id`. Para evitar que alguien se olvide en un code review
usamos los wrappers de este módulo en vez de `select(Model)` crudo.

Ejemplo:

    from app.shared.db_helpers import tenant_scoped_select
    from app.modules.clients.models import Client

    async def list_clients(db, tenant_id: str):
        stmt = tenant_scoped_select(Client, tenant_id)
        return (await db.execute(stmt)).scalars().all()
"""
from typing import TypeVar

from sqlalchemy import Select, select, update, delete
from sqlalchemy.sql import Update, Delete

T = TypeVar("T")


class MissingTenantIdError(Exception):
    """Se lanza si intentan pasar un tenant_id vacío a un helper scoped."""


def _require_tenant(tenant_id: str) -> str:
    if not tenant_id or not isinstance(tenant_id, str) or len(tenant_id) < 4:
        raise MissingTenantIdError(
            "tenant_id es obligatorio y debe venir del header X-Tenant-ID."
        )
    return tenant_id


def tenant_scoped_select(model: type[T], tenant_id: str) -> Select[tuple[T]]:
    """
    SELECT * FROM <model> WHERE tenant_id = :tenant_id

    Falla explícitamente si el modelo no tiene `tenant_id`, así detectamos
    tablas mal definidas en tiempo de desarrollo.
    """
    _require_tenant(tenant_id)
    if not hasattr(model, "tenant_id"):
        raise AttributeError(
            f"{model.__name__} no tiene columna tenant_id. "
            "Toda tabla debe incluirla (regla del proyecto)."
        )
    return select(model).where(model.tenant_id == tenant_id)  # type: ignore[attr-defined]


def tenant_scoped_update(model: type, tenant_id: str) -> Update:
    _require_tenant(tenant_id)
    if not hasattr(model, "tenant_id"):
        raise AttributeError(f"{model.__name__} no tiene columna tenant_id.")
    return update(model).where(model.tenant_id == tenant_id)  # type: ignore[attr-defined]


def tenant_scoped_delete(model: type, tenant_id: str) -> Delete:
    _require_tenant(tenant_id)
    if not hasattr(model, "tenant_id"):
        raise AttributeError(f"{model.__name__} no tiene columna tenant_id.")
    return delete(model).where(model.tenant_id == tenant_id)  # type: ignore[attr-defined]


def assert_tenant_owns(obj, tenant_id: str) -> None:
    """
    Defensa en profundidad: antes de devolver un objeto cargado por PK,
    confirma que el tenant_id coincide. Útil en queries tipo `get_by_id`.

    Raises 404 desde el caller si retorna False vía HTTPException.
    """
    _require_tenant(tenant_id)
    if obj is None:
        return
    obj_tenant = getattr(obj, "tenant_id", None)
    if str(obj_tenant) != tenant_id:
        raise PermissionError(
            f"Cross-tenant access denied: object tenant={obj_tenant}, "
            f"caller tenant={tenant_id}"
        )

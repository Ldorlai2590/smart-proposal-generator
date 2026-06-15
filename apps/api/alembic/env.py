import asyncio
from logging.config import fileConfig
from sqlalchemy.ext.asyncio import create_async_engine
from alembic import context

from app.core.config import settings
from app.core.database import Base
# Importar todos los modelos para que Alembic los detecte
from app.modules.clients.models import Client  # noqa
from app.modules.proposals.models import Proposal  # noqa

config = context.config
config.set_main_option("sqlalchemy.url", settings.database_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

# Tablas v2 creadas por SQL crudo en apps/web/db/migrations/002_smart_proposal_v2.sql
# y que viven solo en Supabase. Alembic NO las gestiona: sin este filtro,
# `alembic revision --autogenerate` las vería como "extra" y emitiría DROP,
# destruyendo datos. include_object las excluye de toda comparación.
V2_UNMANAGED_TABLES = {
    "companies",
    "services",
    "case_studies",
    "testimonials",
    "proposal_views",
    "proposal_alerts",
    "follow_ups",
    "automation_rules",
}


def include_object(object, name, type_, reflected, compare_to):
    if type_ == "table" and name in V2_UNMANAGED_TABLES:
        return False
    return True


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        include_object=include_object,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    connectable = create_async_engine(
        settings.database_url,
        connect_args={"ssl": "require"},
    )
    async with connectable.connect() as connection:
        await connection.run_sync(
            lambda sync_conn: context.configure(
                connection=sync_conn,
                target_metadata=target_metadata,
                include_object=include_object,
            )
        )
        async with connection.begin():
            await connection.run_sync(lambda _: context.run_migrations())


def run_async_migrations() -> None:
    asyncio.run(run_migrations_online())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_async_migrations()

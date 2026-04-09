"""trial_and_billing

Añade columnas de trial híbrido (30 + 30 días) y billing Stripe a la tabla tenants.

Revision ID: 7f1a2b3c4d5e
Revises: 200b07f62c59
Create Date: 2026-04-08 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "7f1a2b3c4d5e"
down_revision: Union[str, None] = "200b07f62c59"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Trial híbrido
    op.add_column(
        "tenants",
        sa.Column(
            "trial_started_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
    )
    # Default a 30 días desde NOW() para rows existentes
    op.add_column(
        "tenants",
        sa.Column(
            "trial_ends_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("NOW() + INTERVAL '30 days'"),
        ),
    )
    op.add_column(
        "tenants",
        sa.Column(
            "trial_stage",
            sa.String(length=20),
            nullable=False,
            server_default="no_card",
        ),
    )
    op.add_column(
        "tenants",
        sa.Column(
            "card_on_file",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )

    # Stripe
    op.add_column(
        "tenants",
        sa.Column("stripe_customer_id", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "tenants",
        sa.Column("stripe_subscription_id", sa.String(length=255), nullable=True),
    )

    # Metered usage
    op.add_column(
        "tenants",
        sa.Column(
            "proposals_used",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )
    op.add_column(
        "tenants",
        sa.Column(
            "proposals_quota",
            sa.Integer(),
            nullable=False,
            server_default="999999",
        ),
    )

    op.create_index(
        "idx_tenants_trial_stage", "tenants", ["trial_stage"]
    )
    op.create_index(
        "idx_tenants_stripe_customer", "tenants", ["stripe_customer_id"]
    )


def downgrade() -> None:
    op.drop_index("idx_tenants_stripe_customer", table_name="tenants")
    op.drop_index("idx_tenants_trial_stage", table_name="tenants")
    op.drop_column("tenants", "proposals_quota")
    op.drop_column("tenants", "proposals_used")
    op.drop_column("tenants", "stripe_subscription_id")
    op.drop_column("tenants", "stripe_customer_id")
    op.drop_column("tenants", "card_on_file")
    op.drop_column("tenants", "trial_stage")
    op.drop_column("tenants", "trial_ends_at")
    op.drop_column("tenants", "trial_started_at")

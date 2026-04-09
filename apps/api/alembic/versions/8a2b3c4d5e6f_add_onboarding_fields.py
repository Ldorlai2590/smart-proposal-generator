"""add onboarding fields to tenants

Revision ID: 8a2b3c4d5e6f
Revises: 7f1a2b3c4d5e
Create Date: 2026-04-09

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '8a2b3c4d5e6f'
down_revision: Union[str, None] = '7f1a2b3c4d5e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('tenants', sa.Column('onboarding_completed', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('tenants', sa.Column('metadata', sa.JSON(), nullable=True, server_default='{}'))


def downgrade() -> None:
    op.drop_column('tenants', 'metadata')
    op.drop_column('tenants', 'onboarding_completed')

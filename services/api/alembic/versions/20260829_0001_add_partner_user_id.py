"""add user_id to partner_pharmacies

Revision ID: a1b2c3d4e5f6
Revises: prof_onboard_001
Create Date: 2026-08-29

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'prof_onboard_001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('partner_pharmacies', sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.user_id'), nullable=True))


def downgrade() -> None:
    op.drop_column('partner_pharmacies', 'user_id')

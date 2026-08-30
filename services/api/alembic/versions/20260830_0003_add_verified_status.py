"""add verified status to prescription_verification_status enum

Revision ID: 20260830_0003
Revises: 20260830_0002
Create Date: 2026-08-30
"""
from alembic import op
import sqlalchemy as sa

revision = '20260830_0003'
down_revision = '20260830_0002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE prescription_verification_status ADD VALUE IF NOT EXISTS 'verified'")


def downgrade() -> None:
    pass

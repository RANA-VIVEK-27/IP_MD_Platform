"""Add medicine detail fields

Revision ID: 20260830_0001
Revises: 20260829_0001
Create Date: 2026-08-30
"""
from alembic import op
import sqlalchemy as sa

revision = '20260830_0001'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('medicine_catalog_items', sa.Column('manufacturer', sa.String(255), nullable=True))
    op.add_column('medicine_catalog_items', sa.Column('dosage_form', sa.String(100), nullable=True))
    op.add_column('medicine_catalog_items', sa.Column('strength', sa.String(100), nullable=True))
    op.add_column('medicine_catalog_items', sa.Column('pack_size', sa.String(100), nullable=True))
    op.add_column('medicine_catalog_items', sa.Column('description', sa.Text(), nullable=True))
    op.add_column('medicine_catalog_items', sa.Column('side_effects', sa.Text(), nullable=True))
    op.add_column('medicine_catalog_items', sa.Column('contraindications', sa.Text(), nullable=True))
    op.add_column('medicine_catalog_items', sa.Column('storage_conditions', sa.String(255), nullable=True))
    op.add_column('medicine_catalog_items', sa.Column('drug_interactions', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('medicine_catalog_items', 'drug_interactions')
    op.drop_column('medicine_catalog_items', 'storage_conditions')
    op.drop_column('medicine_catalog_items', 'contraindications')
    op.drop_column('medicine_catalog_items', 'side_effects')
    op.drop_column('medicine_catalog_items', 'description')
    op.drop_column('medicine_catalog_items', 'pack_size')
    op.drop_column('medicine_catalog_items', 'strength')
    op.drop_column('medicine_catalog_items', 'dosage_form')
    op.drop_column('medicine_catalog_items', 'manufacturer')

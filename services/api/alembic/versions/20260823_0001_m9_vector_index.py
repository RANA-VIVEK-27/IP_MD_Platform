"""M9: Add vector index to knowledge_embeddings table.

Revision ID: 20260823_0001_m9_vector_index
Revises: m12_document_storage
Create Date: 2026-08-23
"""
from alembic import op
import sqlalchemy as sa

revision = '20260823_0001_m9_vector_index'
down_revision = 'm12_document_storage'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create ivfflat/hnsw vector index if pgvector is available
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM pg_extension WHERE extname = 'vector'
            ) THEN
                IF EXISTS (
                    SELECT 1 FROM information_schema.tables WHERE table_name = 'knowledge_embeddings'
                ) THEN
                    CREATE INDEX IF NOT EXISTS ix_knowledge_embeddings_vector 
                    ON knowledge_embeddings USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);
                END IF;
            END IF;
        END $$;
    """)


def downgrade() -> None:
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM pg_extension WHERE extname = 'vector'
            ) THEN
                DROP INDEX IF EXISTS ix_knowledge_embeddings_vector;
            END IF;
        END $$;
    """)

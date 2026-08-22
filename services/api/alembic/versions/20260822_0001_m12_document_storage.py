"""M12: Extend documents table for real storage, lifecycle states, and security.

Revision ID: m12_document_storage
Revises: 20260730_0001_initial_schema
Create Date: 2026-08-22
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'm12_document_storage'
down_revision = '20260730_0001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create new enum types
    doc_status_enum = postgresql.ENUM(
        'upload_pending', 'uploaded', 'quarantined', 'scanning',
        'clean', 'processing', 'ready',
        'upload_failed', 'scan_failed', 'infected', 'processing_failed',
        'deleted',
        name='document_status',
        create_type=False
    )
    scan_status_enum = postgresql.ENUM(
        'pending', 'clean', 'infected', 'scan_failed',
        name='document_scan_status',
        create_type=False
    )
    processing_status_enum = postgresql.ENUM(
        'pending', 'processing', 'completed', 'failed',
        name='document_processing_status',
        create_type=False
    )

    # Create enums if they don't exist
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_enums = {e['name'] for e in inspector.get_enums()}

    if 'document_status' not in existing_enums:
        doc_status_enum.create(conn, checkfirst=True)
    if 'document_scan_status' not in existing_enums:
        scan_status_enum.create(conn, checkfirst=True)
    if 'document_processing_status' not in existing_enums:
        processing_status_enum.create(conn, checkfirst=True)

    # Add new columns to documents table
    op.add_column('documents', sa.Column('original_filename', sa.String(255), nullable=False, server_default='unknown'))
    op.add_column('documents', sa.Column('mime_type', sa.String(100), nullable=False, server_default='application/octet-stream'))
    op.add_column('documents', sa.Column('checksum_sha256', sa.String(64), nullable=True))
    op.add_column('documents', sa.Column('storage_key', sa.String(500), nullable=True))
    op.add_column('documents', sa.Column('storage_provider', sa.String(50), nullable=True, server_default='local'))
    op.add_column('documents', sa.Column('doc_status', sa.Enum(name='document_status'), nullable=False, server_default='ready'))
    op.add_column('documents', sa.Column('scan_status', sa.Enum(name='document_scan_status'), nullable=False, server_default='clean'))
    op.add_column('documents', sa.Column('processing_status', sa.Enum(name='document_processing_status'), nullable=False, server_default='completed'))
    op.add_column('documents', sa.Column('deleted_at', sa.TIMESTAMP(timezone=True), nullable=True))
    op.add_column('documents', sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=True))

    # Migrate existing data: map malware_scan_status -> doc_status
    op.execute("""
        UPDATE documents
        SET doc_status = CASE
            WHEN malware_scan_status = 'pending' THEN 'quarantined'::document_status
            WHEN malware_scan_status = 'clean' THEN 'ready'::document_status
            WHEN malware_scan_status = 'rejected' THEN 'infected'::document_status
            ELSE 'ready'::document_status
        END,
        scan_status = CASE
            WHEN malware_scan_status = 'pending' THEN 'pending'::document_scan_status
            WHEN malware_scan_status = 'clean' THEN 'clean'::document_scan_status
            WHEN malware_scan_status = 'rejected' THEN 'infected'::document_scan_status
            ELSE 'clean'::document_scan_status
        END,
        processing_status = 'completed'::document_processing_status
    """)

    # Drop old malware_scan_status column and enum (after migration)
    op.drop_column('documents', 'malware_scan_status')
    op.execute("DROP TYPE IF EXISTS malware_scan_status")

    # Create indexes for new columns
    op.create_index('ix_documents_doc_status', 'documents', ['doc_status'])
    op.create_index('ix_documents_uploaded_by_status', 'documents', ['uploaded_by', 'doc_status'])


def downgrade() -> None:
    # Drop new indexes
    op.drop_index('ix_documents_uploaded_by_status', table_name='documents')
    op.drop_index('ix_documents_doc_status', table_name='documents')

    # Restore malware_scan_status column
    op.execute("""
        ALTER TABLE documents ADD COLUMN malware_scan_status VARCHAR(20) DEFAULT 'pending'
    """)
    op.execute("""
        UPDATE documents
        SET malware_scan_status = CASE
            WHEN doc_status = 'infected' THEN 'rejected'
            WHEN scan_status = 'pending' THEN 'pending'
            ELSE 'clean'
        END
    """)
    op.execute("ALTER TABLE documents ALTER COLUMN malware_scan_status SET NOT NULL")

    # Drop new columns
    op.drop_column('documents', 'updated_at')
    op.drop_column('documents', 'deleted_at')
    op.drop_column('documents', 'processing_status')
    op.drop_column('documents', 'scan_status')
    op.drop_column('documents', 'doc_status')
    op.drop_column('documents', 'storage_provider')
    op.drop_column('documents', 'storage_key')
    op.drop_column('documents', 'checksum_sha256')
    op.drop_column('documents', 'mime_type')
    op.drop_column('documents', 'original_filename')

    # Drop enum types
    op.execute("DROP TYPE IF EXISTS document_processing_status")
    op.execute("DROP TYPE IF EXISTS document_scan_status")
    op.execute("DROP TYPE IF EXISTS document_status")

    # Re-create original enum
    malware_enum = postgresql.ENUM('pending', 'clean', 'rejected', name='malware_scan_status', create_type=False)
    malware_enum.create(op.get_bind(), checkfirst=True)

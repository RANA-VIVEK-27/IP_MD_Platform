"""Add owner_doctor_id to partner_pharmacies and create commission_configs, commission_transactions, financial_ledger tables.

Revision ID: 20260823_0002_comm_hierarchy
Revises: 20260823_0001_m9_vector_index
Create Date: 2026-08-23
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '20260823_0002_comm_hierarchy'
down_revision = '20260823_0001_m9_vector_index'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Add owner_doctor_id column to partner_pharmacies
    op.add_column(
        'partner_pharmacies',
        sa.Column('owner_doctor_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.user_id'), nullable=True)
    )

    # 2. Create commission_configs table
    op.create_table(
        'commission_configs',
        sa.Column('config_id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), primary_key=True),
        sa.Column('scope', sa.Enum('global', 'doctor', 'pharmacy', name='commission_scope_enum'), nullable=False, server_default='global'),
        sa.Column('doctor_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.user_id'), nullable=True),
        sa.Column('pharmacy_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('partner_pharmacies.partner_id'), nullable=True),
        sa.Column('doctor_commission_rate', sa.Numeric(5, 2), nullable=False, server_default='5.00'),
        sa.Column('platform_commission_rate', sa.Numeric(5, 2), nullable=False, server_default='2.00'),
        sa.Column('platform_commission_base', sa.Enum('doctor_commission', 'order_total', name='platform_commission_base_enum'), nullable=False, server_default='doctor_commission'),
        sa.Column('settlement_mode', sa.Enum('deduct_from_vendor', 'platform_funded', name='settlement_mode_enum'), nullable=False, server_default='deduct_from_vendor'),
        sa.Column('status', sa.Enum('active', 'inactive', name='commission_config_status_enum'), nullable=False, server_default='active'),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.user_id'), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()')),
    )

    # 3. Create commission_transactions table
    op.create_table(
        'commission_transactions',
        sa.Column('transaction_id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), primary_key=True),
        sa.Column('order_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('orders.order_id'), nullable=False),
        sa.Column('line_item_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('order_line_items.line_item_id'), nullable=True),
        sa.Column('doctor_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.user_id'), nullable=True),
        sa.Column('pharmacy_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('partner_pharmacies.partner_id'), nullable=True),
        sa.Column('doctor_commission_rate', sa.Numeric(5, 2), nullable=False),
        sa.Column('doctor_commission_amount_paise', sa.BigInteger(), nullable=False),
        sa.Column('platform_commission_rate', sa.Numeric(5, 2), nullable=False),
        sa.Column('platform_commission_base', sa.String(50), nullable=False, server_default='doctor_commission'),
        sa.Column('platform_commission_amount_paise', sa.BigInteger(), nullable=False),
        sa.Column('vendor_gross_amount_paise', sa.BigInteger(), nullable=False),
        sa.Column('vendor_net_amount_paise', sa.BigInteger(), nullable=False),
        sa.Column('settlement_mode', sa.String(50), nullable=False, server_default='deduct_from_vendor'),
        sa.Column('currency', sa.String(10), nullable=False, server_default='INR'),
        sa.Column('commission_status', sa.Enum('pending', 'eligible', 'approved', 'processing', 'paid', 'failed', 'reversed', 'refunded', name='commission_status_enum'), nullable=False, server_default='pending'),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()')),
    )
    op.create_index('ix_commission_tx_order_id', 'commission_transactions', ['order_id'])
    op.create_index('ix_commission_tx_doctor_id', 'commission_transactions', ['doctor_id'])
    op.create_index('ix_commission_tx_pharmacy_id', 'commission_transactions', ['pharmacy_id'])

    # 4. Create financial_ledger table
    op.create_table(
        'financial_ledger',
        sa.Column('entry_id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), primary_key=True),
        sa.Column('order_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('orders.order_id'), nullable=False),
        sa.Column('transaction_type', sa.Enum('customer_payment', 'doctor_commission', 'super_admin_commission', 'pharmacy_settlement', 'reversal', name='ledger_tx_type_enum'), nullable=False),
        sa.Column('entity_type', sa.Enum('patient', 'doctor', 'super_admin', 'pharmacy', name='ledger_entity_type_enum'), nullable=False),
        sa.Column('entity_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('amount_paise', sa.BigInteger(), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()')),
    )
    op.create_index('ix_financial_ledger_order_id', 'financial_ledger', ['order_id'])
    op.create_index('ix_financial_ledger_entity', 'financial_ledger', ['entity_type', 'entity_id'])


def downgrade() -> None:
    op.drop_table('financial_ledger')
    op.drop_table('commission_transactions')
    op.drop_table('commission_configs')
    op.drop_column('partner_pharmacies', 'owner_doctor_id')

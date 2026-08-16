"""Initial migration creating all 41 schema tables

Revision ID: 20260730_0001
Revises: 
Create Date: 2026-07-30

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from pgvector.sqlalchemy import Vector

# revision identifiers, used by Alembic.
revision: str = '20260730_0001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 0. Enable pgvector extension
    op.execute("CREATE EXTENSION IF NOT EXISTS vector;")

    # 1. partner_pharmacies
    op.create_table(
        'partner_pharmacies',
        sa.Column('partner_id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('address', postgresql.JSONB(), nullable=False),
        sa.Column('gstin', sa.String(length=20), nullable=True),
        sa.Column('fulfillment_radius_km', sa.Numeric(precision=6, scale=2), nullable=False),
        sa.Column('catalog_feed_url', sa.String(length=500), nullable=True),
        sa.Column('status', sa.Enum('pending_activation', 'active', 'suspended', 'delisted', name='partner_status'), nullable=False, server_default='pending_activation'),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False)
    )

    # 2. users
    op.create_table(
        'users',
        sa.Column('user_id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('role', sa.Enum('patient', 'doctor', 'pharmacy_staff_owned', 'partner_pharmacy', 'admin', 'user_admin', 'super_admin', name='user_role'), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=True, unique=True),
        sa.Column('phone', sa.String(length=20), nullable=True, unique=True),
        sa.Column('password_hash', sa.String(length=255), nullable=True),
        sa.Column('oauth_provider', sa.String(length=20), nullable=True),
        sa.Column('employer_partner_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('partner_pharmacies.partner_id'), nullable=True),
        sa.Column('status', sa.Enum('active', 'pending', 'suspended', name='user_status'), nullable=False, server_default='pending'),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=False)
    )
    op.create_index('ix_users_role_status', 'users', ['role', 'status'])

    # 3. doctor_licenses
    op.create_table(
        'doctor_licenses',
        sa.Column('license_id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.user_id'), nullable=False, unique=True),
        sa.Column('license_number', sa.String(length=50), nullable=False),
        sa.Column('verification_status', sa.Enum('pending', 'approved', 'rejected', name='license_verification_status'), nullable=False, server_default='pending'),
        sa.Column('verified_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.user_id'), nullable=True),
        sa.Column('verified_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('rejection_reason', sa.Text(), nullable=True)
    )

    # 4. pharmacy_profiles
    op.create_table(
        'pharmacy_profiles',
        sa.Column('pharmacy_profile_id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.user_id'), nullable=False, unique=True),
        sa.Column('pharmacy_name', sa.String(length=255), nullable=False),
        sa.Column('address', postgresql.JSONB(), nullable=False),
        sa.Column('gstin', sa.String(length=20), nullable=True)
    )

    # 5. permissions
    op.create_table(
        'permissions',
        sa.Column('permission_id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('code', sa.String(length=50), nullable=False, unique=True),
        sa.Column('description', sa.String(length=255), nullable=True)
    )

    # 6. admin_permissions
    op.create_table(
        'admin_permissions',
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.user_id'), primary_key=True, nullable=False),
        sa.Column('permission_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('permissions.permission_id'), primary_key=True, nullable=False),
        sa.Column('granted_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.user_id'), nullable=False),
        sa.Column('granted_at', sa.TIMESTAMP(timezone=True), nullable=False)
    )

    # 7. refresh_tokens
    op.create_table(
        'refresh_tokens',
        sa.Column('token_id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.user_id'), nullable=False),
        sa.Column('token_hash', sa.String(length=255), nullable=False),
        sa.Column('issued_at', sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column('expires_at', sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column('revoked_at', sa.TIMESTAMP(timezone=True), nullable=True)
    )

    # 8. account_status_history
    op.create_table(
        'account_status_history',
        sa.Column('status_history_id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.user_id'), nullable=False),
        sa.Column('status', sa.Enum('active', 'pending', 'suspended', name='account_status_enum'), nullable=False),
        sa.Column('reason_code', sa.String(length=50), nullable=True),
        sa.Column('changed_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.user_id'), nullable=True),
        sa.Column('changed_at', sa.TIMESTAMP(timezone=True), nullable=False)
    )

    # 9. saved_addresses
    op.create_table(
        'saved_addresses',
        sa.Column('address_id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.user_id'), nullable=False),
        sa.Column('label', sa.String(length=50), nullable=True),
        sa.Column('line1', sa.String(length=255), nullable=False),
        sa.Column('line2', sa.String(length=255), nullable=True),
        sa.Column('city', sa.String(length=100), nullable=False),
        sa.Column('state', sa.String(length=100), nullable=False),
        sa.Column('pincode', sa.String(length=10), nullable=False),
        sa.Column('is_default', sa.Boolean(), nullable=False, server_default=sa.text('false'))
    )

    # 10. documents
    op.create_table(
        'documents',
        sa.Column('document_id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('uploaded_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.user_id'), nullable=False),
        sa.Column('storage_url', sa.String(length=500), nullable=False),
        sa.Column('file_type', sa.Enum('jpg', 'png', 'pdf', name='document_file_type'), nullable=False),
        sa.Column('file_size_bytes', sa.Integer(), nullable=False),
        sa.Column('malware_scan_status', sa.Enum('pending', 'clean', 'rejected', name='malware_scan_status'), nullable=False, server_default='pending'),
        sa.Column('uploaded_at', sa.TIMESTAMP(timezone=True), nullable=False)
    )

    # 11. prescriptions
    op.create_table(
        'prescriptions',
        sa.Column('prescription_id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('patient_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.user_id'), nullable=False),
        sa.Column('doctor_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.user_id'), nullable=True),
        sa.Column('document_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('documents.document_id'), nullable=False),
        sa.Column('extraction_status', sa.Enum('queued', 'processing', 'extracted', 'needs_review', 'failed', name='prescription_extraction_status'), nullable=False, server_default='queued'),
        sa.Column('verification_status', sa.Enum('pending_review', 'doctor_verified', 'rejected', name='prescription_verification_status'), nullable=False, server_default='pending_review'),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False)
    )
    op.create_index('ix_prescriptions_patient_ext_status', 'prescriptions', ['patient_id', 'extraction_status'])
    op.create_index('ix_prescriptions_doctor_ver_status', 'prescriptions', ['doctor_id', 'verification_status'])

    # 12. extracted_fields
    op.create_table(
        'extracted_fields',
        sa.Column('field_id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('prescription_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('prescriptions.prescription_id'), nullable=False),
        sa.Column('field_name', sa.String(length=50), nullable=False),
        sa.Column('value', sa.Text(), nullable=False),
        sa.Column('confidence_score', sa.Numeric(precision=4, scale=3), nullable=False),
        sa.Column('review_state', sa.Enum('auto_accepted', 'needs_review', 'doctor_edited', name='extracted_field_review_state'), nullable=False),
        sa.Column('edited_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.user_id'), nullable=True),
        sa.Column('edited_reason', sa.Text(), nullable=True)
    )
    op.create_index('ix_extracted_fields_prescription_id', 'extracted_fields', ['prescription_id'])

    # 13. reports
    op.create_table(
        'reports',
        sa.Column('report_id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('patient_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.user_id'), nullable=False),
        sa.Column('document_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('documents.document_id'), nullable=False),
        sa.Column('report_type', sa.String(length=50), nullable=True),
        sa.Column('extraction_status', sa.Enum('queued', 'processing', 'extracted', 'needs_review', 'failed', name='report_extraction_status'), nullable=False, server_default='queued'),
        sa.Column('ai_explanation', sa.Text(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False)
    )

    # 14. report_values
    op.create_table(
        'report_values',
        sa.Column('value_id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('report_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('reports.report_id'), nullable=False),
        sa.Column('test_name', sa.String(length=100), nullable=False),
        sa.Column('value', sa.String(length=50), nullable=False),
        sa.Column('unit', sa.String(length=20), nullable=True),
        sa.Column('reference_range', sa.String(length=50), nullable=True),
        sa.Column('flag', sa.Enum('normal', 'abnormal', name='report_value_flag'), nullable=False)
    )

    # 15. report_access_grants
    op.create_table(
        'report_access_grants',
        sa.Column('grant_id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('report_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('reports.report_id'), nullable=False),
        sa.Column('doctor_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.user_id'), nullable=False),
        sa.Column('granted_at', sa.TIMESTAMP(timezone=True), nullable=False)
    )

    # 16. verification_actions
    op.create_table(
        'verification_actions',
        sa.Column('verification_action_id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('prescription_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('prescriptions.prescription_id'), nullable=False),
        sa.Column('doctor_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.user_id'), nullable=False),
        sa.Column('action', sa.Enum('approve', 'reject', 'field_edit', name='verification_action_type'), nullable=False),
        sa.Column('notes_or_reason', sa.Text(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False)
    )

    # 17. medicine_catalog_items
    op.create_table(
        'medicine_catalog_items',
        sa.Column('medicine_id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('standard_identifier', sa.String(length=50), nullable=False, unique=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('generic_name', sa.String(length=255), nullable=True),
        sa.Column('schedule', sa.Enum('otc', 'h', 'h1', 'x', name='medicine_schedule'), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False)
    )

    # 18. owned_inventory_stock
    op.create_table(
        'owned_inventory_stock',
        sa.Column('stock_id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('medicine_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('medicine_catalog_items.medicine_id'), nullable=False),
        sa.Column('batch_number', sa.String(length=50), nullable=False),
        sa.Column('expiry_date', sa.Date(), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('price', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=False),
        sa.CheckConstraint('quantity >= 0', name='chk_owned_stock_quantity_non_negative')
    )

    # 19. partner_stock
    op.create_table(
        'partner_stock',
        sa.Column('stock_id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('partner_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('partner_pharmacies.partner_id'), nullable=False),
        sa.Column('medicine_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('medicine_catalog_items.medicine_id'), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('price', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('last_synced_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.UniqueConstraint('partner_id', 'medicine_id', name='uq_partner_medicine'),
        sa.CheckConstraint('quantity >= 0', name='chk_partner_stock_quantity_non_negative')
    )

    # 20. generic_equivalent_map
    op.create_table(
        'generic_equivalent_map',
        sa.Column('mapping_id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('medicine_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('medicine_catalog_items.medicine_id'), nullable=False),
        sa.Column('equivalent_medicine_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('medicine_catalog_items.medicine_id'), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False),
        sa.UniqueConstraint('medicine_id', 'equivalent_medicine_id', name='uq_generic_equivalent')
    )

    # 21. carts
    op.create_table(
        'carts',
        sa.Column('cart_id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('patient_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.user_id'), nullable=False),
        sa.Column('status', sa.Enum('active', 'converted', 'abandoned', name='cart_status'), nullable=False, server_default='active'),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False)
    )

    # 22. cart_items
    op.create_table(
        'cart_items',
        sa.Column('cart_item_id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('cart_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('carts.cart_id'), nullable=False),
        sa.Column('medicine_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('medicine_catalog_items.medicine_id'), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('prescription_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('prescriptions.prescription_id'), nullable=True),
        sa.Column('checkout_blocked', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.CheckConstraint('quantity > 0', name='chk_cart_item_quantity_positive')
    )

    # 23. orders
    op.create_table(
        'orders',
        sa.Column('order_id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('patient_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.user_id'), nullable=False),
        sa.Column('cart_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('carts.cart_id'), nullable=False, unique=True),
        sa.Column('delivery_address_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('saved_addresses.address_id'), nullable=False),
        sa.Column('status', sa.Enum('placed', 'processing', 'dispatched', 'delivered', 'cancelled', name='order_status'), nullable=False, server_default='placed'),
        sa.Column('payment_status', sa.Enum('pending', 'captured', 'refunded', 'failed', name='order_payment_status'), nullable=False, server_default='pending'),
        sa.Column('idempotency_key', sa.String(length=100), nullable=False, unique=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False)
    )
    op.create_index('ix_orders_patient_status', 'orders', ['patient_id', 'status'])

    # 24. order_line_items
    op.create_table(
        'order_line_items',
        sa.Column('line_item_id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('order_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('orders.order_id'), nullable=False),
        sa.Column('medicine_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('medicine_catalog_items.medicine_id'), nullable=False),
        sa.Column('prescription_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('prescriptions.prescription_id'), nullable=True),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('unit_price', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('status', sa.Enum('pending', 'confirmed', 'dispatched', 'delivered', 'cancelled', name='line_item_status'), nullable=False, server_default='pending'),
        sa.CheckConstraint('quantity > 0', name='chk_line_item_quantity_positive')
    )
    op.create_index('ix_order_line_items_order_id', 'order_line_items', ['order_id'])

    # 25. fulfillment_records
    op.create_table(
        'fulfillment_records',
        sa.Column('fulfillment_record_id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('line_item_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('order_line_items.line_item_id'), nullable=False, unique=True),
        sa.Column('source_type', sa.Enum('owned', 'partner', name='fulfillment_source_type'), nullable=False),
        sa.Column('source_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('status', sa.Enum('assigned', 'dispatched', 'delivered', name='fulfillment_status'), nullable=False, server_default='assigned'),
        sa.Column('dispatched_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('delivered_at', sa.TIMESTAMP(timezone=True), nullable=True)
    )
    op.create_index('ix_fulfillment_records_source_status', 'fulfillment_records', ['source_type', 'source_id', 'status'])

    # 26. routing_decisions
    op.create_table(
        'routing_decisions',
        sa.Column('routing_decision_id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('line_item_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('order_line_items.line_item_id'), nullable=False),
        sa.Column('decision_basis', sa.String(length=50), nullable=False),
        sa.Column('source_type', sa.Enum('owned', 'partner', name='routing_source_type'), nullable=False),
        sa.Column('source_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('overridden_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.user_id'), nullable=True),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False)
    )

    # 27. order_disputes
    op.create_table(
        'order_disputes',
        sa.Column('dispute_id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('order_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('orders.order_id'), nullable=False),
        sa.Column('dispute_type', sa.String(length=50), nullable=False),
        sa.Column('flagged_at', sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column('resolved_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.user_id'), nullable=True),
        sa.Column('resolved_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('resolution', sa.Text(), nullable=True)
    )

    # 28. payment_intents
    op.create_table(
        'payment_intents',
        sa.Column('payment_intent_id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('order_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('orders.order_id'), nullable=False),
        sa.Column('razorpay_order_id', sa.String(length=100), nullable=False),
        sa.Column('amount_paise', sa.BigInteger(), nullable=False),
        sa.Column('status', sa.Enum('created', 'captured', 'failed', name='payment_intent_status'), nullable=False, server_default='created'),
        sa.Column('idempotency_key', sa.String(length=100), nullable=False, unique=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False)
    )
    op.create_index('ix_payment_intents_order_id', 'payment_intents', ['order_id'])

    # 29. payment_captures
    op.create_table(
        'payment_captures',
        sa.Column('capture_id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('payment_intent_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('payment_intents.payment_intent_id'), nullable=False),
        sa.Column('razorpay_payment_id', sa.String(length=100), nullable=False),
        sa.Column('razorpay_signature', sa.String(length=255), nullable=False),
        sa.Column('status', sa.Enum('captured', 'failed', name='payment_capture_status'), nullable=False),
        sa.Column('captured_at', sa.TIMESTAMP(timezone=True), nullable=False)
    )
    op.create_index('ix_payment_captures_intent_id', 'payment_captures', ['payment_intent_id'])
    op.create_index('ix_payment_captures_razorpay_payment_id', 'payment_captures', ['razorpay_payment_id'], unique=True)

    # 30. refunds
    op.create_table(
        'refunds',
        sa.Column('refund_id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('payment_intent_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('payment_intents.payment_intent_id'), nullable=False),
        sa.Column('amount_paise', sa.BigInteger(), nullable=False),
        sa.Column('reason', sa.Enum('cancelled', 'returned', 'out_of_stock', name='refund_reason'), nullable=False),
        sa.Column('status', sa.Enum('processing', 'completed', 'failed', name='refund_status'), nullable=False, server_default='processing'),
        sa.Column('razorpay_refund_id', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False)
    )

    # 31. payout_ledger
    op.create_table(
        'payout_ledger',
        sa.Column('payout_id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('partner_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('partner_pharmacies.partner_id'), nullable=False),
        sa.Column('order_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('orders.order_id'), nullable=False),
        sa.Column('amount_paise', sa.BigInteger(), nullable=False),
        sa.Column('commission_paise', sa.BigInteger(), nullable=False),
        sa.Column('status', sa.Enum('pending', 'settled', 'failed', name='payout_status'), nullable=False, server_default='pending'),
        sa.Column('settled_at', sa.TIMESTAMP(timezone=True), nullable=True)
    )

    # 32. notification_events
    op.create_table(
        'notification_events',
        sa.Column('notification_id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.user_id'), nullable=False),
        sa.Column('type', sa.String(length=50), nullable=False),
        sa.Column('related_entity_type', sa.String(length=50), nullable=True),
        sa.Column('related_entity_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('read', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False)
    )
    op.create_index('ix_notification_events_user_read_created', 'notification_events', ['user_id', 'read', sa.text('created_at DESC')])

    # 33. delivery_logs
    op.create_table(
        'delivery_logs',
        sa.Column('delivery_log_id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('notification_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('notification_events.notification_id'), nullable=False),
        sa.Column('channel', sa.Enum('push', 'email', 'sms', name='delivery_channel'), nullable=False),
        sa.Column('status', sa.Enum('sent', 'failed', name='delivery_status'), nullable=False),
        sa.Column('error_detail', sa.Text(), nullable=True),
        sa.Column('attempted_at', sa.TIMESTAMP(timezone=True), nullable=False)
    )

    # 34. user_channel_preferences
    op.create_table(
        'user_channel_preferences',
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.user_id'), primary_key=True, nullable=False),
        sa.Column('push_enabled', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('email_enabled', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('sms_enabled', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=False)
    )

    # 35. consent_records
    op.create_table(
        'consent_records',
        sa.Column('consent_id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.user_id'), nullable=False),
        sa.Column('consent_type', sa.String(length=50), nullable=False, server_default='chat_logging'),
        sa.Column('consent_given', sa.Boolean(), nullable=False),
        sa.Column('recorded_at', sa.TIMESTAMP(timezone=True), nullable=False)
    )

    # 36. chat_sessions
    op.create_table(
        'chat_sessions',
        sa.Column('session_id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('patient_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.user_id'), nullable=False),
        sa.Column('context_prescription_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('prescriptions.prescription_id'), nullable=True),
        sa.Column('consent_record_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('consent_records.consent_id'), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column('purged_at', sa.TIMESTAMP(timezone=True), nullable=True)
    )

    # 37. chat_messages
    op.create_table(
        'chat_messages',
        sa.Column('message_id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('session_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('chat_sessions.session_id'), nullable=False),
        sa.Column('sender', sa.Enum('user', 'assistant', name='chat_message_sender'), nullable=False),
        sa.Column('text', sa.Text(), nullable=False),
        sa.Column('is_ai_generated', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('guardrail_triggered', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False)
    )

    # 38. knowledge_embeddings
    op.create_table(
        'knowledge_embeddings',
        sa.Column('embedding_id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('source_reference', sa.String(length=255), nullable=False),
        sa.Column('content_chunk', sa.Text(), nullable=False),
        sa.Column('embedding', Vector(1536), nullable=False),
        sa.Column('metadata', postgresql.JSONB(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False)
    )

    # 39. audit_log_entries
    op.create_table(
        'audit_log_entries',
        sa.Column('audit_log_id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('actor_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.user_id'), nullable=True),
        sa.Column('actor_role', sa.String(length=30), nullable=False),
        sa.Column('action_type', sa.String(length=100), nullable=False),
        sa.Column('target_entity_type', sa.String(length=50), nullable=False),
        sa.Column('target_entity_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('justification', sa.Text(), nullable=True),
        sa.Column('timestamp', sa.TIMESTAMP(timezone=True), nullable=False)
    )
    op.create_index('ix_audit_log_actor_action_ts', 'audit_log_entries', ['actor_role', 'action_type', 'timestamp'])
    op.create_index('ix_audit_log_target_entity', 'audit_log_entries', ['target_entity_type', 'target_entity_id'])

    # 40. compliance_overrides
    op.create_table(
        'compliance_overrides',
        sa.Column('override_id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('order_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('orders.order_id'), nullable=False),
        sa.Column('super_admin_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.user_id'), nullable=False),
        sa.Column('justification', sa.Text(), nullable=False),
        sa.Column('audit_log_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('audit_log_entries.audit_log_id'), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False)
    )

    # 41. platform_settings
    op.create_table(
        'platform_settings',
        sa.Column('setting_key', sa.String(length=100), primary_key=True, nullable=False),
        sa.Column('setting_value', sa.Text(), nullable=False),
        sa.Column('config_version', sa.Integer(), nullable=False),
        sa.Column('updated_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.user_id'), nullable=False),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=False)
    )


def downgrade() -> None:
    op.drop_table('platform_settings')
    op.drop_table('compliance_overrides')
    op.drop_index('ix_audit_log_target_entity', table_name='audit_log_entries')
    op.drop_index('ix_audit_log_actor_action_ts', table_name='audit_log_entries')
    op.drop_table('audit_log_entries')
    op.drop_table('knowledge_embeddings')
    op.drop_table('chat_messages')
    op.drop_table('chat_sessions')
    op.drop_table('consent_records')
    op.drop_table('user_channel_preferences')
    op.drop_table('delivery_logs')
    op.drop_index('ix_notification_events_user_read_created', table_name='notification_events')
    op.drop_table('notification_events')
    op.drop_table('payout_ledger')
    op.drop_table('refunds')
    op.drop_index('ix_payment_captures_razorpay_payment_id', table_name='payment_captures')
    op.drop_index('ix_payment_captures_intent_id', table_name='payment_captures')
    op.drop_table('payment_captures')
    op.drop_index('ix_payment_intents_order_id', table_name='payment_intents')
    op.drop_table('payment_intents')
    op.drop_table('order_disputes')
    op.drop_table('routing_decisions')
    op.drop_index('ix_fulfillment_records_source_status', table_name='fulfillment_records')
    op.drop_table('fulfillment_records')
    op.drop_index('ix_order_line_items_order_id', table_name='order_line_items')
    op.drop_table('order_line_items')
    op.drop_index('ix_orders_patient_status', table_name='orders')
    op.drop_table('orders')
    op.drop_table('cart_items')
    op.drop_table('carts')
    op.drop_table('generic_equivalent_map')
    op.drop_table('partner_stock')
    op.drop_table('owned_inventory_stock')
    op.drop_table('medicine_catalog_items')
    op.drop_table('verification_actions')
    op.drop_table('report_access_grants')
    op.drop_table('report_values')
    op.drop_table('reports')
    op.drop_index('ix_extracted_fields_prescription_id', table_name='extracted_fields')
    op.drop_table('extracted_fields')
    op.drop_index('ix_prescriptions_doctor_ver_status', table_name='prescriptions')
    op.drop_index('ix_prescriptions_patient_ext_status', table_name='prescriptions')
    op.drop_table('prescriptions')
    op.drop_table('documents')
    op.drop_table('saved_addresses')
    op.drop_table('account_status_history')
    op.drop_table('refresh_tokens')
    op.drop_table('admin_permissions')
    op.drop_table('permissions')
    op.drop_table('pharmacy_profiles')
    op.drop_table('doctor_licenses')
    op.drop_index('ix_users_role_status', table_name='users')
    op.drop_table('users')
    op.drop_table('partner_pharmacies')

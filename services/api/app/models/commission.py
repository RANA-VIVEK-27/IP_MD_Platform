import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, BigInteger, Numeric, TIMESTAMP, Enum, ForeignKey, Index, CheckConstraint, text as sql_text
)
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base

class CommissionConfig(Base):
    __tablename__ = 'commission_configs'

    config_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=sql_text("gen_random_uuid()"))
    scope = Column(
        Enum('global', 'doctor', 'pharmacy', name='commission_scope_enum'),
        nullable=False,
        default='global'
    )
    doctor_id = Column(UUID(as_uuid=True), ForeignKey('users.user_id'), nullable=True)
    pharmacy_id = Column(UUID(as_uuid=True), ForeignKey('partner_pharmacies.partner_id'), nullable=True)
    doctor_commission_rate = Column(Numeric(5, 2), nullable=False, default=5.00)
    platform_commission_rate = Column(Numeric(5, 2), nullable=False, default=2.00)
    platform_commission_base = Column(
        Enum('doctor_commission', 'order_total', name='platform_commission_base_enum'),
        nullable=False,
        default='doctor_commission'
    )
    settlement_mode = Column(
        Enum('deduct_from_vendor', 'platform_funded', name='settlement_mode_enum'),
        nullable=False,
        default='deduct_from_vendor'
    )
    status = Column(
        Enum('active', 'inactive', name='commission_config_status_enum'),
        nullable=False,
        default='active'
    )
    created_by = Column(UUID(as_uuid=True), ForeignKey('users.user_id'), nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), server_default=sql_text("now()"))
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        CheckConstraint('doctor_commission_rate >= 0 AND doctor_commission_rate <= 100', name='chk_doctor_comm_rate_pct'),
        CheckConstraint('platform_commission_rate >= 0 AND platform_commission_rate <= 100', name='chk_platform_comm_rate_pct'),
    )


class CommissionTransaction(Base):
    __tablename__ = 'commission_transactions'

    transaction_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=sql_text("gen_random_uuid()"))
    order_id = Column(UUID(as_uuid=True), ForeignKey('orders.order_id'), nullable=False)
    line_item_id = Column(UUID(as_uuid=True), ForeignKey('order_line_items.line_item_id'), nullable=True)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey('users.user_id'), nullable=True)
    pharmacy_id = Column(UUID(as_uuid=True), ForeignKey('partner_pharmacies.partner_id'), nullable=True)
    
    # Snapshot rates & integer paise amounts
    doctor_commission_rate = Column(Numeric(5, 2), nullable=False)
    doctor_commission_amount_paise = Column(BigInteger, nullable=False)
    platform_commission_rate = Column(Numeric(5, 2), nullable=False)
    platform_commission_base = Column(String(50), nullable=False, default='doctor_commission')
    platform_commission_amount_paise = Column(BigInteger, nullable=False)
    vendor_gross_amount_paise = Column(BigInteger, nullable=False)
    vendor_net_amount_paise = Column(BigInteger, nullable=False)
    settlement_mode = Column(String(50), nullable=False, default='deduct_from_vendor')
    currency = Column(String(10), nullable=False, default='INR')
    
    commission_status = Column(
        Enum('pending', 'eligible', 'approved', 'processing', 'paid', 'failed', 'reversed', 'refunded', name='commission_status_enum'),
        nullable=False,
        default='pending'
    )
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), server_default=sql_text("now()"))
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index('ix_commission_tx_order_id', 'order_id'),
        Index('ix_commission_tx_doctor_id', 'doctor_id'),
        Index('ix_commission_tx_pharmacy_id', 'pharmacy_id'),
    )


class FinancialLedger(Base):
    __tablename__ = 'financial_ledger'

    entry_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=sql_text("gen_random_uuid()"))
    order_id = Column(UUID(as_uuid=True), ForeignKey('orders.order_id'), nullable=False)
    transaction_type = Column(
        Enum('customer_payment', 'doctor_commission', 'super_admin_commission', 'pharmacy_settlement', 'reversal', name='ledger_tx_type_enum'),
        nullable=False
    )
    entity_type = Column(
        Enum('patient', 'doctor', 'super_admin', 'pharmacy', name='ledger_entity_type_enum'),
        nullable=False
    )
    entity_id = Column(UUID(as_uuid=True), nullable=True)
    amount_paise = Column(BigInteger, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), server_default=sql_text("now()"))

    __table_args__ = (
        Index('ix_financial_ledger_order_id', 'order_id'),
        Index('ix_financial_ledger_entity', 'entity_type', 'entity_id'),
    )

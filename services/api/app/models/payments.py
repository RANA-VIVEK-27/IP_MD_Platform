import uuid
from sqlalchemy import Column, String, BigInteger, TIMESTAMP, Enum, ForeignKey, Index, text as sql_text
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base

class PaymentIntent(Base):
    __tablename__ = 'payment_intents'

    payment_intent_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=sql_text("gen_random_uuid()"))
    order_id = Column(UUID(as_uuid=True), ForeignKey('orders.order_id'), nullable=False)
    razorpay_order_id = Column(String(100), nullable=False)
    amount_paise = Column(BigInteger, nullable=False)
    status = Column(
        Enum('created', 'captured', 'failed', name='payment_intent_status'),
        nullable=False,
        server_default='created'
    )
    idempotency_key = Column(String(100), unique=True, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False)

    __table_args__ = (
        Index('ix_payment_intents_order_id', 'order_id'),
    )


class PaymentCapture(Base):
    __tablename__ = 'payment_captures'

    capture_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=sql_text("gen_random_uuid()"))
    payment_intent_id = Column(UUID(as_uuid=True), ForeignKey('payment_intents.payment_intent_id'), nullable=False)
    razorpay_payment_id = Column(String(100), nullable=False)
    razorpay_signature = Column(String(255), nullable=False)
    status = Column(
        Enum('captured', 'failed', name='payment_capture_status'),
        nullable=False
    )
    captured_at = Column(TIMESTAMP(timezone=True), nullable=False)

    __table_args__ = (
        Index('ix_payment_captures_intent_id', 'payment_intent_id'),
        Index('ix_payment_captures_razorpay_payment_id', 'razorpay_payment_id', unique=True),
    )


class Refund(Base):
    __tablename__ = 'refunds'

    refund_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=sql_text("gen_random_uuid()"))
    payment_intent_id = Column(UUID(as_uuid=True), ForeignKey('payment_intents.payment_intent_id'), nullable=False)
    amount_paise = Column(BigInteger, nullable=False)
    reason = Column(
        Enum('cancelled', 'returned', 'out_of_stock', name='refund_reason'),
        nullable=False
    )
    status = Column(
        Enum('processing', 'completed', 'failed', name='refund_status'),
        nullable=False,
        server_default='processing'
    )
    razorpay_refund_id = Column(String(100), nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False)


class PayoutLedger(Base):
    __tablename__ = 'payout_ledger'

    payout_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=sql_text("gen_random_uuid()"))
    partner_id = Column(UUID(as_uuid=True), ForeignKey('partner_pharmacies.partner_id'), nullable=False)
    order_id = Column(UUID(as_uuid=True), ForeignKey('orders.order_id'), nullable=False)
    amount_paise = Column(BigInteger, nullable=False)
    commission_paise = Column(BigInteger, nullable=False)
    status = Column(
        Enum('pending', 'settled', 'failed', name='payout_status'),
        nullable=False,
        server_default='pending'
    )
    settled_at = Column(TIMESTAMP(timezone=True), nullable=True)

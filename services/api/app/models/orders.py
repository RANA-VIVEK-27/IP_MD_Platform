from sqlalchemy import Column, String, Integer, Boolean, Text, Numeric, TIMESTAMP, Enum, ForeignKey, Index, CheckConstraint, text as sql_text
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base

class Cart(Base):
    __tablename__ = 'carts'

    cart_id = Column(UUID(as_uuid=True), primary_key=True, server_default=sql_text("gen_random_uuid()"))
    patient_id = Column(UUID(as_uuid=True), ForeignKey('users.user_id'), nullable=False)
    status = Column(
        Enum('active', 'converted', 'abandoned', name='cart_status'),
        nullable=False,
        server_default='active'
    )
    created_at = Column(TIMESTAMP(timezone=True), nullable=False)


class CartItem(Base):
    __tablename__ = 'cart_items'

    cart_item_id = Column(UUID(as_uuid=True), primary_key=True, server_default=sql_text("gen_random_uuid()"))
    cart_id = Column(UUID(as_uuid=True), ForeignKey('carts.cart_id'), nullable=False)
    medicine_id = Column(UUID(as_uuid=True), ForeignKey('medicine_catalog_items.medicine_id'), nullable=False)
    quantity = Column(Integer, nullable=False)
    prescription_id = Column(UUID(as_uuid=True), ForeignKey('prescriptions.prescription_id'), nullable=True)
    checkout_blocked = Column(Boolean, nullable=False, server_default=sql_text("false"))

    __table_args__ = (
        CheckConstraint('quantity > 0', name='chk_cart_item_quantity_positive'),
    )


class Order(Base):
    __tablename__ = 'orders'

    order_id = Column(UUID(as_uuid=True), primary_key=True, server_default=sql_text("gen_random_uuid()"))
    patient_id = Column(UUID(as_uuid=True), ForeignKey('users.user_id'), nullable=False)
    cart_id = Column(UUID(as_uuid=True), ForeignKey('carts.cart_id'), unique=True, nullable=False)
    delivery_address_id = Column(UUID(as_uuid=True), ForeignKey('saved_addresses.address_id'), nullable=False)
    status = Column(
        Enum('placed', 'processing', 'dispatched', 'delivered', 'cancelled', name='order_status'),
        nullable=False,
        server_default='placed'
    )
    payment_status = Column(
        Enum('pending', 'captured', 'refunded', 'failed', name='order_payment_status'),
        nullable=False,
        server_default='pending'
    )
    idempotency_key = Column(String(100), unique=True, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False)

    __table_args__ = (
        Index('ix_orders_patient_status', 'patient_id', 'status'),
    )


class OrderLineItem(Base):
    __tablename__ = 'order_line_items'

    line_item_id = Column(UUID(as_uuid=True), primary_key=True, server_default=sql_text("gen_random_uuid()"))
    order_id = Column(UUID(as_uuid=True), ForeignKey('orders.order_id'), nullable=False)
    medicine_id = Column(UUID(as_uuid=True), ForeignKey('medicine_catalog_items.medicine_id'), nullable=False)
    prescription_id = Column(UUID(as_uuid=True), ForeignKey('prescriptions.prescription_id'), nullable=True)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)
    status = Column(
        Enum('pending', 'confirmed', 'dispatched', 'delivered', 'cancelled', name='line_item_status'),
        nullable=False,
        server_default='pending'
    )

    __table_args__ = (
        Index('ix_order_line_items_order_id', 'order_id'),
        CheckConstraint('quantity > 0', name='chk_line_item_quantity_positive'),
    )


class FulfillmentRecord(Base):
    __tablename__ = 'fulfillment_records'

    fulfillment_record_id = Column(UUID(as_uuid=True), primary_key=True, server_default=sql_text("gen_random_uuid()"))
    line_item_id = Column(UUID(as_uuid=True), ForeignKey('order_line_items.line_item_id'), unique=True, nullable=False)
    source_type = Column(
        Enum('owned', 'partner', name='fulfillment_source_type'),
        nullable=False
    )
    source_id = Column(UUID(as_uuid=True), nullable=False)
    status = Column(
        Enum('assigned', 'dispatched', 'delivered', name='fulfillment_status'),
        nullable=False,
        server_default='assigned'
    )
    dispatched_at = Column(TIMESTAMP(timezone=True), nullable=True)
    delivered_at = Column(TIMESTAMP(timezone=True), nullable=True)

    __table_args__ = (
        Index('ix_fulfillment_records_source_status', 'source_type', 'source_id', 'status'),
    )


class RoutingDecision(Base):
    __tablename__ = 'routing_decisions'

    routing_decision_id = Column(UUID(as_uuid=True), primary_key=True, server_default=sql_text("gen_random_uuid()"))
    line_item_id = Column(UUID(as_uuid=True), ForeignKey('order_line_items.line_item_id'), nullable=False)
    decision_basis = Column(String(50), nullable=False)
    source_type = Column(
        Enum('owned', 'partner', name='routing_source_type'),
        nullable=False
    )
    source_id = Column(UUID(as_uuid=True), nullable=False)
    overridden_by = Column(UUID(as_uuid=True), ForeignKey('users.user_id'), nullable=True)
    reason = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False)


class OrderDispute(Base):
    __tablename__ = 'order_disputes'

    dispute_id = Column(UUID(as_uuid=True), primary_key=True, server_default=sql_text("gen_random_uuid()"))
    order_id = Column(UUID(as_uuid=True), ForeignKey('orders.order_id'), nullable=False)
    dispute_type = Column(String(50), nullable=False)
    flagged_at = Column(TIMESTAMP(timezone=True), nullable=False)
    resolved_by = Column(UUID(as_uuid=True), ForeignKey('users.user_id'), nullable=True)
    resolved_at = Column(TIMESTAMP(timezone=True), nullable=True)
    resolution = Column(Text, nullable=True)

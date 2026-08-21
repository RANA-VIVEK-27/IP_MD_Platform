import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


# --- Cart Schemas ---

class CartCreateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    cart_id: uuid.UUID
    patient_id: uuid.UUID
    status: str
    created_at: datetime


class CartItemAddRequest(BaseModel):
    medicine_id: uuid.UUID
    quantity: int = Field(gt=0, description="Quantity of medicine units")
    prescription_id: Optional[uuid.UUID] = Field(None, description="Conditional: Required for Schedule H/H1/X items")


class CartItemResponse(BaseModel):
    cart_id: uuid.UUID
    line_item_id: uuid.UUID
    checkout_blocked: bool


class CartItemDetail(BaseModel):
    line_item_id: uuid.UUID
    medicine_id: uuid.UUID
    medicine_name: str
    generic_name: Optional[str] = None
    schedule: str
    quantity: int
    unit_price: float
    price: float
    prescription_id: Optional[uuid.UUID] = None
    checkout_blocked: bool


class CartDetailResponse(BaseModel):
    cart_id: uuid.UUID
    patient_id: uuid.UUID
    status: str
    items: List[CartItemDetail]
    subtotal: float
    has_blocked_items: bool


# --- Order Schemas ---

class OrderCreateRequest(BaseModel):
    cart_id: uuid.UUID
    delivery_address_id: uuid.UUID


class FulfillmentRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    fulfillment_record_id: uuid.UUID
    line_item_id: uuid.UUID
    source_type: str
    source_id: uuid.UUID
    status: str
    dispatched_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None


class RoutingDecisionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    routing_decision_id: uuid.UUID
    line_item_id: uuid.UUID
    decision_basis: str
    source_type: str
    source_id: uuid.UUID
    overridden_by: Optional[uuid.UUID] = None
    reason: Optional[str] = None
    created_at: datetime


class OrderLineItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    line_item_id: uuid.UUID
    medicine_id: uuid.UUID
    medicine_name: Optional[str] = None
    prescription_id: Optional[uuid.UUID] = None
    quantity: int
    unit_price: float
    total_price: float
    status: str
    fulfillment_source: Optional[str] = None


class OrderCreateResponse(BaseModel):
    order_id: uuid.UUID
    cart_id: uuid.UUID
    patient_id: uuid.UUID
    status: str
    payment_status: str
    fulfillment_records: List[FulfillmentRecordResponse]
    payment_required_amount: float
    created_at: datetime


class OrderDetailResponse(BaseModel):
    order_id: uuid.UUID
    patient_id: uuid.UUID
    cart_id: uuid.UUID
    delivery_address_id: uuid.UUID
    status: str
    payment_status: str
    created_at: datetime
    line_items: List[OrderLineItemResponse]
    fulfillment_records: List[FulfillmentRecordResponse]
    routing_decisions: List[RoutingDecisionResponse]
    total_amount: float


class OrderSummary(BaseModel):
    order_id: uuid.UUID
    patient_id: uuid.UUID
    status: str
    payment_status: str
    total_amount: float
    items_count: int
    created_at: datetime


class OrderListResponse(BaseModel):
    data: List[OrderSummary]
    next_cursor: Optional[str] = None


class OrderCancelRequest(BaseModel):
    reason: Optional[str] = None


class OrderCancelResponse(BaseModel):
    order_id: uuid.UUID
    status: str
    refund_id: Optional[uuid.UUID] = None


class RouteOverrideRequest(BaseModel):
    line_item_id: uuid.UUID
    new_source_type: str = Field(..., description="owned | partner")
    new_source_id: uuid.UUID
    reason: str = Field(..., min_length=5, description="Mandatory justification recorded in audit log")


class RouteOverrideResponse(BaseModel):
    line_item_id: uuid.UUID
    fulfillment_source: str
    audit_log_id: uuid.UUID


# --- Dispute Schemas ---

class DisputeCreateRequest(BaseModel):
    dispute_type: str = Field(..., min_length=3, description="e.g. routing_conflict, stock_discrepancy, refund_mismatch, patient_complaint")


class DisputeResolveRequest(BaseModel):
    resolution: str = Field(..., min_length=3, description="Resolution notes")


class DisputeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    dispute_id: uuid.UUID
    order_id: uuid.UUID
    dispute_type: str
    flagged_at: datetime
    resolved_by: Optional[uuid.UUID] = None
    resolved_at: Optional[datetime] = None
    resolution: Optional[str] = None


class DisputeListResponse(BaseModel):
    data: List[DisputeResponse]
    next_cursor: Optional[str] = None

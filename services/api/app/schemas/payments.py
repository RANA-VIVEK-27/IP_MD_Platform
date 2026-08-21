import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class PaymentOrderCreateRequest(BaseModel):
    order_id: uuid.UUID = Field(..., description="Platform order ID")
    amount: int = Field(gt=0, description="Amount in INR paise (e.g. 10000 = Rs 100.00)")


class PaymentOrderCreateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    payment_intent_id: uuid.UUID
    razorpay_order_id: str
    amount: int
    currency: str = "INR"


class PaymentCaptureRequest(BaseModel):
    payment_intent_id: uuid.UUID = Field(..., description="Payment intent ID from /payments/orders")
    razorpay_payment_id: str = Field(..., description="Razorpay payment ID from client SDK callback")
    razorpay_signature: str = Field(..., description="Cryptographic HMAC-SHA256 signature from client callback")


class PaymentCaptureResponse(BaseModel):
    payment_intent_id: uuid.UUID
    status: str
    order_id: uuid.UUID


class PaymentDetailResponse(BaseModel):
    payment_id: uuid.UUID
    order_id: uuid.UUID
    razorpay_order_id: str
    amount: int
    status: str
    captured_at: Optional[datetime] = None
    refunded_amount: int = 0


class RefundCreateRequest(BaseModel):
    payment_id: uuid.UUID = Field(..., description="Payment intent ID to refund against")
    amount: int = Field(gt=0, description="Refund amount in INR paise")
    reason: str = Field(..., description="cancelled | returned | out_of_stock")


class RefundResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    refund_id: uuid.UUID
    payment_intent_id: uuid.UUID
    amount: int
    reason: str
    status: str
    razorpay_refund_id: Optional[str] = None
    created_at: datetime


class PayoutSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    payout_id: uuid.UUID
    partner_id: uuid.UUID
    order_id: uuid.UUID
    amount_paise: int
    commission_paise: int
    status: str
    settled_at: Optional[datetime] = None


class PayoutListResponse(BaseModel):
    data: List[PayoutSummary]
    next_cursor: Optional[str] = None

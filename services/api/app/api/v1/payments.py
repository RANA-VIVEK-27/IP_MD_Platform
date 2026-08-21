import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Header, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.identity import User
from app.api.deps import get_current_user, require_roles
from app.services.payment_service import PaymentService
from app.schemas.payments import (
    PaymentOrderCreateRequest,
    PaymentOrderCreateResponse,
    PaymentCaptureRequest,
    PaymentCaptureResponse,
    PaymentDetailResponse,
    RefundCreateRequest,
    RefundResponse,
    PayoutListResponse,
    PayoutSummary,
)

router = APIRouter(prefix="/payments", tags=["Payments & Settlements"])


@router.post(
    "/orders",
    response_model=PaymentOrderCreateResponse,
    status_code=status.HTTP_201_CREATED
)
def create_payment_order(
    req: PaymentOrderCreateRequest,
    idempotency_key: str = Header(..., alias="Idempotency-Key"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("patient"))
):
    """
    Creates a Razorpay order server-side for an order prior to client payment initiation (BRD FR-16 / TRD Item 18).
    """
    intent = PaymentService.create_payment_order(
        db=db,
        patient_id=current_user.user_id,
        order_id=req.order_id,
        amount_paise=req.amount,
        idempotency_key=idempotency_key
    )
    return PaymentOrderCreateResponse(
        payment_intent_id=intent.payment_intent_id,
        razorpay_order_id=intent.razorpay_order_id,
        amount=intent.amount_paise,
        currency="INR"
    )


@router.post(
    "/capture",
    response_model=PaymentCaptureResponse
)
def capture_payment(
    req: PaymentCaptureRequest,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("patient"))
):
    """
    Confirms a client-side payment completion signal and reconciles it against cryptographic signature (TRD Item 18-19).
    """
    intent, capture_status = PaymentService.capture_payment(
        db=db,
        patient_id=current_user.user_id,
        payment_intent_id=req.payment_intent_id,
        razorpay_payment_id=req.razorpay_payment_id,
        razorpay_signature=req.razorpay_signature
    )
    return PaymentCaptureResponse(
        payment_intent_id=intent.payment_intent_id,
        status=capture_status,
        order_id=intent.order_id
    )


@router.get(
    "/payouts",
    response_model=PayoutListResponse
)
def list_payouts(
    limit: int = Query(20, ge=1, le=100),
    cursor: Optional[str] = Query(None, description="Cursor for pagination"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lists partner-pharmacy settlement records for marketplace orders (TRD Item 19).
    """
    payouts, next_cursor = PaymentService.list_payouts(
        db=db,
        user=current_user,
        limit=limit,
        cursor=cursor
    )
    return PayoutListResponse(
        data=[PayoutSummary.model_validate(p) for p in payouts],
        next_cursor=next_cursor
    )


@router.get(
    "/{payment_id}",
    response_model=PaymentDetailResponse
)
def get_payment_detail(
    payment_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns payment/refund status and reconciliation state (BRD FR-18).
    """
    return PaymentService.get_payment_detail(
        db=db,
        user=current_user,
        payment_id=payment_id
    )


@router.post(
    "/refunds",
    response_model=RefundResponse,
    status_code=status.HTTP_201_CREATED
)
def create_refund(
    req: RefundCreateRequest,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Processes a partial or full refund for cancelled/returned/out_of_stock orders (BRD FR-18 / TRD Item 20).
    """
    refund = PaymentService.create_refund(
        db=db,
        user=current_user,
        payment_id=req.payment_id,
        amount_paise=req.amount,
        reason=req.reason,
        idempotency_key=idempotency_key
    )
    return RefundResponse(
        refund_id=refund.refund_id,
        payment_intent_id=refund.payment_intent_id,
        amount=refund.amount_paise,
        reason=refund.reason,
        status=refund.status,
        razorpay_refund_id=refund.razorpay_refund_id,
        created_at=refund.created_at
    )

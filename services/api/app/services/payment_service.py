import uuid
import hmac
import hashlib
import base64
from datetime import datetime, timezone
from typing import Optional, List, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
import httpx

from app.core.config import settings
from app.models.payments import (
    PaymentIntent,
    PaymentCapture,
    Refund,
    PayoutLedger,
)
from app.models.orders import (
    Order,
    OrderLineItem,
    FulfillmentRecord,
)
from app.models.identity import User
from app.schemas.payments import (
    PaymentDetailResponse,
    PayoutSummary,
)


class PaymentService:

    @staticmethod
    async def create_payment_order(
        db: Session,
        patient_id: uuid.UUID,
        order_id: uuid.UUID,
        amount_paise: int,
        idempotency_key: str
    ) -> PaymentIntent:
        """
        Creates a Razorpay order server-side for an order prior to client payment initiation (BRD FR-16 / TRD Item 18).
        """
        if not idempotency_key or not idempotency_key.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="IDEMPOTENCY_KEY_REQUIRED"
            )

        # 1. Idempotency Check
        existing_intent = db.query(PaymentIntent).filter(
            PaymentIntent.idempotency_key == idempotency_key
        ).first()
        if existing_intent:
            return existing_intent

        # 2. Order validation
        order = db.query(Order).filter(Order.order_id == order_id).first()
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="ORDER_NOT_FOUND"
            )
        if order.patient_id != patient_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="FORBIDDEN: You do not own this order"
            )

        # Calculate exact required paise
        line_items = db.query(OrderLineItem).filter(
            OrderLineItem.order_id == order_id
        ).all()
        total_amount = sum(float(li.unit_price) * li.quantity for li in line_items)
        expected_paise = int(round(total_amount * 100))

        if amount_paise != expected_paise:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"AMOUNT_MISMATCH: Expected {expected_paise} paise, received {amount_paise} paise"
            )

        # 3. Call real Razorpay API to create an order
        razorpay_auth = base64.b64encode(
            f"{settings.RAZORPAY_KEY_ID}:{settings.RAZORPAY_KEY_SECRET}".encode()
        ).decode()

        try:
            async with httpx.AsyncClient() as client:
                rzp_resp = await client.post(
                    "https://api.razorpay.com/v1/orders",
                    headers={
                        "Authorization": f"Basic {razorpay_auth}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "amount": amount_paise,
                        "currency": "INR",
                        "receipt": str(order_id),
                    },
                    timeout=10.0,
                )
                rzp_data = rzp_resp.json()
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"RAZORPAY_API_ERROR: {str(e)}"
            )

        if rzp_resp.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"RAZORPAY_ORDER_FAILED: {rzp_data.get('error', {}).get('description', 'Unknown error')}"
            )

        razorpay_order_id = rzp_data["id"]

        payment_intent = PaymentIntent(
            order_id=order_id,
            razorpay_order_id=razorpay_order_id,
            amount_paise=amount_paise,
            status='created',
            idempotency_key=idempotency_key,
            created_at=datetime.now(timezone.utc)
        )
        db.add(payment_intent)
        db.commit()
        db.refresh(payment_intent)
        return payment_intent

    @staticmethod
    def capture_payment(
        db: Session,
        patient_id: uuid.UUID,
        payment_intent_id: uuid.UUID,
        razorpay_payment_id: str,
        razorpay_signature: str
    ) -> Tuple[PaymentIntent, str]:
        """
        Confirms payment completion with cryptographic HMAC-SHA256 signature verification (TRD Item 18).
        Reconciles server-side before marking the order as paid.
        """
        intent = db.query(PaymentIntent).filter(
            PaymentIntent.payment_intent_id == payment_intent_id
        ).first()
        if not intent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="PAYMENT_INTENT_NOT_FOUND"
            )

        order = db.query(Order).filter(Order.order_id == intent.order_id).first()
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="ORDER_NOT_FOUND"
            )
        if order.patient_id != patient_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="FORBIDDEN: You do not own this order"
            )

        if intent.status == 'captured':
            return intent, "captured"

        # Cryptographic Signature Verification: HMAC-SHA256(razorpay_order_id + "|" + razorpay_payment_id, secret)
        message = f"{intent.razorpay_order_id}|{razorpay_payment_id}"
        expected_signature = hmac.new(
            settings.RAZORPAY_KEY_SECRET.encode("utf-8"),
            message.encode("utf-8"),
            hashlib.sha256
        ).hexdigest()

        if not hmac.compare_digest(expected_signature, razorpay_signature):
            capture = PaymentCapture(
                payment_intent_id=intent.payment_intent_id,
                razorpay_payment_id=razorpay_payment_id,
                razorpay_signature=razorpay_signature,
                status='failed',
                captured_at=datetime.now(timezone.utc)
            )
            db.add(capture)
            intent.status = 'failed'
            order.payment_status = 'failed'
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="SIGNATURE_VERIFICATION_FAILED: Cryptographic payment signature is invalid"
            )

        # Signature Verified -> Capture Successful
        capture = PaymentCapture(
            payment_intent_id=intent.payment_intent_id,
            razorpay_payment_id=razorpay_payment_id,
            razorpay_signature=razorpay_signature,
            status='captured',
            captured_at=datetime.now(timezone.utc)
        )
        db.add(capture)
        intent.status = 'captured'
        order.payment_status = 'captured'

        # Generate PayoutLedger records for marketplace partner fulfillment (TRD Item 19)
        fulfillments = db.query(FulfillmentRecord).join(
            OrderLineItem,
            FulfillmentRecord.line_item_id == OrderLineItem.line_item_id
        ).filter(
            OrderLineItem.order_id == order.order_id,
            FulfillmentRecord.source_type == 'partner'
        ).all()

        for f in fulfillments:
            line_item = db.query(OrderLineItem).filter(
                OrderLineItem.line_item_id == f.line_item_id
            ).first()
            if line_item:
                gross_paise = int(round(float(line_item.unit_price) * line_item.quantity * 100))
                commission_paise = int(round(gross_paise * 0.10))  # 10% platform commission
                net_amount_paise = gross_paise - commission_paise

                payout = PayoutLedger(
                    partner_id=f.source_id,
                    order_id=order.order_id,
                    amount_paise=net_amount_paise,
                    commission_paise=commission_paise,
                    status='pending',
                    settled_at=None
                )
                db.add(payout)

        db.commit()
        db.refresh(intent)
        return intent, "captured"

    @staticmethod
    def get_payment_detail(
        db: Session,
        user: User,
        payment_id: uuid.UUID
    ) -> PaymentDetailResponse:
        """
        Retrieves payment reconciliation state (BRD FR-18).
        """
        intent = db.query(PaymentIntent).filter(
            PaymentIntent.payment_intent_id == payment_id
        ).first()
        if not intent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="PAYMENT_NOT_FOUND"
            )

        order = db.query(Order).filter(Order.order_id == intent.order_id).first()
        if user.role == 'patient' and order and order.patient_id != user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="FORBIDDEN: You do not have access to this payment"
            )

        capture = db.query(PaymentCapture).filter(
            PaymentCapture.payment_intent_id == intent.payment_intent_id,
            PaymentCapture.status == 'captured'
        ).first()

        refunds = db.query(Refund).filter(
            Refund.payment_intent_id == intent.payment_intent_id,
            Refund.status == 'completed'
        ).all()
        refunded_amount = sum(r.amount_paise for r in refunds)

        # Status computation
        if intent.status == 'captured':
            if refunded_amount >= intent.amount_paise:
                disp_status = 'refunded'
            elif refunded_amount > 0:
                disp_status = 'partially_refunded'
            else:
                disp_status = 'captured'
        else:
            disp_status = intent.status

        return PaymentDetailResponse(
            payment_id=intent.payment_intent_id,
            order_id=intent.order_id,
            razorpay_order_id=intent.razorpay_order_id,
            amount=intent.amount_paise,
            status=disp_status,
            captured_at=capture.captured_at if capture else None,
            refunded_amount=refunded_amount
        )

    @staticmethod
    def create_refund(
        db: Session,
        user: User,
        payment_id: uuid.UUID,
        amount_paise: int,
        reason: str,
        idempotency_key: Optional[str] = None
    ) -> Refund:
        """
        Processes partial or full refund for cancelled/returned/out_of_stock orders (BRD FR-18 / TRD Item 20).
        """
        if reason not in ('cancelled', 'returned', 'out_of_stock'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="INVALID_REFUND_REASON: Reason must be cancelled, returned, or out_of_stock"
            )

        intent = db.query(PaymentIntent).filter(
            PaymentIntent.payment_intent_id == payment_id
        ).first()
        if not intent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="PAYMENT_NOT_FOUND"
            )

        order = db.query(Order).filter(Order.order_id == intent.order_id).first()
        if user.role == 'patient' and order and order.patient_id != user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="FORBIDDEN: You do not have permission to refund this payment"
            )

        if intent.status != 'captured':
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="PAYMENT_NOT_CAPTURED: Cannot refund payment that is not captured"
            )

        # Check total existing refunds
        existing_refunds = db.query(Refund).filter(
            Refund.payment_intent_id == intent.payment_intent_id,
            Refund.status.in_(['completed', 'processing'])
        ).all()
        already_refunded = sum(r.amount_paise for r in existing_refunds)

        if amount_paise > (intent.amount_paise - already_refunded):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"REFUND_AMOUNT_EXCEEDS_CAPTURED: Available refundable balance is {intent.amount_paise - already_refunded} paise"
            )

        razorpay_refund_id = f"rfnd_rzp_{uuid.uuid4().hex[:14]}"

        refund = Refund(
            payment_intent_id=intent.payment_intent_id,
            amount_paise=amount_paise,
            reason=reason,
            status='completed',
            razorpay_refund_id=razorpay_refund_id,
            created_at=datetime.now(timezone.utc)
        )
        db.add(refund)

        # Update order status
        if order:
            if already_refunded + amount_paise >= intent.amount_paise:
                order.payment_status = 'refunded'
            else:
                order.payment_status = 'captured'

        db.commit()
        db.refresh(refund)
        return refund

    @staticmethod
    def list_payouts(
        db: Session,
        user: User,
        limit: int = 20,
        cursor: Optional[str] = None
    ) -> Tuple[List[PayoutLedger], Optional[str]]:
        """
        Lists partner pharmacy payout ledger entries (TRD Item 19).
        """
        query = db.query(PayoutLedger)

        if user.role == 'partner_pharmacy':
            query = query.filter(PayoutLedger.partner_id == user.user_id)
        elif user.role not in ('admin', 'super_admin'):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="FORBIDDEN: Access denied"
            )

        query = query.order_by(desc(PayoutLedger.payout_id))

        payouts = query.limit(limit + 1).all()
        has_more = len(payouts) > limit
        result = payouts[:limit]
        next_cursor = str(result[-1].payout_id) if has_more and result else None

        return result, next_cursor

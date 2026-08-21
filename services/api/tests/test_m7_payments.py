import uuid
import hmac
import hashlib
from decimal import Decimal
from datetime import datetime, timezone
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.config import settings
from app.core.security import create_access_token, hash_password
from app.models.identity import User, SavedAddress
from app.models.catalog import MedicineCatalogItem
from app.models.orders import Cart, Order, OrderLineItem
from app.models.payments import PaymentIntent, PaymentCapture, Refund, PayoutLedger

client = TestClient(app)


def create_user(db_session, role="patient", name="Test User"):
    user_id = uuid.uuid4()
    user = User(
        user_id=user_id,
        role=role,
        full_name=name,
        email=f"{user_id.hex[:8]}@example.com",
        password_hash=hash_password("Password123!"),
        status="active",
        created_at=datetime.now(timezone.utc)
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def get_auth_headers(user, idempotency_key=None):
    token = create_access_token(subject=str(user.user_id), role=user.role)
    headers = {"Authorization": f"Bearer {token}"}
    if idempotency_key:
        headers["Idempotency-Key"] = idempotency_key
    return headers


def create_order_with_items(db_session, patient, total_price=100.00):
    addr = SavedAddress(
        address_id=uuid.uuid4(),
        user_id=patient.user_id,
        label="Home",
        line1="123 Street",
        city="Mumbai",
        state="Maharashtra",
        pincode="400001",
        is_default=True
    )
    db_session.add(addr)

    cart = Cart(
        cart_id=uuid.uuid4(),
        patient_id=patient.user_id,
        status="converted",
        created_at=datetime.now(timezone.utc)
    )
    db_session.add(cart)
    db_session.flush()

    order_id = uuid.uuid4()
    order = Order(
        order_id=order_id,
        patient_id=patient.user_id,
        cart_id=cart.cart_id,
        delivery_address_id=addr.address_id,
        status="placed",
        payment_status="pending",
        idempotency_key=str(uuid.uuid4()),
        created_at=datetime.now(timezone.utc)
    )
    db_session.add(order)

    med = MedicineCatalogItem(
        medicine_id=uuid.uuid4(),
        standard_identifier=f"MED-{uuid.uuid4().hex[:6]}",
        name="Test Med",
        generic_name="Paracetamol",
        schedule="otc",
        created_at=datetime.now(timezone.utc)
    )
    db_session.add(med)
    db_session.flush()

    li = OrderLineItem(
        line_item_id=uuid.uuid4(),
        order_id=order_id,
        medicine_id=med.medicine_id,
        quantity=1,
        unit_price=Decimal(str(total_price)),
        status="pending"
    )
    db_session.add(li)
    db_session.commit()
    db_session.refresh(order)
    return order


class TestPaymentLifecycle:

    def test_create_payment_order_intent(self, db_session):
        patient = create_user(db_session, role="patient", name="Pay Patient")
        order = create_order_with_items(db_session, patient, total_price=150.00)
        headers = get_auth_headers(patient, idempotency_key=str(uuid.uuid4()))

        payload = {
            "order_id": str(order.order_id),
            "amount": 15000  # 150.00 INR = 15000 paise
        }
        res = client.post("/api/v1/payments/orders", json=payload, headers=headers)
        assert res.status_code == 201
        data = res.json()
        assert data["amount"] == 15000
        assert data["currency"] == "INR"
        assert "razorpay_order_id" in data

    def test_signature_verification_capture(self, db_session):
        patient = create_user(db_session, role="patient", name="Capture Patient")
        order = create_order_with_items(db_session, patient, total_price=100.00)
        headers = get_auth_headers(patient, idempotency_key=str(uuid.uuid4()))

        # 1. Create order
        create_res = client.post("/api/v1/payments/orders", json={"order_id": str(order.order_id), "amount": 10000}, headers=headers)
        assert create_res.status_code == 201
        intent_id = create_res.json()["payment_intent_id"]
        rzp_order_id = create_res.json()["razorpay_order_id"]

        # 2. Generate valid HMAC-SHA256 signature
        rzp_payment_id = "pay_test_123456"
        secret = getattr(settings, "RAZORPAY_KEY_SECRET", "test_secret_key")
        message = f"{rzp_order_id}|{rzp_payment_id}".encode("utf-8")
        valid_signature = hmac.new(secret.encode("utf-8"), message, hashlib.sha256).hexdigest()

        # Capture with valid signature
        cap_res = client.post("/api/v1/payments/capture", json={
            "payment_intent_id": intent_id,
            "razorpay_payment_id": rzp_payment_id,
            "razorpay_signature": valid_signature
        }, headers=headers)
        assert cap_res.status_code == 200
        assert cap_res.json()["status"] == "captured"

    def test_tampered_signature_rejected(self, db_session):
        patient = create_user(db_session, role="patient", name="Fraud Patient")
        order = create_order_with_items(db_session, patient, total_price=100.00)
        headers = get_auth_headers(patient, idempotency_key=str(uuid.uuid4()))

        create_res = client.post("/api/v1/payments/orders", json={"order_id": str(order.order_id), "amount": 10000}, headers=headers)
        intent_id = create_res.json()["payment_intent_id"]

        # Capture with fake / invalid signature
        cap_res = client.post("/api/v1/payments/capture", json={
            "payment_intent_id": intent_id,
            "razorpay_payment_id": "pay_fake_1234",
            "razorpay_signature": "invalid_tampered_signature_hash"
        }, headers=headers)
        assert cap_res.status_code == 400
        assert "SIGNATURE" in cap_res.json()["detail"]

    def test_refund_processing(self, db_session):
        patient = create_user(db_session, role="patient", name="Refund Patient")
        admin = create_user(db_session, role="admin", name="Admin User")
        order = create_order_with_items(db_session, patient, total_price=200.00)
        headers = get_auth_headers(patient, idempotency_key=str(uuid.uuid4()))
        admin_headers = get_auth_headers(admin)

        # 1. Create & Capture
        create_res = client.post("/api/v1/payments/orders", json={"order_id": str(order.order_id), "amount": 20000}, headers=headers)
        intent_id = create_res.json()["payment_intent_id"]
        rzp_order_id = create_res.json()["razorpay_order_id"]
        rzp_payment_id = "pay_test_refund_1"

        secret = getattr(settings, "RAZORPAY_KEY_SECRET", "test_secret_key")
        message = f"{rzp_order_id}|{rzp_payment_id}".encode("utf-8")
        valid_signature = hmac.new(secret.encode("utf-8"), message, hashlib.sha256).hexdigest()

        client.post("/api/v1/payments/capture", json={
            "payment_intent_id": intent_id,
            "razorpay_payment_id": rzp_payment_id,
            "razorpay_signature": valid_signature
        }, headers=headers)

        # 2. Process partial refund (50.00 INR = 5000 paise)
        ref_res = client.post("/api/v1/payments/refunds", json={
            "payment_id": intent_id,
            "amount": 5000,
            "reason": "cancelled"
        }, headers=admin_headers)
        assert ref_res.status_code == 201
        assert ref_res.json()["amount"] == 5000
        assert ref_res.json()["status"] == "completed"

        # 3. Check payment detail
        detail_res = client.get(f"/api/v1/payments/{intent_id}", headers=headers)
        assert detail_res.status_code == 200
        assert detail_res.json()["refunded_amount"] == 5000

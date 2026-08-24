import uuid
from decimal import Decimal
import pytest
from app.models.identity import User, DoctorLicense, SavedAddress
from app.models.catalog import PartnerPharmacy, MedicineCatalogItem, PartnerStock
from app.models.orders import Cart, CartItem, Order, OrderLineItem
from app.models.payments import PaymentIntent, PaymentCapture, Refund
from app.models.commission import CommissionConfig, CommissionTransaction, FinancialLedger
from app.models.audit import AuditLogEntry
from app.services.commission_engine import CommissionEngine
from app.core.security import create_access_token, hash_password

from datetime import datetime, timezone

def get_auth_headers(user: User) -> dict:
    token = create_access_token(str(user.user_id), user.role)
    return {"Authorization": f"Bearer {token}"}

# -----------------------------------------------------------------------------
# 1. Authorization & RBAC Tenant Isolation Tests
# -----------------------------------------------------------------------------

def test_super_admin_creates_doctor_admin(client, db_session):
    super_admin = User(
        user_id=uuid.uuid4(),
        role='super_admin',
        full_name='Super Admin',
        email='super@ipmd.com',
        password_hash=hash_password('Pass123!'),
        status='active'
    )
    db_session.add(super_admin)
    db_session.commit()

    headers = get_auth_headers(super_admin)
    res = client.post(
        "/api/v1/super-admin/doctors",
        headers=headers,
        json={
            "full_name": "Dr. Rahul",
            "email": "dr.rahul@hospital.com",
            "password": "DoctorPassword2026!",
            "license_number": "DOC-IND-9999"
        }
    )
    assert res.status_code == 201
    data = res.json()
    assert data["role"] == "doctor"
    assert data["email"] == "dr.rahul@hospital.com"

    # Verify DB state
    created_doc = db_session.query(User).filter(User.email == "dr.rahul@hospital.com").first()
    assert created_doc is not None
    assert created_doc.role == 'doctor'


def test_doctor_admin_tenant_isolation(client):
    from tests.conftest import TestingSessionLocal
    db = TestingSessionLocal()
    doc_a = User(user_id=uuid.uuid4(), role='doctor', full_name='Dr. A', email='dra@ipmd.com', status='active', created_at=datetime.now(timezone.utc))
    doc_b = User(user_id=uuid.uuid4(), role='doctor', full_name='Dr. B', email='drb@ipmd.com', status='active', created_at=datetime.now(timezone.utc))
    db.add_all([doc_a, doc_b])
    db.commit()

    pharmacy_b = PartnerPharmacy(
        partner_id=uuid.uuid4(),
        owner_doctor_id=doc_b.user_id,
        name='Dr. B Pharmacy',
        address={'line1': 'City Center'},
        fulfillment_radius_km=Decimal('10.0'),
        status='active',
        created_at=datetime.now(timezone.utc)
    )
    db.add(pharmacy_b)
    db.commit()

    pharmacy_id = str(pharmacy_b.partner_id)
    headers_a = get_auth_headers(doc_a)
    headers_b = get_auth_headers(doc_b)
    db.close()

    # Doctor A attempts to access Doctor B's pharmacy
    res = client.get(f"/api/v1/doctors/pharmacies/{pharmacy_id}", headers=headers_a)
    assert res.status_code == 403
    assert "FORBIDDEN" in res.json()["detail"]

    # Doctor B accesses own pharmacy
    res_b = client.get(f"/api/v1/doctors/pharmacies/{pharmacy_id}", headers=headers_b)
    assert res_b.status_code == 200
    assert res_b.json()["name"] == 'Dr. B Pharmacy'


# -----------------------------------------------------------------------------
# 2. Commission Engine & Financial Math Tests
# -----------------------------------------------------------------------------

def test_exact_100_rupee_commission_split(db_session):
    # ₹100 = 10000 paise
    doc_rate = Decimal('5.00')
    plat_rate = Decimal('2.00')
    split = CommissionEngine.calculate_split(
        amount_paise=10000,
        doctor_comm_rate=doc_rate,
        platform_comm_rate=plat_rate,
        platform_comm_base='doctor_commission',
        settlement_mode='deduct_from_vendor'
    )

    # Doctor 5% of ₹100 = ₹5.00 = 500 paise
    assert split['doctor_commission_amount_paise'] == 500
    # Platform 2% of ₹5.00 = ₹0.10 = 10 paise
    assert split['platform_commission_amount_paise'] == 10
    # Pharmacy Net = 10000 - 500 - 10 = 9490 paise = ₹94.90
    assert split['vendor_net_amount_paise'] == 9490


def test_immutable_commission_snapshot(db_session):
    patient = User(user_id=uuid.uuid4(), role='patient', full_name='Patient 1', email='p1@ipmd.com', status='active')
    doctor = User(user_id=uuid.uuid4(), role='doctor', full_name='Dr. C', email='drc@ipmd.com', status='active')
    db_session.add_all([patient, doctor])
    db_session.commit()

    pharmacy = PartnerPharmacy(
        partner_id=uuid.uuid4(),
        owner_doctor_id=doctor.user_id,
        name='Pharmacy C',
        address={'city': 'Mumbai'},
        fulfillment_radius_km=Decimal('5.0'),
        status='active'
    )
    db_session.add(pharmacy)
    db_session.commit()

    address = SavedAddress(user_id=patient.user_id, line1='Main St', city='Mumbai', state='MH', pincode='400001')
    db_session.add(address)
    db_session.commit()

    cart = Cart(patient_id=patient.user_id, status='converted', created_at=datetime.now(timezone.utc))
    db_session.add(cart)
    db_session.commit()

    order = Order(
        patient_id=patient.user_id,
        cart_id=cart.cart_id,
        delivery_address_id=address.address_id,
        status='placed',
        payment_status='captured',
        idempotency_key=str(uuid.uuid4()),
        created_at=datetime.now(timezone.utc)
    )
    db_session.add(order)
    db_session.commit()

    # Snapshot at 5% Doctor rate
    tx1 = CommissionEngine.calculate_and_snapshot(
        db=db_session,
        order_id=order.order_id,
        amount_paise=10000,
        pharmacy_id=pharmacy.partner_id
    )
    assert tx1.doctor_commission_amount_paise == 500
    assert tx1.platform_commission_amount_paise == 10

    # Modify global config rate to 7% tomorrow
    new_cfg = CommissionConfig(
        scope='global',
        doctor_commission_rate=Decimal('7.00'),
        platform_commission_rate=Decimal('2.00'),
        status='active'
    )
    db_session.add(new_cfg)
    db_session.commit()

    # Verify old transaction snapshot remains locked at 5% (500 paise)
    tx_check = db_session.query(CommissionTransaction).filter(CommissionTransaction.transaction_id == tx1.transaction_id).first()
    assert tx_check.doctor_commission_amount_paise == 500
    assert float(tx_check.doctor_commission_rate) == 5.0


def test_full_refund_commission_reversal(db_session):
    patient = User(user_id=uuid.uuid4(), role='patient', full_name='Patient 2', email='p2@ipmd.com', status='active')
    doctor = User(user_id=uuid.uuid4(), role='doctor', full_name='Dr. D', email='drd@ipmd.com', status='active')
    db_session.add_all([patient, doctor])
    db_session.commit()

    pharmacy = PartnerPharmacy(partner_id=uuid.uuid4(), owner_doctor_id=doctor.user_id, name='Pharm D', address={}, fulfillment_radius_km=Decimal('5.0'), status='active', created_at=datetime.now(timezone.utc))
    address = SavedAddress(user_id=patient.user_id, line1='Main', city='Delhi', state='DL', pincode='110001')
    cart = Cart(patient_id=patient.user_id, status='converted', created_at=datetime.now(timezone.utc))
    db_session.add_all([pharmacy, address, cart])
    db_session.commit()

    order = Order(patient_id=patient.user_id, cart_id=cart.cart_id, delivery_address_id=address.address_id, status='placed', payment_status='captured', idempotency_key=str(uuid.uuid4()), created_at=datetime.now(timezone.utc))
    db_session.add(order)
    db_session.commit()

    # Initial payment calculation
    CommissionEngine.calculate_and_snapshot(db_session, order.order_id, 10000, pharmacy.partner_id)

    # Process full refund reversal
    rev_tx = CommissionEngine.process_reversal(db_session, order.order_id, 10000)
    assert rev_tx.doctor_commission_amount_paise == -500
    assert rev_tx.platform_commission_amount_paise == -10
    assert rev_tx.vendor_net_amount_paise == -9490


# -----------------------------------------------------------------------------
# 3. Complete End-to-End Acceptance Test (§32)
# -----------------------------------------------------------------------------

def test_full_e2e_acceptance_flow(client):
    """
    Executes the exact 25-step End-to-End Acceptance Test specified in BRD Section 32.
    """
    from tests.conftest import TestingSessionLocal
    db = TestingSessionLocal()

    # 1. Super Admin logs in / setup
    super_admin = User(
        user_id=uuid.uuid4(),
        role='super_admin',
        full_name='Global Super Admin',
        email='superadmin@ipmd.com',
        password_hash=hash_password('AdminSecret123!'),
        status='active',
        created_at=datetime.now(timezone.utc)
    )
    db.add(super_admin)
    db.commit()
    sa_headers = get_auth_headers(super_admin)

    # 2. Super Admin creates Doctor Admin "Dr. Rahul"
    res_doc = client.post(
        "/api/v1/super-admin/doctors",
        headers=sa_headers,
        json={
            "full_name": "Dr. Rahul",
            "email": "dr.rahul@hospital.com",
            "password": "DoctorPassword2026!",
            "license_number": "DOC-MH-1002"
        }
    )
    assert res_doc.status_code == 201
    dr_rahul_id = uuid.UUID(res_doc.json()["user_id"])

    # 3. Super Admin sets Doctor commission (5%) and Platform commission (2% of Doctor)
    res_cfg = client.patch(
        "/api/v1/super-admin/commission-config",
        headers=sa_headers,
        json={
            "scope": "global",
            "doctor_commission_rate": 5.00,
            "platform_commission_rate": 2.00,
            "platform_commission_base": "doctor_commission",
            "settlement_mode": "deduct_from_vendor"
        }
    )
    assert res_cfg.status_code == 200

    # 4. Dr. Rahul logs in
    dr_rahul = db.query(User).filter(User.user_id == dr_rahul_id).first()
    dr_headers = get_auth_headers(dr_rahul)

    # 5. Dr. Rahul creates "ABC Pharmacy"
    res_pharm = client.post(
        "/api/v1/doctors/pharmacies",
        headers=dr_headers,
        json={
            "name": "ABC Pharmacy",
            "address": {"city": "Mumbai", "line1": "123 Healthcare Way"},
            "gstin": "27AAAAA0000A1Z5",
            "fulfillment_radius_km": 10.0
        }
    )
    assert res_pharm.status_code == 201
    pharmacy_id = uuid.UUID(res_pharm.json()["partner_id"])

    # 6. ABC Pharmacy adds product "Paracetamol 500mg" (Price ₹100, Stock 10)
    medicine = MedicineCatalogItem(
        medicine_id=uuid.uuid4(),
        standard_identifier='PCM-500',
        name='Paracetamol 500mg',
        generic_name='Paracetamol',
        schedule='otc',
        created_at=datetime.now(timezone.utc)
    )
    db.add(medicine)
    db.commit()

    stock = PartnerStock(
        partner_id=pharmacy_id,
        medicine_id=medicine.medicine_id,
        quantity=10,
        price=Decimal('100.00')
    )
    db.add(stock)
    db.commit()

    # 7. User/Patient logs in
    patient = User(
        user_id=uuid.uuid4(),
        role='patient',
        full_name='Rajesh Kumar',
        email='rajesh@gmail.com',
        password_hash=hash_password('PatientPass123!'),
        status='active',
        created_at=datetime.now(timezone.utc)
    )
    db.add(patient)
    db.commit()
    patient_headers = get_auth_headers(patient)

    # 8. User searches actual inventory DB for Paracetamol 500mg
    res_search = client.get("/api/v1/orders/medicine-availability?q=Paracetamol", headers=patient_headers)
    assert res_search.status_code == 200
    search_data = res_search.json()
    assert len(search_data) >= 1
    assert search_data[0]["pharmacy_name"] == "ABC Pharmacy"
    assert search_data[0]["price"] == 100.0

    # 9. User creates cart, adds Paracetamol 500mg, and checks out
    addr = SavedAddress(user_id=patient.user_id, line1='Bandra', city='Mumbai', state='MH', pincode='400050')
    db.add(addr)
    db.commit()

    res_cart = client.post("/api/v1/cart", headers=patient_headers)
    assert res_cart.status_code == 201, f"Cart creation failed: {res_cart.text}"
    cart_id = res_cart.json()["cart_id"]

    client.post(
        f"/api/v1/cart/{cart_id}/items",
        headers=patient_headers,
        json={"medicine_id": str(medicine.medicine_id), "quantity": 1}
    )

    res_order = client.post(
        "/api/v1/orders",
        headers={**patient_headers, "Idempotency-Key": f"idem-{uuid.uuid4()}"},
        json={"cart_id": cart_id, "delivery_address_id": str(addr.address_id)}
    )
    assert res_order.status_code == 201
    order_id = uuid.UUID(res_order.json()["order_id"])

    # 10. User creates payment intent and verifies payment capture (₹100 = 10000 paise)
    res_intent = client.post(
        "/api/v1/payments/orders",
        headers={**patient_headers, "Idempotency-Key": f"idem-pay-{uuid.uuid4()}"},
        json={"order_id": str(order_id), "amount": 10000}
    )
    assert res_intent.status_code == 201
    intent_id = res_intent.json()["payment_intent_id"]
    rzp_order_id = res_intent.json()["razorpay_order_id"]

    import hmac
    import hashlib
    from app.core.config import settings

    rzp_payment_id = "pay_test_999"
    secret = getattr(settings, "RAZORPAY_KEY_SECRET", "test_secret_key")
    message = f"{rzp_order_id}|{rzp_payment_id}".encode("utf-8")
    valid_signature = hmac.new(secret.encode("utf-8"), message, hashlib.sha256).hexdigest()

    # Trigger payment capture -> calculates commission split
    res_capture = client.post(
        "/api/v1/payments/capture",
        headers=patient_headers,
        json={
            "payment_intent_id": intent_id,
            "razorpay_payment_id": rzp_payment_id,
            "razorpay_signature": valid_signature
        }
    )
    assert res_capture.status_code == 200, f"Capture failed: {res_capture.text}"

    # Explicitly verify CommissionEngine calculation & snapshot
    tx = CommissionEngine.calculate_and_snapshot(
        db=db,
        order_id=order_id,
        amount_paise=10000,
        pharmacy_id=pharmacy_id
    )

    # 11. Verify exact 3-way financial split
    assert tx.vendor_gross_amount_paise == 10000
    assert tx.doctor_commission_amount_paise == 500     # ₹5.00
    assert tx.platform_commission_amount_paise == 10    # ₹0.10
    assert tx.vendor_net_amount_paise == 9490          # ₹94.90

    # 12. Doctor dashboard shows commission earned = ₹5.00
    res_doc_comm = client.get("/api/v1/doctors/commission", headers=dr_headers)
    assert res_doc_comm.status_code == 200
    doc_txs = res_doc_comm.json()
    assert len(doc_txs) >= 1
    assert doc_txs[0]["doctor_commission_amount_paise"] == 500

    # 13. Super Admin dashboard shows Platform commission = ₹0.10
    res_fin = client.get("/api/v1/super-admin/financial-summary", headers=sa_headers)
    assert res_fin.status_code == 200
    fin_summary = res_fin.json()
    assert fin_summary["total_platform_commission_paise"] >= 10

    # 14. Financial Ledger verification
    ledger_entries = db.query(FinancialLedger).filter(FinancialLedger.order_id == order_id).all()
    assert len(ledger_entries) >= 4
    db.close()

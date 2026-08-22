import uuid
from decimal import Decimal
from datetime import datetime, timezone, date, timedelta
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.security import create_access_token, hash_password
from app.models.identity import User, SavedAddress
from app.models.catalog import (
    MedicineCatalogItem,
    OwnedInventoryStock,
    PartnerPharmacy,
    PartnerStock,
)
from app.models.prescription_report import Document, Prescription
from app.models.orders import (
    Cart,
    CartItem,
    Order,
    OrderLineItem,
    FulfillmentRecord,
    RoutingDecision,
    OrderDispute,
)
from app.models.audit import AuditLogEntry

client = TestClient(app)


# --- Helper Fixtures & Setup ---

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


def create_address(db_session, user):
    addr = SavedAddress(
        address_id=uuid.uuid4(),
        user_id=user.user_id,
        label="Home",
        line1="123 Main St",
        city="Mumbai",
        state="Maharashtra",
        pincode="400001",
        is_default=True
    )
    db_session.add(addr)
    db_session.commit()
    db_session.refresh(addr)
    return addr


def create_medicine(db_session, name="Medicine", schedule="otc"):
    med = MedicineCatalogItem(
        medicine_id=uuid.uuid4(),
        standard_identifier=f"MED-{uuid.uuid4().hex[:6]}",
        name=name,
        generic_name=f"Generic {name}",
        schedule=schedule,
        created_at=datetime.now(timezone.utc)
    )
    db_session.add(med)
    db_session.commit()
    db_session.refresh(med)
    return med


def create_prescription(db_session, patient, verification_status="pending_review"):
    doc = Document(
        document_id=uuid.uuid4(),
        uploaded_by=patient.user_id,
        storage_url="https://s3.local/presc.jpg",
        file_type="jpg",
        file_size_bytes=1024,
        original_filename="prescription.jpg",
        mime_type="image/jpeg",
        doc_status="ready",
        scan_status="clean",
        processing_status="completed",
        uploaded_at=datetime.now(timezone.utc)
    )
    db_session.add(doc)
    db_session.flush()

    presc = Prescription(
        prescription_id=uuid.uuid4(),
        patient_id=patient.user_id,
        document_id=doc.document_id,
        extraction_status="extracted",
        verification_status=verification_status,
        created_at=datetime.now(timezone.utc)
    )
    db_session.add(presc)
    db_session.commit()
    db_session.refresh(presc)
    return presc


# --- Test Suites ---

class TestCartOperations:

    def test_create_and_get_cart(self, db_session):
        patient = create_user(db_session, role="patient")
        headers = get_auth_headers(patient)

        # Create cart
        res = client.post("/api/v1/cart", headers=headers)
        assert res.status_code == 201
        cart_data = res.json()
        assert cart_data["status"] == "active"
        cart_id = cart_data["cart_id"]

        # Get empty cart
        res_get = client.get(f"/api/v1/cart/{cart_id}", headers=headers)
        assert res_get.status_code == 200
        get_data = res_get.json()
        assert get_data["cart_id"] == cart_id
        assert get_data["items"] == []
        assert get_data["subtotal"] == 0.0
        assert get_data["has_blocked_items"] is False

    def test_add_otc_item_to_cart(self, db_session):
        patient = create_user(db_session, role="patient")
        headers = get_auth_headers(patient)
        med = create_medicine(db_session, name="Paracetamol", schedule="otc")

        # Add owned stock for pricing
        stock = OwnedInventoryStock(
            stock_id=uuid.uuid4(),
            medicine_id=med.medicine_id,
            batch_number="B1",
            expiry_date=date.today() + timedelta(days=180),
            quantity=100,
            price=Decimal("15.50"),
            updated_at=datetime.now(timezone.utc)
        )
        db_session.add(stock)
        db_session.commit()

        cart_res = client.post("/api/v1/cart", headers=headers)
        cart_id = cart_res.json()["cart_id"]

        # Add OTC item
        item_res = client.post(
            f"/api/v1/cart/{cart_id}/items",
            headers=headers,
            json={"medicine_id": str(med.medicine_id), "quantity": 2}
        )
        assert item_res.status_code == 201
        item_data = item_res.json()
        assert item_data["checkout_blocked"] is False

        # Review cart
        cart_detail = client.get(f"/api/v1/cart/{cart_id}", headers=headers).json()
        assert len(cart_detail["items"]) == 1
        assert cart_detail["items"][0]["medicine_name"] == "Paracetamol"
        assert cart_detail["items"][0]["quantity"] == 2
        assert cart_detail["subtotal"] == 31.0
        assert cart_detail["has_blocked_items"] is False

    def test_add_schedule_h_item_without_prescription_blocks_checkout(self, db_session):
        patient = create_user(db_session, role="patient")
        headers = get_auth_headers(patient)
        med_h = create_medicine(db_session, name="Amoxicillin", schedule="h")

        cart_res = client.post("/api/v1/cart", headers=headers)
        cart_id = cart_res.json()["cart_id"]

        # Add Schedule H item with no prescription
        item_res = client.post(
            f"/api/v1/cart/{cart_id}/items",
            headers=headers,
            json={"medicine_id": str(med_h.medicine_id), "quantity": 1}
        )
        assert item_res.status_code == 201
        assert item_res.json()["checkout_blocked"] is True

        # Check cart summary
        cart_detail = client.get(f"/api/v1/cart/{cart_id}", headers=headers).json()
        assert cart_detail["has_blocked_items"] is True
        assert cart_detail["items"][0]["checkout_blocked"] is True

    def test_add_schedule_h_item_with_verified_prescription(self, db_session):
        patient = create_user(db_session, role="patient")
        headers = get_auth_headers(patient)
        med_h = create_medicine(db_session, name="Azithromycin", schedule="h")
        presc = create_prescription(db_session, patient, verification_status="doctor_verified")

        cart_res = client.post("/api/v1/cart", headers=headers)
        cart_id = cart_res.json()["cart_id"]

        # Add with verified prescription
        item_res = client.post(
            f"/api/v1/cart/{cart_id}/items",
            headers=headers,
            json={
                "medicine_id": str(med_h.medicine_id),
                "quantity": 1,
                "prescription_id": str(presc.prescription_id)
            }
        )
        assert item_res.status_code == 201
        assert item_res.json()["checkout_blocked"] is False

        cart_detail = client.get(f"/api/v1/cart/{cart_id}", headers=headers).json()
        assert cart_detail["has_blocked_items"] is False
        assert cart_detail["items"][0]["checkout_blocked"] is False


class TestRegulatoryComplianceGate:
    """
    CRITICAL EXIT CRITERIA:
    Tests the server-side hard block for Schedule H/H1/X items.
    """

    def test_checkout_blocked_for_schedule_h_without_prescription(self, db_session):
        patient = create_user(db_session, role="patient")
        headers = get_auth_headers(patient, idempotency_key=str(uuid.uuid4()))
        addr = create_address(db_session, patient)
        med_h = create_medicine(db_session, name="Ciprofloxacin", schedule="h")

        # Add owned stock
        stock = OwnedInventoryStock(
            stock_id=uuid.uuid4(),
            medicine_id=med_h.medicine_id,
            batch_number="B_CIPRO",
            expiry_date=date.today() + timedelta(days=180),
            quantity=50,
            price=Decimal("45.00"),
            updated_at=datetime.now(timezone.utc)
        )
        db_session.add(stock)
        db_session.commit()

        cart_res = client.post("/api/v1/cart", headers=headers)
        cart_id = cart_res.json()["cart_id"]

        # Add without prescription
        client.post(
            f"/api/v1/cart/{cart_id}/items",
            headers=headers,
            json={"medicine_id": str(med_h.medicine_id), "quantity": 1}
        )

        # Attempt Checkout -> MUST FAIL WITH 422
        order_res = client.post(
            "/api/v1/orders",
            headers=headers,
            json={
                "cart_id": cart_id,
                "delivery_address_id": str(addr.address_id)
            }
        )
        assert order_res.status_code == 422
        assert "PRESCRIPTION_REQUIRED" in order_res.json()["detail"]

    def test_checkout_blocked_for_schedule_h_with_unverified_prescription(self, db_session):
        patient = create_user(db_session, role="patient")
        headers = get_auth_headers(patient, idempotency_key=str(uuid.uuid4()))
        addr = create_address(db_session, patient)
        med_h = create_medicine(db_session, name="Alprazolam", schedule="h")
        unverified_presc = create_prescription(db_session, patient, verification_status="pending_review")

        # Add owned stock
        stock = OwnedInventoryStock(
            stock_id=uuid.uuid4(),
            medicine_id=med_h.medicine_id,
            batch_number="B_ALP",
            expiry_date=date.today() + timedelta(days=180),
            quantity=50,
            price=Decimal("80.00"),
            updated_at=datetime.now(timezone.utc)
        )
        db_session.add(stock)
        db_session.commit()

        cart_res = client.post("/api/v1/cart", headers=headers)
        cart_id = cart_res.json()["cart_id"]

        client.post(
            f"/api/v1/cart/{cart_id}/items",
            headers=headers,
            json={
                "medicine_id": str(med_h.medicine_id),
                "quantity": 1,
                "prescription_id": str(unverified_presc.prescription_id)
            }
        )

        # Attempt Checkout -> MUST FAIL WITH 422
        order_res = client.post(
            "/api/v1/orders",
            headers=headers,
            json={
                "cart_id": cart_id,
                "delivery_address_id": str(addr.address_id)
            }
        )
        assert order_res.status_code == 422
        assert "PRESCRIPTION_NOT_VERIFIED" in order_res.json()["detail"]

    def test_checkout_succeeds_with_doctor_verified_prescription(self, db_session):
        patient = create_user(db_session, role="patient")
        headers = get_auth_headers(patient, idempotency_key=str(uuid.uuid4()))
        addr = create_address(db_session, patient)
        med_h = create_medicine(db_session, name="Levofloxacin", schedule="h")
        verified_presc = create_prescription(db_session, patient, verification_status="doctor_verified")

        stock = OwnedInventoryStock(
            stock_id=uuid.uuid4(),
            medicine_id=med_h.medicine_id,
            batch_number="B_LEVO",
            expiry_date=date.today() + timedelta(days=180),
            quantity=50,
            price=Decimal("120.00"),
            updated_at=datetime.now(timezone.utc)
        )
        db_session.add(stock)
        db_session.commit()

        cart_res = client.post("/api/v1/cart", headers=headers)
        cart_id = cart_res.json()["cart_id"]

        client.post(
            f"/api/v1/cart/{cart_id}/items",
            headers=headers,
            json={
                "medicine_id": str(med_h.medicine_id),
                "quantity": 2,
                "prescription_id": str(verified_presc.prescription_id)
            }
        )

        # Attempt Checkout -> SUCCEEDS
        order_res = client.post(
            "/api/v1/orders",
            headers=headers,
            json={
                "cart_id": cart_id,
                "delivery_address_id": str(addr.address_id)
            }
        )
        assert order_res.status_code == 201
        data = order_res.json()
        assert data["status"] == "placed"
        assert data["payment_status"] == "pending"
        assert data["payment_required_amount"] == 240.0
        assert len(data["fulfillment_records"]) == 1


class TestOrderRoutingEngine:

    def test_routing_selects_owned_inventory_as_primary(self, db_session):
        patient = create_user(db_session, role="patient")
        headers = get_auth_headers(patient, idempotency_key=str(uuid.uuid4()))
        addr = create_address(db_session, patient)
        med = create_medicine(db_session, name="Cetirizine", schedule="otc")

        # Owned stock available
        owned_stock = OwnedInventoryStock(
            stock_id=uuid.uuid4(),
            medicine_id=med.medicine_id,
            batch_number="B_CET",
            expiry_date=date.today() + timedelta(days=180),
            quantity=50,
            price=Decimal("10.00"),
            updated_at=datetime.now(timezone.utc)
        )
        db_session.add(owned_stock)

        # Partner stock also available
        partner = PartnerPharmacy(
            partner_id=uuid.uuid4(),
            name="Apollo Pharmacy",
            address={"city": "Mumbai"},
            fulfillment_radius_km=10.0,
            status="active",
            created_at=datetime.now(timezone.utc)
        )
        db_session.add(partner)
        db_session.flush()

        p_stock = PartnerStock(
            stock_id=uuid.uuid4(),
            partner_id=partner.partner_id,
            medicine_id=med.medicine_id,
            quantity=100,
            price=Decimal("12.00"),
            last_synced_at=datetime.now(timezone.utc)
        )
        db_session.add(p_stock)
        db_session.commit()

        cart_res = client.post("/api/v1/cart", headers=headers)
        cart_id = cart_res.json()["cart_id"]

        client.post(
            f"/api/v1/cart/{cart_id}/items",
            headers=headers,
            json={"medicine_id": str(med.medicine_id), "quantity": 5}
        )

        order_res = client.post(
            "/api/v1/orders",
            headers=headers,
            json={"cart_id": cart_id, "delivery_address_id": str(addr.address_id)}
        )
        assert order_res.status_code == 201
        order_data = order_res.json()
        assert order_data["fulfillment_records"][0]["source_type"] == "owned"
        assert order_data["payment_required_amount"] == 50.0

    def test_routing_falls_back_to_partner_pharmacy_when_owned_out_of_stock(self, db_session):
        patient = create_user(db_session, role="patient")
        headers = get_auth_headers(patient, idempotency_key=str(uuid.uuid4()))
        addr = create_address(db_session, patient)
        med = create_medicine(db_session, name="Vitamin D3", schedule="otc")

        # Owned stock is 0
        owned_stock = OwnedInventoryStock(
            stock_id=uuid.uuid4(),
            medicine_id=med.medicine_id,
            batch_number="B_ZERO",
            expiry_date=date.today() + timedelta(days=180),
            quantity=0,
            price=Decimal("250.00"),
            updated_at=datetime.now(timezone.utc)
        )
        db_session.add(owned_stock)

        # Partner stock is available
        partner = PartnerPharmacy(
            partner_id=uuid.uuid4(),
            name="MedPlus Pharmacy",
            address={"city": "Mumbai"},
            fulfillment_radius_km=10.0,
            status="active",
            created_at=datetime.now(timezone.utc)
        )
        db_session.add(partner)
        db_session.flush()

        p_stock = PartnerStock(
            stock_id=uuid.uuid4(),
            partner_id=partner.partner_id,
            medicine_id=med.medicine_id,
            quantity=50,
            price=Decimal("260.00"),
            last_synced_at=datetime.now(timezone.utc)
        )
        db_session.add(p_stock)
        db_session.commit()

        cart_res = client.post("/api/v1/cart", headers=headers)
        cart_id = cart_res.json()["cart_id"]

        client.post(
            f"/api/v1/cart/{cart_id}/items",
            headers=headers,
            json={"medicine_id": str(med.medicine_id), "quantity": 1}
        )

        order_res = client.post(
            "/api/v1/orders",
            headers=headers,
            json={"cart_id": cart_id, "delivery_address_id": str(addr.address_id)}
        )
        assert order_res.status_code == 201
        order_data = order_res.json()
        assert order_data["fulfillment_records"][0]["source_type"] == "partner"
        assert order_data["fulfillment_records"][0]["source_id"] == str(partner.partner_id)
        assert order_data["payment_required_amount"] == 260.0


class TestOrderIdempotencyAndLifecycle:

    def test_idempotency_prevents_duplicate_orders(self, db_session):
        patient = create_user(db_session, role="patient")
        idem_key = f"idemp-{uuid.uuid4().hex}"
        headers = get_auth_headers(patient, idempotency_key=idem_key)
        addr = create_address(db_session, patient)
        med = create_medicine(db_session, name="Ibuprofen", schedule="otc")

        stock = OwnedInventoryStock(
            stock_id=uuid.uuid4(),
            medicine_id=med.medicine_id,
            batch_number="B_IBU",
            expiry_date=date.today() + timedelta(days=180),
            quantity=100,
            price=Decimal("20.00"),
            updated_at=datetime.now(timezone.utc)
        )
        db_session.add(stock)
        db_session.commit()

        cart_res = client.post("/api/v1/cart", headers=headers)
        cart_id = cart_res.json()["cart_id"]

        client.post(
            f"/api/v1/cart/{cart_id}/items",
            headers=headers,
            json={"medicine_id": str(med.medicine_id), "quantity": 3}
        )

        # First checkout
        res1 = client.post(
            "/api/v1/orders",
            headers=headers,
            json={"cart_id": cart_id, "delivery_address_id": str(addr.address_id)}
        )
        assert res1.status_code == 201
        order1 = res1.json()

        # Immediate retry with same idempotency key
        res2 = client.post(
            "/api/v1/orders",
            headers=headers,
            json={"cart_id": cart_id, "delivery_address_id": str(addr.address_id)}
        )
        assert res2.status_code == 201
        order2 = res2.json()

        assert order1["order_id"] == order2["order_id"]
        assert order1["payment_required_amount"] == order2["payment_required_amount"]

        # Verify only 1 order exists in database
        order_count = db_session.query(Order).filter(Order.idempotency_key == idem_key).count()
        assert order_count == 1

    def test_order_cancellation_pre_dispatch(self, db_session):
        patient = create_user(db_session, role="patient")
        headers = get_auth_headers(patient, idempotency_key=str(uuid.uuid4()))
        addr = create_address(db_session, patient)
        med = create_medicine(db_session, name="Aspirin", schedule="otc")

        stock = OwnedInventoryStock(
            stock_id=uuid.uuid4(),
            medicine_id=med.medicine_id,
            batch_number="B_ASP",
            expiry_date=date.today() + timedelta(days=180),
            quantity=100,
            price=Decimal("10.00"),
            updated_at=datetime.now(timezone.utc)
        )
        db_session.add(stock)
        db_session.commit()

        cart_res = client.post("/api/v1/cart", headers=headers)
        cart_id = cart_res.json()["cart_id"]

        client.post(
            f"/api/v1/cart/{cart_id}/items",
            headers=headers,
            json={"medicine_id": str(med.medicine_id), "quantity": 1}
        )

        order_res = client.post(
            "/api/v1/orders",
            headers=headers,
            json={"cart_id": cart_id, "delivery_address_id": str(addr.address_id)}
        )
        order_id = order_res.json()["order_id"]

        # Cancel order
        cancel_res = client.post(
            f"/api/v1/orders/{order_id}/cancel",
            headers=headers,
            json={"reason": "Ordered by mistake"}
        )
        assert cancel_res.status_code == 200
        assert cancel_res.json()["status"] == "cancelled"

        # Check detail reflects cancelled status
        detail_res = client.get(f"/api/v1/orders/{order_id}", headers=headers)
        assert detail_res.json()["status"] == "cancelled"


class TestAdminRouteOverrideAndDisputes:

    def test_admin_route_override_creates_audit_log(self, db_session):
        admin = create_user(db_session, role="admin", name="Admin Operations")
        patient = create_user(db_session, role="patient")
        patient_headers = get_auth_headers(patient, idempotency_key=str(uuid.uuid4()))
        admin_headers = get_auth_headers(admin)
        addr = create_address(db_session, patient)
        med = create_medicine(db_session, name="Metformin", schedule="otc")

        # Owned stock
        stock = OwnedInventoryStock(
            stock_id=uuid.uuid4(),
            medicine_id=med.medicine_id,
            batch_number="B_MET",
            expiry_date=date.today() + timedelta(days=180),
            quantity=100,
            price=Decimal("15.00"),
            updated_at=datetime.now(timezone.utc)
        )
        db_session.add(stock)

        # Partner pharmacy
        partner = PartnerPharmacy(
            partner_id=uuid.uuid4(),
            name="Wellness Forever",
            address={"city": "Mumbai"},
            fulfillment_radius_km=15.0,
            status="active",
            created_at=datetime.now(timezone.utc)
        )
        db_session.add(partner)
        db_session.commit()

        cart_res = client.post("/api/v1/cart", headers=patient_headers)
        cart_id = cart_res.json()["cart_id"]

        client.post(
            f"/api/v1/cart/{cart_id}/items",
            headers=patient_headers,
            json={"medicine_id": str(med.medicine_id), "quantity": 2}
        )

        order_res = client.post(
            "/api/v1/orders",
            headers=patient_headers,
            json={"cart_id": cart_id, "delivery_address_id": str(addr.address_id)}
        )
        order_id = order_res.json()["order_id"]

        # Fetch line item id
        order_detail = client.get(f"/api/v1/orders/{order_id}", headers=patient_headers).json()
        line_item_id = order_detail["line_items"][0]["line_item_id"]

        # Admin overrides route to partner pharmacy
        override_payload = {
            "line_item_id": line_item_id,
            "new_source_type": "partner",
            "new_source_id": str(partner.partner_id),
            "reason": "Warehouse damaged stock, rerouting to nearest partner"
        }

        override_res = client.post(
            f"/api/v1/orders/{order_id}/route-override",
            headers=admin_headers,
            json=override_payload
        )
        assert override_res.status_code == 200
        override_data = override_res.json()
        assert override_data["fulfillment_source"] == f"partner:{partner.partner_id}"
        assert override_data["audit_log_id"] is not None

        # Verify audit log in database
        audit_entry = db_session.query(AuditLogEntry).filter(
            AuditLogEntry.audit_log_id == uuid.UUID(override_data["audit_log_id"])
        ).first()
        assert audit_entry is not None
        assert audit_entry.action_type == "ORDER_ROUTE_OVERRIDE"
        assert audit_entry.actor_id == admin.user_id

    def test_dispute_flagging_and_admin_resolution(self, db_session):
        admin = create_user(db_session, role="admin", name="Admin Disputes")
        patient = create_user(db_session, role="patient")
        patient_headers = get_auth_headers(patient, idempotency_key=str(uuid.uuid4()))
        admin_headers = get_auth_headers(admin)
        addr = create_address(db_session, patient)
        med = create_medicine(db_session, name="Omeprazole", schedule="otc")

        stock = OwnedInventoryStock(
            stock_id=uuid.uuid4(),
            medicine_id=med.medicine_id,
            batch_number="B_OME",
            expiry_date=date.today() + timedelta(days=180),
            quantity=50,
            price=Decimal("25.00"),
            updated_at=datetime.now(timezone.utc)
        )
        db_session.add(stock)
        db_session.commit()

        cart_res = client.post("/api/v1/cart", headers=patient_headers)
        cart_id = cart_res.json()["cart_id"]

        client.post(
            f"/api/v1/cart/{cart_id}/items",
            headers=patient_headers,
            json={"medicine_id": str(med.medicine_id), "quantity": 1}
        )

        order_res = client.post(
            "/api/v1/orders",
            headers=patient_headers,
            json={"cart_id": cart_id, "delivery_address_id": str(addr.address_id)}
        )
        order_id = order_res.json()["order_id"]

        # Flag dispute
        disp_res = client.post(
            f"/api/v1/orders/{order_id}/disputes",
            headers=patient_headers,
            json={"dispute_type": "stock_discrepancy"}
        )
        assert disp_res.status_code == 201
        dispute_id = disp_res.json()["dispute_id"]

        # Admin lists disputes
        list_disp_res = client.get("/api/v1/admin/orders/disputes", headers=admin_headers)
        assert list_disp_res.status_code == 200
        disputes_data = list_disp_res.json()["data"]
        assert any(d["dispute_id"] == dispute_id for d in disputes_data)

        # Admin resolves dispute
        resolve_res = client.post(
            f"/api/v1/admin/orders/disputes/{dispute_id}/resolve",
            headers=admin_headers,
            json={"resolution": "Stock discrepancy investigated and partner re-assigned"}
        )
        assert resolve_res.status_code == 200
        resolved_data = resolve_res.json()
        assert resolved_data["resolved_by"] == str(admin.user_id)
        assert resolved_data["resolution"] == "Stock discrepancy investigated and partner re-assigned"

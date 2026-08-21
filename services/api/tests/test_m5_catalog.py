import uuid
from decimal import Decimal
from datetime import datetime, timezone, date
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token, hash_password
from app.models.identity import User
from app.models.catalog import (
    MedicineCatalogItem,
    OwnedInventoryStock,
    PartnerPharmacy,
    PartnerStock,
    GenericEquivalentMap,
)
from app.models.prescription_report import Prescription, ExtractedField

client = TestClient(app)


def create_user(db_session, role="patient", name="User"):
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


def get_auth_headers(user):
    token = create_access_token(subject=str(user.user_id), role=user.role)
    return {"Authorization": f"Bearer {token}"}


class TestCatalogCRUD:
    def test_admin_create_medicine(self, db_session):
        admin = create_user(db_session, role="admin", name="Admin User")
        headers = get_auth_headers(admin)

        payload = {
            "standard_identifier": "MED-PAR-500",
            "name": "Dolo 650",
            "generic_name": "Paracetamol 650mg",
            "schedule": "otc"
        }

        res = client.post("/api/v1/catalog/medicines", headers=headers, json=payload)
        assert res.status_code == 201
        data = res.json()
        assert data["standard_identifier"] == "MED-PAR-500"
        assert data["name"] == "Dolo 650"
        assert data["schedule"] == "otc"

        # Duplicate standard identifier check
        dup_res = client.post("/api/v1/catalog/medicines", headers=headers, json=payload)
        assert dup_res.status_code == 400
        assert "DUPLICATE_IDENTIFIER" in dup_res.json()["detail"]

    def test_non_admin_cannot_create_medicine(self, db_session):
        patient = create_user(db_session, role="patient")
        headers = get_auth_headers(patient)

        payload = {
            "standard_identifier": "MED-AMO-500",
            "name": "Amoxicillin 500mg",
            "schedule": "h"
        }
        res = client.post("/api/v1/catalog/medicines", headers=headers, json=payload)
        assert res.status_code == 403
        assert "FORBIDDEN" in res.json()["detail"]


class TestCatalogSearchAndStockAggregation:
    def test_search_and_stock_aggregation(self, db_session):
        admin = create_user(db_session, role="admin")
        admin_headers = get_auth_headers(admin)

        # 1. Create Catalog Item
        med = MedicineCatalogItem(
            medicine_id=uuid.uuid4(),
            standard_identifier="MED-AUG-625",
            name="Augmentin 625 Duo",
            generic_name="Amoxicillin + Clavulanic Acid",
            schedule="h",
            created_at=datetime.now(timezone.utc)
        )
        db_session.add(med)
        db_session.commit()

        # 2. Add Owned Warehouse Stock
        owned_stock = OwnedInventoryStock(
            stock_id=uuid.uuid4(),
            medicine_id=med.medicine_id,
            batch_number="BATCH-AUG-01",
            expiry_date=date(2027, 12, 31),
            quantity=50,
            price=Decimal("180.50"),
            updated_at=datetime.now(timezone.utc)
        )
        db_session.add(owned_stock)

        # 3. Add Partner Pharmacy & Partner Stock
        pharmacy = PartnerPharmacy(
            partner_id=uuid.uuid4(),
            name="Apollo Pharmacy - Indiranagar",
            address={"city": "Bengaluru", "pincode": "560038"},
            fulfillment_radius_km=Decimal("12.0"),
            status="active",
            created_at=datetime.now(timezone.utc)
        )
        db_session.add(pharmacy)
        db_session.commit()

        partner_stock = PartnerStock(
            stock_id=uuid.uuid4(),
            partner_id=pharmacy.partner_id,
            medicine_id=med.medicine_id,
            quantity=30,
            price=Decimal("175.00"),
            last_synced_at=datetime.now(timezone.utc)
        )
        db_session.add(partner_stock)
        db_session.commit()

        # Public Search by query
        search_res = client.get("/api/v1/catalog/medicines?q=Augmentin")
        assert search_res.status_code == 200
        data = search_res.json()
        assert len(data["data"]) == 1
        item = data["data"][0]
        assert item["name"] == "Augmentin 625 Duo"
        assert item["in_stock"] is True
        assert item["total_stock"] == 80  # 50 owned + 30 partner
        assert item["price"] == 175.00  # min price among available

    def test_search_schedule_filter(self, db_session):
        med_otc = MedicineCatalogItem(
            medicine_id=uuid.uuid4(),
            standard_identifier="MED-OTC-1",
            name="Crocin 500",
            schedule="otc",
            created_at=datetime.now(timezone.utc)
        )
        med_h = MedicineCatalogItem(
            medicine_id=uuid.uuid4(),
            standard_identifier="MED-H-1",
            name="Alprazolam 0.5",
            schedule="h",
            created_at=datetime.now(timezone.utc)
        )
        db_session.add_all([med_otc, med_h])
        db_session.commit()

        res_otc = client.get("/api/v1/catalog/medicines?schedule=otc")
        assert res_otc.status_code == 200
        names = [m["name"] for m in res_otc.json()["data"]]
        assert "Crocin 500" in names
        assert "Alprazolam 0.5" not in names

    def test_search_pagination(self, db_session):
        for i in range(5):
            med = MedicineCatalogItem(
                medicine_id=uuid.uuid4(),
                standard_identifier=f"MED-PAGE-{i}",
                name=f"Paged Medicine {i:02d}",
                schedule="otc",
                created_at=datetime.now(timezone.utc)
            )
            db_session.add(med)
        db_session.commit()

        res = client.get("/api/v1/catalog/medicines?limit=2")
        assert res.status_code == 200
        data = res.json()
        assert len(data["data"]) == 2
        assert data["has_more"] is True
        assert data["next_cursor"] is not None


class TestMedicineDetailAndGenericSubstitutes:
    def test_medicine_detail_with_equivalents(self, db_session):
        med1 = MedicineCatalogItem(
            medicine_id=uuid.uuid4(),
            standard_identifier="MED-PAN-40-BRAND",
            name="Pantocid 40",
            generic_name="Pantoprazole 40mg",
            schedule="h",
            created_at=datetime.now(timezone.utc)
        )
        med2 = MedicineCatalogItem(
            medicine_id=uuid.uuid4(),
            standard_identifier="MED-PAN-40-GEN",
            name="Pan 40",
            generic_name="Pantoprazole 40mg",
            schedule="h",
            created_at=datetime.now(timezone.utc)
        )
        db_session.add_all([med1, med2])
        db_session.commit()

        # Create mapping
        mapping = GenericEquivalentMap(
            mapping_id=uuid.uuid4(),
            medicine_id=med1.medicine_id,
            equivalent_medicine_id=med2.medicine_id,
            created_at=datetime.now(timezone.utc)
        )
        db_session.add(mapping)
        db_session.commit()

        res = client.get(f"/api/v1/catalog/medicines/{med1.medicine_id}")
        assert res.status_code == 200
        data = res.json()
        assert data["name"] == "Pantocid 40"
        assert len(data["generic_equivalents"]) == 1
        assert data["generic_equivalents"][0]["name"] == "Pan 40"


class TestPrescriptionMatching:
    def test_prescription_match_to_catalog(self, db_session):
        patient = create_user(db_session, role="patient")
        headers = get_auth_headers(patient)

        # Create Catalog Item
        med = MedicineCatalogItem(
            medicine_id=uuid.uuid4(),
            standard_identifier="MED-AMOX-500",
            name="Amoxicillin 500mg",
            generic_name="Amoxicillin",
            schedule="h",
            created_at=datetime.now(timezone.utc)
        )
        db_session.add(med)

        # Create Prescription and Extracted Field
        presc = Prescription(
            prescription_id=uuid.uuid4(),
            patient_id=patient.user_id,
            document_id=uuid.uuid4(),
            extraction_status="extracted",
            verification_status="pending_review",
            created_at=datetime.now(timezone.utc)
        )
        db_session.add(presc)

        field = ExtractedField(
            field_id=uuid.uuid4(),
            prescription_id=presc.prescription_id,
            field_name="medicine_name",
            value="Amoxicillin 500mg",
            confidence_score=Decimal("0.950"),
            review_state="auto_accepted"
        )
        db_session.add(field)
        db_session.commit()

        # Request Match
        match_res = client.post(
            "/api/v1/catalog/match",
            headers=headers,
            json={"prescription_id": str(presc.prescription_id)}
        )
        assert match_res.status_code == 200
        data = match_res.json()
        assert len(data["matches"]) == 1
        m = data["matches"][0]
        assert m["match_type"] == "exact"
        assert m["medicine_name"] == "Amoxicillin 500mg"
        assert m["auto_addable"] is True

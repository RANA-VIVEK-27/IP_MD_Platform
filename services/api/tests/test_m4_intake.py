import io
import uuid
import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token, hash_password
from app.models.identity import User, DoctorLicense
from app.models.prescription_report import Document, Prescription, ExtractedField, Report, ReportValue
from app.models.audit import AuditLogEntry
from app.services.extraction_service import ExtractionService
from fastapi import HTTPException

client = TestClient(app)


def create_test_user(db_session, role="patient", status="active", name="Test User"):
    user_id = uuid.uuid4()
    user = User(
        user_id=user_id,
        role=role,
        full_name=name,
        email=f"{user_id.hex[:8]}@example.com",
        password_hash=hash_password("Password123!"),
        status=status,
        created_at=datetime.now(timezone.utc)
    )
    db_session.add(user)
    db_session.flush()

    if role == "doctor":
        doc_license = DoctorLicense(
            license_id=uuid.uuid4(),
            user_id=user_id,
            license_number=f"DOC-{user_id.hex[:6].upper()}",
            verification_status="approved"
        )
        db_session.add(doc_license)
        db_session.flush()

    db_session.commit()
    db_session.refresh(user)
    return user


def get_auth_headers(user):
    token = create_access_token(
        subject=str(user.user_id),
        role=user.role
    )
    return {"Authorization": f"Bearer {token}"}



class TestPrescriptionUpload:
    def test_prescription_upload_success(self, db_session):
        patient = create_test_user(db_session, role="patient")
        headers = get_auth_headers(patient)

        file_content = b"%PDF-1.4 dummy pdf prescription data"
        files = {
            "file": ("prescription.pdf", io.BytesIO(file_content), "application/pdf")
        }
        data = {
            "document_type": "prescription"
        }

        response = client.post("/api/v1/prescriptions/upload", headers=headers, files=files, data=data)
        assert response.status_code == 201
        res_data = response.json()
        assert "prescription_id" in res_data
        assert "document_id" in res_data
        assert res_data["status"] in ["queued", "extracted", "processing"]

        # Verify DB rows
        presc_id = uuid.UUID(res_data["prescription_id"])
        presc = db_session.query(Prescription).filter(Prescription.prescription_id == presc_id).first()
        assert presc is not None
        assert presc.patient_id == patient.user_id

        doc = db_session.query(Document).filter(Document.document_id == presc.document_id).first()
        assert doc is not None
        assert doc.file_type == "pdf"
        assert doc.scan_status == "pending"  # M12: scan happens async via Celery
        assert doc.doc_status == "quarantined"

    def test_prescription_upload_file_too_large(self, db_session):
        patient = create_test_user(db_session, role="patient")
        headers = get_auth_headers(patient)

        # 21 MB payload (exceeding 20MB limit)
        large_file = b"0" * (21 * 1024 * 1024)
        files = {
            "file": ("large_prescription.jpg", io.BytesIO(large_file), "image/jpeg")
        }
        data = {"document_type": "prescription"}

        response = client.post("/api/v1/prescriptions/upload", headers=headers, files=files, data=data)
        assert response.status_code == 400
        assert "FILE_TOO_LARGE" in response.json()["detail"]

    def test_prescription_upload_unsupported_file_type(self, db_session):
        patient = create_test_user(db_session, role="patient")
        headers = get_auth_headers(patient)

        files = {
            "file": ("malicious.exe", io.BytesIO(b"binary executable data"), "application/x-msdownload")
        }
        data = {"document_type": "prescription"}

        response = client.post("/api/v1/prescriptions/upload", headers=headers, files=files, data=data)
        assert response.status_code == 400
        assert "UNSUPPORTED_FILE_TYPE" in response.json()["detail"]

    def test_prescription_upload_non_patient_blocked(self, db_session):
        doctor = create_test_user(db_session, role="doctor")
        headers = get_auth_headers(doctor)

        files = {
            "file": ("rx.png", io.BytesIO(b"dummy image data"), "image/png")
        }
        data = {"document_type": "prescription"}

        response = client.post("/api/v1/prescriptions/upload", headers=headers, files=files, data=data)
        assert response.status_code == 403
        assert "FORBIDDEN" in response.json()["detail"]


class TestPrescriptionRetrievalAndStatus:
    def test_prescription_status_polling(self, db_session):
        patient = create_test_user(db_session, role="patient")
        headers = get_auth_headers(patient)

        files = {"file": ("rx.png", io.BytesIO(b"\x89PNG\r\n\x1a\n" + b"\x00" * 50), "image/png")}
        up_res = client.post("/api/v1/prescriptions/upload", headers=headers, files=files, data={"document_type": "prescription"})
        presc_id = up_res.json()["prescription_id"]

        status_res = client.get(f"/api/v1/prescriptions/{presc_id}/status", headers=headers)
        assert status_res.status_code == 200
        status_data = status_res.json()
        assert "status" in status_data
        assert "progress_pct" in status_data
        assert status_data["is_ai_generated"] is True

    def test_prescription_detail_with_extracted_fields(self, db_session):
        patient = create_test_user(db_session, role="patient")
        headers = get_auth_headers(patient)

        files = {"file": ("rx.jpg", io.BytesIO(b"\xff\xd8\xff\xe0" + b"\x00" * 50), "image/jpeg")}
        up_res = client.post("/api/v1/prescriptions/upload", headers=headers, files=files, data={"document_type": "prescription"})
        presc_id = up_res.json()["prescription_id"]

        detail_res = client.get(f"/api/v1/prescriptions/{presc_id}", headers=headers)
        assert detail_res.status_code == 200
        detail = detail_res.json()
        assert detail["prescription_id"] == presc_id
        assert detail["verification_status"] == "pending_review"
        assert len(detail["extracted_fields"]) > 0
        field = detail["extracted_fields"][0]
        assert "field_name" in field
        assert "confidence_score" in field

    def test_prescription_detail_forbidden_for_other_patient(self, db_session):
        patient_a = create_test_user(db_session, role="patient", name="Patient A")
        patient_b = create_test_user(db_session, role="patient", name="Patient B")

        headers_a = get_auth_headers(patient_a)
        headers_b = get_auth_headers(patient_b)

        files = {"file": ("rx.jpg", io.BytesIO(b"\xff\xd8\xff\xe0" + b"\x00" * 50), "image/jpeg")}
        up_res = client.post("/api/v1/prescriptions/upload", headers=headers_a, files=files, data={"document_type": "prescription"})
        presc_id = up_res.json()["prescription_id"]

        # Patient B attempts to view Patient A's prescription
        res = client.get(f"/api/v1/prescriptions/{presc_id}", headers=headers_b)
        assert res.status_code == 403
        assert "FORBIDDEN" in res.json()["detail"]

    def test_list_prescriptions(self, db_session):
        patient = create_test_user(db_session, role="patient")
        headers = get_auth_headers(patient)

        for i in range(3):
            files = {"file": (f"rx_{i}.png", io.BytesIO(b"\x89PNG\r\n\x1a\n" + b"\x00" * 50), "image/png")}
            client.post("/api/v1/prescriptions/upload", headers=headers, files=files, data={"document_type": "prescription"})

        list_res = client.get("/api/v1/prescriptions?limit=2", headers=headers)
        assert list_res.status_code == 200
        data = list_res.json()
        assert len(data["data"]) == 2
        assert data["has_more"] is True
        assert data["next_cursor"] is not None


class TestReportIntake:
    def test_report_upload_and_detail(self, db_session):
        patient = create_test_user(db_session, role="patient")
        headers = get_auth_headers(patient)

        files = {"file": ("blood_test.pdf", io.BytesIO(b"%PDF blood test data"), "application/pdf")}
        data = {"report_type": "blood_panel"}

        up_res = client.post("/api/v1/reports/upload", headers=headers, files=files, data=data)
        assert up_res.status_code == 201
        report_id = up_res.json()["report_id"]

        detail_res = client.get(f"/api/v1/reports/{report_id}", headers=headers)
        assert detail_res.status_code == 200
        detail = detail_res.json()
        assert detail["report_id"] == report_id
        assert detail["report_type"] == "blood_panel"
        assert len(detail["values"]) > 0
        assert detail["is_ai_generated"] is True


class TestDoctorVerificationWorkflow:
    def test_doctor_verification_queue(self, db_session):
        patient = create_test_user(db_session, role="patient")
        doctor = create_test_user(db_session, role="doctor")

        patient_headers = get_auth_headers(patient)
        doctor_headers = get_auth_headers(doctor)

        # Upload prescription
        files = {"file": ("rx.pdf", io.BytesIO(b"%PDF-1.4 fake rx data"), "application/pdf")}
        client.post("/api/v1/prescriptions/upload", headers=patient_headers, files=files, data={"document_type": "prescription"})

        queue_res = client.get("/api/v1/verification/queue", headers=doctor_headers)
        assert queue_res.status_code == 200
        queue_data = queue_res.json()
        assert len(queue_data["data"]) >= 1
        assert queue_data["data"][0]["verification_status"] == "pending_review"

    def test_doctor_approve_prescription(self, db_session):
        patient = create_test_user(db_session, role="patient")
        doctor = create_test_user(db_session, role="doctor")

        patient_headers = get_auth_headers(patient)
        doctor_headers = get_auth_headers(doctor)

        files = {"file": ("rx.pdf", io.BytesIO(b"%PDF-1.4 fake rx data"), "application/pdf")}
        up_res = client.post("/api/v1/prescriptions/upload", headers=patient_headers, files=files, data={"document_type": "prescription"})
        presc_id = up_res.json()["prescription_id"]

        # Approve
        approve_res = client.post(
            f"/api/v1/verification/{presc_id}/approve",
            headers=doctor_headers,
            json={"notes": "All dosage verified and matches patient history."}
        )
        assert approve_res.status_code == 200
        app_data = approve_res.json()
        assert app_data["verification_status"] == "doctor_verified"
        assert "audit_log_id" in app_data

        # Double approval rejected
        dup_res = client.post(
            f"/api/v1/verification/{presc_id}/approve",
            headers=doctor_headers,
            json={"notes": "Duplicate check"}
        )
        assert dup_res.status_code == 400
        assert "ALREADY_VERIFIED" in dup_res.json()["detail"]

    def test_doctor_reject_prescription(self, db_session):
        patient = create_test_user(db_session, role="patient")
        doctor = create_test_user(db_session, role="doctor")

        patient_headers = get_auth_headers(patient)
        doctor_headers = get_auth_headers(doctor)

        files = {"file": ("rx.pdf", io.BytesIO(b"%PDF-1.4 fake rx data"), "application/pdf")}
        up_res = client.post("/api/v1/prescriptions/upload", headers=patient_headers, files=files, data={"document_type": "prescription"})
        presc_id = up_res.json()["prescription_id"]

        # Reject with mandatory reason
        reject_res = client.post(
            f"/api/v1/verification/{presc_id}/reject",
            headers=doctor_headers,
            json={"reason": "Illegible doctor signature and missing strength."}
        )
        assert reject_res.status_code == 200
        rej_data = reject_res.json()
        assert rej_data["verification_status"] == "rejected"

        # Check DB status
        presc = db_session.query(Prescription).filter(Prescription.prescription_id == uuid.UUID(presc_id)).first()
        assert presc.verification_status == "rejected"

    def test_doctor_reject_prescription_empty_reason_blocked(self, db_session):
        patient = create_test_user(db_session, role="patient")
        doctor = create_test_user(db_session, role="doctor")

        patient_headers = get_auth_headers(patient)
        doctor_headers = get_auth_headers(doctor)

        files = {"file": ("rx.pdf", io.BytesIO(b"%PDF-1.4 fake rx data"), "application/pdf")}
        up_res = client.post("/api/v1/prescriptions/upload", headers=patient_headers, files=files, data={"document_type": "prescription"})
        presc_id = up_res.json()["prescription_id"]

        reject_res = client.post(
            f"/api/v1/verification/{presc_id}/reject",
            headers=doctor_headers,
            json={"reason": "   "}
        )
        assert reject_res.status_code == 400
        assert "REASON_REQUIRED" in reject_res.json()["detail"]

    def test_doctor_field_edit(self, db_session):
        patient = create_test_user(db_session, role="patient")
        doctor = create_test_user(db_session, role="doctor")

        patient_headers = get_auth_headers(patient)
        doctor_headers = get_auth_headers(doctor)

        files = {"file": ("rx.pdf", io.BytesIO(b"%PDF-1.4 fake rx data"), "application/pdf")}
        up_res = client.post("/api/v1/prescriptions/upload", headers=patient_headers, files=files, data={"document_type": "prescription"})
        presc_id = up_res.json()["prescription_id"]

        detail_res = client.get(f"/api/v1/prescriptions/{presc_id}", headers=patient_headers)
        field_id = detail_res.json()["extracted_fields"][0]["field_id"]

        edit_res = client.patch(
            f"/api/v1/prescriptions/{presc_id}/fields/{field_id}",
            headers=doctor_headers,
            json={"value": "Amoxicillin 250mg", "reason": "Corrected dosage typo from OCR"}
        )
        assert edit_res.status_code == 200
        edit_data = edit_res.json()
        assert edit_data["value"] == "Amoxicillin 250mg"
        assert edit_data["review_state"] == "doctor_edited"

    def test_non_doctor_cannot_verify(self, db_session):
        patient = create_test_user(db_session, role="patient")
        headers = get_auth_headers(patient)

        files = {"file": ("rx.pdf", io.BytesIO(b"%PDF-1.4 fake rx data"), "application/pdf")}
        up_res = client.post("/api/v1/prescriptions/upload", headers=headers, files=files, data={"document_type": "prescription"})
        presc_id = up_res.json()["prescription_id"]

        res = client.post(f"/api/v1/verification/{presc_id}/approve", headers=headers, json={"notes": "hack"})
        assert res.status_code == 403
        assert "FORBIDDEN" in res.json()["detail"]

    def test_unapproved_doctor_cannot_verify(self, db_session):
        unapproved_doc = create_test_user(db_session, role="doctor", name="Unapproved Doc")
        # Change license verification_status to pending
        lic = db_session.query(DoctorLicense).filter(DoctorLicense.user_id == unapproved_doc.user_id).first()
        lic.verification_status = "pending"
        db_session.commit()

        headers = get_auth_headers(unapproved_doc)
        dummy_id = str(uuid.uuid4())
        res = client.post(f"/api/v1/verification/{dummy_id}/approve", headers=headers, json={"notes": "test"})
        assert res.status_code == 403
        assert "DOCTOR_LICENSE_NOT_APPROVED" in res.json()["detail"]

    def test_verification_audit_log_retrieval(self, db_session):
        patient = create_test_user(db_session, role="patient")
        doctor = create_test_user(db_session, role="doctor")

        patient_headers = get_auth_headers(patient)
        doctor_headers = get_auth_headers(doctor)

        files = {"file": ("rx.pdf", io.BytesIO(b"%PDF-1.4 fake rx data"), "application/pdf")}
        up_res = client.post("/api/v1/prescriptions/upload", headers=patient_headers, files=files, data={"document_type": "prescription"})
        presc_id = up_res.json()["prescription_id"]

        client.post(f"/api/v1/verification/{presc_id}/approve", headers=doctor_headers, json={"notes": "Approved rx"})

        audit_res = client.get(f"/api/v1/verification/{presc_id}/audit-log", headers=doctor_headers)
        assert audit_res.status_code == 200
        logs = audit_res.json()["data"]
        assert len(logs) >= 1
        assert logs[0]["actor_role"] == "doctor"
        assert logs[0]["action_type"] == "PRESCRIPTION_APPROVED"


class TestExtractionStateMachine:
    def test_invalid_state_transition(self, db_session):
        prescription = Prescription(
            prescription_id=uuid.uuid4(),
            patient_id=uuid.uuid4(),
            document_id=uuid.uuid4(),
            extraction_status="extracted",
            verification_status="pending_review",
            created_at=datetime.now(timezone.utc)
        )

        with pytest.raises(HTTPException) as exc_info:
            ExtractionService.transition_status(prescription, "queued")
        assert exc_info.value.status_code == 400
        assert "INVALID_STATE_TRANSITION" in exc_info.value.detail

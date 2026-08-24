import os
import sys
import uuid
from pathlib import Path
import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient

# Ensure root monorepo directory is in sys.path for services.ai import
root_dir = str(Path(__file__).resolve().parents[3])
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from app.main import app
from app.core.security import hash_password
from app.models.identity import User
from app.models.prescription_report import Prescription, Document, Report
from app.services.ai_service import AIService, NON_DIAGNOSTIC_DISCLAIMER, EMERGENCY_RESPONSE
from services.ai.app.main import app as ai_app

client = TestClient(app)
ai_client = TestClient(ai_app)


@pytest.fixture
def unique_patient():
    patient_email = f"patient_ai_{uuid.uuid4().hex[:6]}@example.com"
    reg_body = {
        "role": "patient",
        "full_name": "AI Test Patient",
        "email": patient_email,
        "password": "Password123!"
    }
    client.post("/api/v1/auth/register", json=reg_body)
    client.post("/api/v1/auth/verify-email", json={"email": patient_email})
    login_res = client.post("/api/v1/auth/login", json={"email": patient_email, "password": "Password123!"})
    tokens = login_res.json()
    return {
        "email": patient_email,
        "user_id": tokens["user"]["user_id"],
        "token": tokens["access_token"],
        "headers": {"Authorization": f"Bearer {tokens['access_token']}"}
    }


@pytest.fixture
def super_admin_headers():
    admin_email = f"admin_ai_{uuid.uuid4().hex[:6]}@example.com"
    client.post("/api/v1/auth/register", json={
        "role": "super_admin",
        "full_name": "Super Admin",
        "email": admin_email,
        "password": "Password123!"
    })
    client.post("/api/v1/auth/verify-email", json={"email": admin_email})
    login_res = client.post("/api/v1/auth/login", json={"email": admin_email, "password": "Password123!"})
    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_record_ai_consent(unique_patient):
    """Verifies that patient AI processing consent is recorded in consent_records (BRD FR-10)."""
    res = client.post(
        "/api/v1/ai/consent",
        json={"consent_type": "chat_logging", "consent_given": True},
        headers=unique_patient["headers"]
    )
    assert res.status_code == 201
    data = res.json()
    assert data["consent_given"] is True
    assert data["user_id"] == unique_patient["user_id"]


def test_create_chat_session_requires_consent(unique_patient):
    """Verifies that initiating chat session without consent is rejected (400 Bad Request)."""
    res = client.post(
        "/api/v1/ai/chat/sessions",
        json={"consent_given": False},
        headers=unique_patient["headers"]
    )
    assert res.status_code == 400
    assert "CONSENT_REQUIRED" in res.json()["detail"]


def test_create_chat_session_success(unique_patient):
    """Verifies successful creation of chat session after consent (BRD FR-11)."""
    res = client.post(
        "/api/v1/ai/chat/sessions",
        json={"consent_given": True, "document_type": "prescription"},
        headers=unique_patient["headers"]
    )
    assert res.status_code == 201
    data = res.json()
    assert "session_id" in data
    assert data["patient_id"] == unique_patient["user_id"]
    assert data["document_type"] == "prescription"


def test_get_patient_chat_documents(unique_patient):
    """Verifies listing uploaded documents for AI Chat scope selection."""
    res = client.get(
        "/api/v1/ai/documents",
        headers=unique_patient["headers"]
    )
    assert res.status_code == 200
    data = res.json()
    assert "prescriptions" in data
    assert "lab_reports" in data
    assert "general_reports" in data


def test_chat_message_turn_disclaimer_and_rag(unique_patient):
    """
    Verifies:
    1. First response contains mandatory non-diagnostic disclosure (BRD FR-11).
    2. Subsequent response does not duplicate the long header disclosure.
    """
    res_sess = client.post(
        "/api/v1/ai/chat/sessions",
        json={"consent_given": True},
        headers=unique_patient["headers"]
    )
    session_id = res_sess.json()["session_id"]

    res_msg1 = client.post(
        f"/api/v1/ai/chat/sessions/{session_id}/messages",
        json={"text": "What is the recommended dosage for Metformin?"},
        headers=unique_patient["headers"]
    )
    assert res_msg1.status_code == 200
    data1 = res_msg1.json()
    user_m1 = data1["user_message"]
    assistant_m1 = data1["assistant_message"]

    assert user_m1["sender"] == "user"
    assert assistant_m1["sender"] == "assistant"
    assert assistant_m1["is_ai_generated"] is True
    assert assistant_m1["guardrail_triggered"] is False
    assert NON_DIAGNOSTIC_DISCLAIMER in assistant_m1["text"]

    res_msg2 = client.post(
        f"/api/v1/ai/chat/sessions/{session_id}/messages",
        json={"text": "Are there any interactions with food?"},
        headers=unique_patient["headers"]
    )
    assert res_msg2.status_code == 200
    data2 = res_msg2.json()
    assistant_m2 = data2["assistant_message"]
    assert NON_DIAGNOSTIC_DISCLAIMER not in assistant_m2["text"]


def test_emergency_red_flag_guardrail_escalation(unique_patient):
    """
    Verifies that emergency queries (e.g. chest pain) trigger red-flag guardrails (BRD FR-12).
    """
    res_sess = client.post(
        "/api/v1/ai/chat/sessions",
        json={"consent_given": True},
        headers=unique_patient["headers"]
    )
    session_id = res_sess.json()["session_id"]

    res_msg = client.post(
        f"/api/v1/ai/chat/sessions/{session_id}/messages",
        json={"text": "I am experiencing severe chest pain and difficulty breathing right now."},
        headers=unique_patient["headers"]
    )
    assert res_msg.status_code == 200
    data = res_msg.json()
    assistant_m = data["assistant_message"]

    assert assistant_m["guardrail_triggered"] is True
    assert EMERGENCY_RESPONSE in assistant_m["text"]


def test_emergency_red_flag_suicidal(unique_patient):
    """
    Verifies that suicidal ideation keywords trigger emergency escalation notice.
    """
    res_sess = client.post(
        "/api/v1/ai/chat/sessions",
        json={"consent_given": True},
        headers=unique_patient["headers"]
    )
    session_id = res_sess.json()["session_id"]

    res_msg = client.post(
        f"/api/v1/ai/chat/sessions/{session_id}/messages",
        json={"text": "I am feeling desperate and having suicidal thoughts."},
        headers=unique_patient["headers"]
    )
    assert res_msg.status_code == 200
    data = res_msg.json()
    assistant_m = data["assistant_message"]

    assert assistant_m["guardrail_triggered"] is True
    assert EMERGENCY_RESPONSE in assistant_m["text"]


def test_chat_history_retrieval(unique_patient):
    """Verifies chat history retrieval for a session."""
    res_sess = client.post(
        "/api/v1/ai/chat/sessions",
        json={"consent_given": True},
        headers=unique_patient["headers"]
    )
    session_id = res_sess.json()["session_id"]

    client.post(
        f"/api/v1/ai/chat/sessions/{session_id}/messages",
        json={"text": "How long does Amoxicillin take to work?"},
        headers=unique_patient["headers"]
    )

    res_hist = client.get(
        f"/api/v1/ai/chat/sessions/{session_id}/messages",
        headers=unique_patient["headers"]
    )
    assert res_hist.status_code == 200
    hist = res_hist.json()
    assert hist["session_id"] == session_id
    assert hist["total"] == 2


def test_sub_threshold_ocr_confidence_routes_to_needs_review():
    """
    Verifies that prescription OCR fields with confidence < 0.85 auto-route to 'needs_review' (BRD FR-3).
    """
    from tests.conftest import TestingSessionLocal
    db = TestingSessionLocal()
    try:
        patient = User(
            user_id=uuid.uuid4(),
            role="patient",
            full_name="Low Conf Patient",
            email=f"low_conf_{uuid.uuid4().hex[:6]}@example.com",
            status="active"
        )
        db.add(patient)

        doc = Document(
            document_id=uuid.uuid4(),
            uploaded_by=patient.user_id,
            original_filename="sample.jpg",
            mime_type="image/jpeg",
            storage_url="storage/prescriptions/sample.jpg",
            file_type="jpg",
            file_size_bytes=5000,
            doc_status="clean",
            scan_status="clean",
            uploaded_at=datetime.now(timezone.utc)
        )
        db.add(doc)

        prescription = Prescription(
            prescription_id=uuid.uuid4(),
            document_id=doc.document_id,
            patient_id=patient.user_id,
            extraction_status="queued",
            verification_status="pending_review",
            created_at=datetime.now(timezone.utc)
        )
        db.add(prescription)
        db.commit()

        processed = AIService.process_prescription_ocr(db, prescription, simulate_low_confidence=True)
        assert processed.extraction_status == "needs_review"
    finally:
        db.close()


def test_diagnostic_report_nlp_abnormal_explanation():
    """
    Verifies diagnostic report parsing flags abnormal metrics and generates plain language summary.
    """
    from tests.conftest import TestingSessionLocal
    db = TestingSessionLocal()
    try:
        patient = User(
            user_id=uuid.uuid4(),
            role="patient",
            full_name="Report Patient",
            email=f"report_{uuid.uuid4().hex[:6]}@example.com",
            status="active"
        )
        db.add(patient)

        doc = Document(
            document_id=uuid.uuid4(),
            uploaded_by=patient.user_id,
            original_filename="report.pdf",
            mime_type="application/pdf",
            storage_url="storage/reports/report.pdf",
            file_type="pdf",
            file_size_bytes=8000,
            doc_status="clean",
            scan_status="clean",
            uploaded_at=datetime.now(timezone.utc)
        )
        db.add(doc)

        report = Report(
            report_id=uuid.uuid4(),
            document_id=doc.document_id,
            patient_id=patient.user_id,
            report_type="blood_test",
            extraction_status="queued",
            created_at=datetime.now(timezone.utc)
        )
        db.add(report)
        db.commit()

        processed = AIService.process_report_nlp(db, report, simulate_abnormal=True)
        assert processed.extraction_status == "extracted"
        assert processed.ai_explanation is not None
        assert "elevated" in processed.ai_explanation.lower() or "hyperglycemia" in processed.ai_explanation.lower()
    finally:
        db.close()


def test_seed_knowledge_embeddings(super_admin_headers):
    """Verifies seeding medical reference embeddings into pgvector knowledge_embeddings table."""
    res = client.post(
        "/api/v1/ai/knowledge/seed",
        headers=super_admin_headers
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert "records_added" in data


def test_ai_microservice_direct_endpoints():
    """Directly tests services/ai microservice FastAPI endpoints."""
    health_res = ai_client.get("/health")
    assert health_res.status_code == 200
    assert health_res.json()["service"] == "ipmd-ai-service"

    ocr_res = ai_client.post(
        "/api/v1/ai/extract-prescription",
        json={"prescription_id": str(uuid.uuid4()), "simulate_low_confidence": True}
    )
    assert ocr_res.status_code == 200
    assert ocr_res.json()["extraction_status"] == "needs_review"

    nlp_res = ai_client.post(
        "/api/v1/ai/parse-report",
        json={"report_id": str(uuid.uuid4()), "simulate_abnormal": True}
    )
    assert nlp_res.status_code == 200
    assert nlp_res.json()["ai_explanation"] is not None

    chat_res = ai_client.post(
        "/api/v1/ai/chat-completion",
        json={
            "session_id": str(uuid.uuid4()),
            "message_text": "Severe chest pain",
            "is_first_message": True
        }
    )
    assert chat_res.status_code == 200
    assert chat_res.json()["guardrail_triggered"] is True

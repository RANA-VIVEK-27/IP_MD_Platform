import uuid
from datetime import datetime, timezone
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.models.identity import User, DoctorLicense
from app.models.audit import AuditLogEntry, PlatformSetting
from app.core.security import create_access_token, hash_password


client = TestClient(app)


def create_test_user(db_session: Session, role="patient", status="active", name="Test User") -> User:
    user_id = uuid.uuid4()
    user = User(
        user_id=user_id,
        role=role,
        full_name=name,
        email=f"{user_id.hex[:8]}@ipmd.in",
        password_hash=hash_password("Secret123!"),
        status=status,
        created_at=datetime.now(timezone.utc),
    )
    db_session.add(user)
    db_session.flush()
    db_session.commit()
    db_session.refresh(user)
    return user


def get_auth_headers(user: User) -> dict:
    token = create_access_token(subject=str(user.user_id), role=user.role)
    return {"Authorization": f"Bearer {token}"}


class TestUserAdminTier:
    def test_list_pending_kyc_doctors(self, db_session: Session):
        user_admin = create_test_user(db_session, role="user_admin")
        doctor = create_test_user(db_session, role="doctor", status="pending")

        license_rec = DoctorLicense(
            license_id=uuid.uuid4(),
            user_id=doctor.user_id,
            license_number="MCI-2026-9999",
            verification_status="pending",
        )
        db_session.add(license_rec)
        db_session.commit()

        doctor_id_str = str(doctor.user_id)
        headers = get_auth_headers(user_admin)

        res = client.get("/api/v1/user-admin/doctors/pending-kyc", headers=headers)
        assert res.status_code == 200
        pending_list = res.json()["data"]
        assert any(d["user_id"] == doctor_id_str for d in pending_list)

    def test_verify_doctor_license_approve(self, db_session: Session):
        user_admin = create_test_user(db_session, role="user_admin")
        doctor = create_test_user(db_session, role="doctor", status="pending")

        license_rec = DoctorLicense(
            license_id=uuid.uuid4(),
            user_id=doctor.user_id,
            license_number="MCI-2026-8888",
            verification_status="pending",
        )
        db_session.add(license_rec)
        db_session.commit()

        doctor_id_str = str(doctor.user_id)
        headers = get_auth_headers(user_admin)

        verify_res = client.post(
            f"/api/v1/user-admin/doctors/{doctor_id_str}/verify-license",
            json={"decision": "approve"},
            headers=headers,
        )
        assert verify_res.status_code == 200
        data = verify_res.json()
        assert data["status"] == "active"
        assert "audit_log_id" in data

    def test_suspend_and_reinstate_patient(self, db_session: Session):
        user_admin = create_test_user(db_session, role="user_admin")
        patient = create_test_user(db_session, role="patient")
        headers = get_auth_headers(user_admin)

        # 1. Suspend
        res_suspend = client.post(
            f"/api/v1/user-admin/accounts/{patient.user_id}/suspend",
            json={"reason_code": "SUSPICIOUS_PRESCRIPTION_UPLOAD"},
            headers=headers,
        )
        assert res_suspend.status_code == 200
        assert res_suspend.json()["status"] == "suspended"

        # 2. Reinstate
        res_reinstate = client.post(
            f"/api/v1/user-admin/accounts/{patient.user_id}/reinstate",
            json={"reason_code": "IDENTITY_VERIFIED"},
            headers=headers,
        )
        assert res_reinstate.status_code == 200
        assert res_reinstate.json()["status"] == "active"

    def test_user_admin_cannot_suspend_super_admin(self, db_session: Session):
        user_admin = create_test_user(db_session, role="user_admin")
        super_admin = create_test_user(db_session, role="super_admin")
        headers = get_auth_headers(user_admin)

        res = client.post(
            f"/api/v1/user-admin/accounts/{super_admin.user_id}/suspend",
            json={"reason_code": "ILLEGAL_ATTEMPT"},
            headers=headers,
        )
        assert res.status_code == 403


class TestOperationsAdminTier:
    def test_admin_dashboard_summary(self, db_session: Session):
        admin = create_test_user(db_session, role="admin")
        headers = get_auth_headers(admin)

        summary_res = client.get("/api/v1/admin/dashboard/summary", headers=headers)
        assert summary_res.status_code == 200
        data = summary_res.json()
        assert "orders_today" in data
        assert "doctor_verification_queue_depth" in data

    def test_admin_onboard_and_list_partner_pharmacy(self, db_session: Session):
        admin = create_test_user(db_session, role="admin")
        headers = get_auth_headers(admin)

        partner_res = client.post(
            "/api/v1/admin/partner-pharmacies",
            json={
                "name": "Apollo Pharmacy Koramangala",
                "address": {"city": "Bengaluru", "pincode": "560034"},
                "fulfillment_radius_km": 8.5,
            },
            headers=headers,
        )
        assert partner_res.status_code == 201
        partner_id = partner_res.json()["partner_id"]
        assert partner_res.json()["status"] == "pending_activation"

    def test_admin_cannot_access_super_admin_routes(self, db_session: Session):
        admin = create_test_user(db_session, role="admin")
        headers = get_auth_headers(admin)

        res = client.post(
            "/api/v1/super-admin/admins",
            json={
                "full_name": "Rogue Admin",
                "email": "rogue@ipmd.in",
                "role": "admin",
                "permissions": ["all"],
            },
            headers=headers,
        )
        assert res.status_code == 403


class TestSuperAdminTier:
    def test_super_admin_settings_update_and_get(self, db_session: Session):
        super_admin = create_test_user(db_session, role="super_admin")
        headers = get_auth_headers(super_admin)

        update_res = client.patch(
            "/api/v1/super-admin/settings",
            json={
                "commission_rate_pct": 12.5,
                "payment_gateway_credential": "rzp_live_secret_key_9999",
                "security_policies": {"mfa_required": True, "session_timeout_mins": 30},
            },
            headers=headers,
        )
        assert update_res.status_code == 200
        assert "commission_rate_pct" in update_res.json()["updated_fields"]

        get_res = client.get("/api/v1/super-admin/settings", headers=headers)
        assert get_res.status_code == 200
        settings_data = get_res.json()
        assert settings_data["commission_rate_pct"] == 12.5
        assert "rzp_live_secret_key_9999" not in settings_data["payment_gateway_credential_ref"]

    def test_super_admin_audit_logs_query(self, db_session: Session):
        super_admin = create_test_user(db_session, role="super_admin")
        headers = get_auth_headers(super_admin)

        # Trigger setting update to produce audit log
        client.patch(
            "/api/v1/super-admin/settings",
            json={"commission_rate_pct": 15.0},
            headers=headers,
        )

        audit_res = client.get("/api/v1/super-admin/audit-logs", headers=headers)
        assert audit_res.status_code == 200
        logs = audit_res.json()["data"]
        assert len(logs) > 0
        assert any(log["action_type"] == "UPDATE_PLATFORM_SETTINGS" for log in logs)

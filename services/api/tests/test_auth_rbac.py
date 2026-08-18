import uuid
import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.db.session import get_db
from app.core.config import settings
from app.models.identity import User, DoctorLicense, Permission, AdminPermission, AccountStatusHistory, RefreshToken
from app.core.security import hash_password, hash_token

client = TestClient(app)

@pytest.fixture
def unique_email():
    return f"test_user_{uuid.uuid4().hex[:8]}@example.com"

@pytest.fixture
def unique_phone():
    return f"+9198{uuid.uuid4().int % 100000000:08d}"

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_register_and_verify_email_password(unique_email):
    # 1. Register Patient via Email + Password
    reg_payload = {
        "role": "patient",
        "full_name": "Email Test Patient",
        "email": unique_email,
        "password": "SecurePassword123!"
    }
    res_reg = client.post("/api/v1/auth/register", json=reg_payload)
    assert res_reg.status_code == 201
    user_data = res_reg.json()
    assert user_data["email"] == unique_email
    assert user_data["status"] == "pending"

    # 2. Login while status is pending should be rejected with 403
    login_payload = {
        "email": unique_email,
        "password": "SecurePassword123!"
    }
    res_login_pending = client.post("/api/v1/auth/login", json=login_payload)
    assert res_login_pending.status_code == 403
    assert res_login_pending.json()["detail"] == "ACCOUNT_PENDING_VERIFICATION"

    # 3. Verify Email
    res_verify = client.post("/api/v1/auth/verify-email", json={"email": unique_email})
    assert res_verify.status_code == 200
    assert res_verify.json()["status"] == "active"

    # 4. Login after verification
    res_login_active = client.post("/api/v1/auth/login", json=login_payload)
    assert res_login_active.status_code == 200
    tokens = res_login_active.json()
    assert "access_token" in tokens
    assert "refresh_token" in tokens

    # 5. Access protected /users/me
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    res_me = client.get("/api/v1/users/me", headers=headers)
    assert res_me.status_code == 200
    assert res_me.json()["email"] == unique_email

def test_register_and_verify_phone_otp(unique_phone):
    # 1. Request OTP
    res_otp_req = client.post("/api/v1/auth/otp/request", json={"phone": unique_phone})
    assert res_otp_req.status_code == 200
    otp_info = res_otp_req.json()
    req_id = otp_info["otp_request_id"]
    debug_otp = otp_info["debug_otp"]

    # 2. Verify OTP
    verify_payload = {
        "otp_request_id": req_id,
        "otp_code": debug_otp,
        "phone": unique_phone
    }
    res_otp_verify = client.post("/api/v1/auth/otp/verify", json=verify_payload)
    assert res_otp_verify.status_code == 200
    tokens = res_otp_verify.json()
    assert "access_token" in tokens
    assert tokens["user"]["phone"] == unique_phone
    assert tokens["user"]["status"] == "active"

def test_oauth_registration_and_login(unique_email):
    oauth_payload = {
        "provider": "google",
        "auth_code": "fake_auth_code_123",
        "email": unique_email,
        "full_name": "Google User"
    }
    res_oauth = client.post("/api/v1/auth/oauth/callback", json=oauth_payload)
    assert res_oauth.status_code == 200
    data = res_oauth.json()
    assert "access_token" in data
    assert data["user"]["email"] == unique_email
    assert data["user"]["status"] == "active"  # OAuth activates immediately post-callback
    assert data["is_new_user"] is True

def test_login_and_request_rejected_while_suspended(unique_email):
    # Register & activate user
    reg_payload = {
        "role": "patient",
        "full_name": "Suspended Test Patient",
        "email": unique_email,
        "password": "Password123!"
    }
    client.post("/api/v1/auth/register", json=reg_payload)
    client.post("/api/v1/auth/verify-email", json={"email": unique_email})
    login_res = client.post("/api/v1/auth/login", json={"email": unique_email, "password": "Password123!"})
    access_token = login_res.json()["access_token"]
    user_id = login_res.json()["user"]["user_id"]

    # Create a super admin to perform status change
    super_admin_email = f"super_admin_{uuid.uuid4().hex[:6]}@example.com"
    client.post("/api/v1/auth/register", json={
        "role": "super_admin",
        "full_name": "Super Admin",
        "email": super_admin_email,
        "password": "Password123!"
    })
    client.post("/api/v1/auth/verify-email", json={"email": super_admin_email})
    admin_login = client.post("/api/v1/auth/login", json={"email": super_admin_email, "password": "Password123!"})
    admin_token = admin_login.json()["access_token"]

    # Suspend user
    res_suspend = client.post(
        f"/api/v1/users/{user_id}/status",
        json={"status": "suspended", "reason_code": "compliance_violation"},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_suspend.status_code == 200
    assert res_suspend.json()["status"] == "suspended"

    # Login rejected while suspended
    res_login_suspended = client.post("/api/v1/auth/login", json={"email": unique_email, "password": "Password123!"})
    assert res_login_suspended.status_code == 403
    assert res_login_suspended.json()["detail"] == "ACCOUNT_SUSPENDED"

    # Request with previous access token rejected on live status check
    res_live_check = client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {access_token}"})
    assert res_live_check.status_code == 403
    assert res_live_check.json()["detail"] == "ACCOUNT_SUSPENDED"

def test_doctor_blocked_until_license_approved(unique_email):
    # 1. Doctor registration
    doc_payload = {
        "role": "doctor",
        "full_name": "Dr. John Doe",
        "email": unique_email,
        "password": "DoctorPassword123!",
        "license_number": "MCI-12345-REG"
    }
    res_reg = client.post("/api/v1/auth/register", json=doc_payload)
    assert res_reg.status_code == 201
    doc_id = res_reg.json()["user_id"]

    # 2. Email verification (user status becomes active)
    client.post("/api/v1/auth/verify-email", json={"email": unique_email})
    login_res = client.post("/api/v1/auth/login", json={"email": unique_email, "password": "DoctorPassword123!"})
    doc_token = login_res.json()["access_token"]

    # 3. Doctor attempts clinical action before license approval -> BLOCKED (403)
    doc_action_res = client.get("/api/v1/doctors/doctor-only-action", headers={"Authorization": f"Bearer {doc_token}"})
    assert doc_action_res.status_code == 403
    assert "DOCTOR_LICENSE_NOT_APPROVED" in doc_action_res.json()["detail"]

    # 4. User Admin approves license
    user_admin_email = f"user_admin_{uuid.uuid4().hex[:6]}@example.com"
    client.post("/api/v1/auth/register", json={
        "role": "user_admin",
        "full_name": "User Admin Officer",
        "email": user_admin_email,
        "password": "Password123!"
    })
    client.post("/api/v1/auth/verify-email", json={"email": user_admin_email})
    ua_login = client.post("/api/v1/auth/login", json={"email": user_admin_email, "password": "Password123!"})
    ua_token = ua_login.json()["access_token"]

    res_approve = client.post(
        f"/api/v1/doctors/{doc_id}/approve-license",
        json={"verification_status": "approved"},
        headers={"Authorization": f"Bearer {ua_token}"}
    )
    assert res_approve.status_code == 200
    assert res_approve.json()["verification_status"] == "approved"

    # 5. Doctor attempts clinical action after approval -> SUCCESS (200)
    doc_action_success = client.get("/api/v1/doctors/doctor-only-action", headers={"Authorization": f"Bearer {doc_token}"})
    assert doc_action_success.status_code == 200
    assert doc_action_success.json()["status"] == "success"

def test_rbac_rejection_for_wrong_role(unique_email):
    # Register & activate patient
    client.post("/api/v1/auth/register", json={
        "role": "patient",
        "full_name": "Patient Role Test",
        "email": unique_email,
        "password": "Password123!"
    })
    client.post("/api/v1/auth/verify-email", json={"email": unique_email})
    login_res = client.post("/api/v1/auth/login", json={"email": unique_email, "password": "Password123!"})
    patient_token = login_res.json()["access_token"]

    # Patient attempts to access admin endpoint -> BLOCKED (403)
    res = client.get(f"/api/v1/users/{uuid.uuid4()}", headers={"Authorization": f"Bearer {patient_token}"})
    assert res.status_code == 403
    assert "FORBIDDEN: Role 'patient' is not permitted" in res.json()["detail"]

def test_admin_permissions_check():
    # 1. Standard Admin without explicit permission
    admin_email = f"admin_{uuid.uuid4().hex[:6]}@example.com"
    client.post("/api/v1/auth/register", json={
        "role": "admin",
        "full_name": "Standard Admin",
        "email": admin_email,
        "password": "Password123!"
    })
    client.post("/api/v1/auth/verify-email", json={"email": admin_email})
    admin_login = client.post("/api/v1/auth/login", json={"email": admin_email, "password": "Password123!"})
    admin_token = admin_login.json()["access_token"]

    res_blocked = client.get("/api/v1/admin/gated-feature", headers={"Authorization": f"Bearer {admin_token}"})
    assert res_blocked.status_code == 403
    assert "PERMISSION_DENIED" in res_blocked.json()["detail"]

    # 2. Super Admin (bypasses granular permission check)
    super_admin_email = f"super_{uuid.uuid4().hex[:6]}@example.com"
    client.post("/api/v1/auth/register", json={
        "role": "super_admin",
        "full_name": "Super Admin",
        "email": super_admin_email,
        "password": "Password123!"
    })
    client.post("/api/v1/auth/verify-email", json={"email": super_admin_email})
    super_login = client.post("/api/v1/auth/login", json={"email": super_admin_email, "password": "Password123!"})
    super_token = super_login.json()["access_token"]

    res_allowed = client.get("/api/v1/admin/gated-feature", headers={"Authorization": f"Bearer {super_token}"})
    assert res_allowed.status_code == 200
    assert res_allowed.json()["status"] == "success"

def test_register_and_login_all_seven_roles():
    """Validates registration and login for all 7 role types defined in the BRD."""
    roles = [
        ("patient", {}),
        ("doctor", {"license_number": "MED-REG-9999"}),
        ("pharmacy_staff_owned", {"pharmacy_details": {"pharmacy_name": "Central Depot", "address": {"city": "Mumbai"}}}),
        ("partner_pharmacy", {"pharmacy_details": {"pharmacy_name": "Local Partner", "address": {"city": "Delhi"}}}),
        ("admin", {}),
        ("user_admin", {}),
        ("super_admin", {})
    ]

    for role_name, extra_fields in roles:
        email = f"role_test_{role_name}_{uuid.uuid4().hex[:6]}@example.com"
        reg_body = {
            "role": role_name,
            "full_name": f"Test {role_name.title()}",
            "email": email,
            "password": "RolePassword123!",
            **extra_fields
        }
        res_reg = client.post("/api/v1/auth/register", json=reg_body)
        assert res_reg.status_code == 201, f"Failed registering role {role_name}: {res_reg.text}"
        assert res_reg.json()["role"] == role_name

        # Activate
        res_ver = client.post("/api/v1/auth/verify-email", json={"email": email})
        assert res_ver.status_code == 200

        # Login
        res_login = client.post("/api/v1/auth/login", json={"email": email, "password": "RolePassword123!"})
        assert res_login.status_code == 200
        data = res_login.json()
        assert data["user"]["role"] == role_name
        assert "access_token" in data
        assert "refresh_token" in data

def test_refresh_token_hashing_rotation_and_logout(unique_email):
    """Verifies that refresh tokens are hashed in DB, rotated properly, and can be logged out."""
    reg_payload = {
        "role": "patient",
        "full_name": "Token Lifecycle Patient",
        "email": unique_email,
        "password": "Password123!"
    }
    client.post("/api/v1/auth/register", json=reg_payload)
    client.post("/api/v1/auth/verify-email", json={"email": unique_email})
    login_res = client.post("/api/v1/auth/login", json={"email": unique_email, "password": "Password123!"})
    tokens = login_res.json()
    raw_refresh = tokens["refresh_token"]

    # 1. Verify that raw_refresh token itself is NOT stored in DB, but SHA-256 hashed
    expected_hash = hash_token(raw_refresh)
    assert raw_refresh != expected_hash

    # 2. Rotate refresh token
    refresh_res = client.post("/api/v1/auth/refresh", json={"refresh_token": raw_refresh})
    assert refresh_res.status_code == 200
    new_tokens = refresh_res.json()
    new_raw_refresh = new_tokens["refresh_token"]
    assert new_raw_refresh != raw_refresh

    # 3. Old refresh token should now be rejected
    old_refresh_res = client.post("/api/v1/auth/refresh", json={"refresh_token": raw_refresh})
    assert old_refresh_res.status_code == 401

    # 4. Logout with current token
    logout_res = client.post("/api/v1/auth/logout", json={"refresh_token": new_raw_refresh})
    assert logout_res.status_code == 200
    assert logout_res.json()["revoked"] is True

    # 5. Revoked token cannot be used again
    post_logout_refresh = client.post("/api/v1/auth/refresh", json={"refresh_token": new_raw_refresh})
    assert post_logout_refresh.status_code == 401

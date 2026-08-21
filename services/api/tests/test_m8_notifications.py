import uuid
from datetime import datetime, timezone
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.security import create_access_token, hash_password
from app.models.identity import User
from app.models.notifications import NotificationEvent, DeliveryLog, UserChannelPreference

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


def get_auth_headers(user):
    token = create_access_token(subject=str(user.user_id), role=user.role)
    return {"Authorization": f"Bearer {token}"}


class TestNotificationPreferences:

    def test_get_default_preferences(self, db_session):
        patient = create_user(db_session, role="patient", name="Prefs Patient")
        headers = get_auth_headers(patient)

        res = client.get("/api/v1/notifications/preferences", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data["push_enabled"] is True
        assert data["email_enabled"] is True
        assert data["sms_enabled"] is True
        assert data["user_id"] == str(patient.user_id)

    def test_update_preferences_opt_out_sms(self, db_session):
        patient = create_user(db_session, role="patient", name="Opt Out Patient")
        headers = get_auth_headers(patient)

        update_payload = {"sms_enabled": False}
        res = client.put("/api/v1/notifications/preferences", json=update_payload, headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data["push_enabled"] is True
        assert data["email_enabled"] is True
        assert data["sms_enabled"] is False

        # Verify persistent
        get_res = client.get("/api/v1/notifications/preferences", headers=headers)
        assert get_res.json()["sms_enabled"] is False


class TestNotificationFanOutAndDelivery:

    def test_dispatch_respects_opt_out_preferences(self, db_session):
        patient = create_user(db_session, role="patient", name="Fanout Patient")
        admin = create_user(db_session, role="admin", name="Admin User")
        patient_headers = get_auth_headers(patient)
        admin_headers = get_auth_headers(admin)

        # Patient opts out of push and sms
        client.put("/api/v1/notifications/preferences", json={"push_enabled": False, "sms_enabled": False}, headers=patient_headers)

        # Admin triggers notification event
        order_id = uuid.uuid4()
        trigger_payload = {
            "user_id": str(patient.user_id),
            "type": "order_confirmation",
            "message": "Your order #1001 has been confirmed!",
            "related_entity_type": "order",
            "related_entity_id": str(order_id)
        }
        res = client.post("/api/v1/notifications/trigger", json=trigger_payload, headers=admin_headers)
        assert res.status_code == 201
        data = res.json()

        assert data["notification"]["type"] == "order_confirmation"
        assert data["notification"]["read"] is False
        assert data["notification"]["related_entity_id"] == str(order_id)

        # Only email channel should be dispatched
        dispatched_channels = [d["channel"] for d in data["dispatched_channels"]]
        assert "email" in dispatched_channels
        assert "push" not in dispatched_channels
        assert "sms" not in dispatched_channels

    def test_unread_count_and_list_notifications(self, db_session):
        patient = create_user(db_session, role="patient", name="List Patient")
        admin = create_user(db_session, role="admin", name="Admin User")
        patient_headers = get_auth_headers(patient)
        admin_headers = get_auth_headers(admin)

        # Trigger 2 notifications
        for i in range(2):
            res = client.post("/api/v1/notifications/trigger", json={
                "user_id": str(patient.user_id),
                "type": "verification_result",
                "message": f"Verification update {i+1}",
            }, headers=admin_headers)
            assert res.status_code == 201

        # Check unread count
        count_res = client.get("/api/v1/notifications/unread-count", headers=patient_headers)
        assert count_res.status_code == 200
        assert count_res.json()["unread_count"] >= 2

        # List notifications
        list_res = client.get("/api/v1/notifications", headers=patient_headers)
        assert list_res.status_code == 200
        data = list_res.json()
        assert data["total"] >= 2
        assert len(data["items"]) >= 2

    def test_mark_single_and_all_as_read(self, db_session):
        patient = create_user(db_session, role="patient", name="Read Patient")
        admin = create_user(db_session, role="admin", name="Admin User")
        patient_headers = get_auth_headers(patient)
        admin_headers = get_auth_headers(admin)

        trigger_res = client.post("/api/v1/notifications/trigger", json={
            "user_id": str(patient.user_id),
            "type": "refill_reminder",
            "message": "Time for your monthly medicine refill",
        }, headers=admin_headers)
        assert trigger_res.status_code == 201
        notif_id = trigger_res.json()["notification"]["notification_id"]

        # Mark single as read
        patch_res = client.patch(f"/api/v1/notifications/{notif_id}/read", headers=patient_headers)
        assert patch_res.status_code == 200
        assert patch_res.json()["read"] is True

        # Trigger another unread
        client.post("/api/v1/notifications/trigger", json={
            "user_id": str(patient.user_id),
            "type": "dispatch",
            "message": "Your order is dispatched",
        }, headers=admin_headers)

        # Mark all as read
        read_all_res = client.post("/api/v1/notifications/read-all", headers=patient_headers)
        assert read_all_res.status_code == 200

        # Unread count should now be 0
        count_res = client.get("/api/v1/notifications/unread-count", headers=patient_headers)
        assert count_res.json()["unread_count"] == 0

    def test_delivery_logs_retrieval_and_permissions(self, db_session):
        patient = create_user(db_session, role="patient", name="Delivery Patient")
        other_patient = create_user(db_session, role="patient", name="Other Patient")
        admin = create_user(db_session, role="admin", name="Admin User")
        patient_headers = get_auth_headers(patient)
        other_headers = get_auth_headers(other_patient)
        admin_headers = get_auth_headers(admin)

        trigger_res = client.post("/api/v1/notifications/trigger", json={
            "user_id": str(patient.user_id),
            "type": "delivery",
            "message": "Package delivered to your doorstep",
        }, headers=admin_headers)
        notif_id = trigger_res.json()["notification"]["notification_id"]

        # Owner can view delivery logs
        log_res = client.get(f"/api/v1/notifications/{notif_id}/delivery-logs", headers=patient_headers)
        assert log_res.status_code == 200
        logs = log_res.json()
        assert len(logs) > 0
        assert logs[0]["status"] == "sent"

        # Other patient cannot view another user's delivery logs (403 Forbidden)
        forbidden_res = client.get(f"/api/v1/notifications/{notif_id}/delivery-logs", headers=other_headers)
        assert forbidden_res.status_code == 403

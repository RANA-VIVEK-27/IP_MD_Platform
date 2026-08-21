"""
Admin Service — business logic for all three admin panel tiers.

UserAdminService: KYC verification, account suspend/reinstate/edit (BRD FR-23–25)
AdminService: Dashboard, partner pharmacy mgmt, dispute/verification oversight (BRD FR-20–22)
SuperAdminService: Admin accounts, platform settings, compliance overrides, audit logs (BRD FR-26–29)
"""

import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any, Tuple

from sqlalchemy.orm import Session
from sqlalchemy import func, and_, desc
from fastapi import HTTPException, status

from app.models.identity import (
    User, DoctorLicense, AdminPermission, Permission,
    AccountStatusHistory, PharmacyProfile,
)
from app.models.catalog import PartnerPharmacy
from app.models.orders import Order, OrderDispute
from app.models.payments import PaymentCapture
from app.models.prescription_report import Prescription, Document
from app.models.audit import AuditLogEntry, ComplianceOverride, PlatformSetting
from app.services.audit_service import AuditService
from app.core.security import hash_password


# ─────────────────────────────────────────────────────────────────────────────
# User Admin Service (BRD FR-23 to FR-25, API §3.9)
# ─────────────────────────────────────────────────────────────────────────────

class UserAdminService:
    """
    User Admin capabilities:
    - Doctor license/KYC verification
    - Account suspend / reinstate / edit
    - Cannot access financial configuration, inventory, or order-routing settings
    """

    @staticmethod
    def list_pending_kyc_doctors(db: Session) -> List[Dict[str, Any]]:
        """Lists doctor accounts with pending license verification."""
        results = (
            db.query(User, DoctorLicense)
            .join(DoctorLicense, User.user_id == DoctorLicense.user_id)
            .filter(DoctorLicense.verification_status == "pending")
            .order_by(User.created_at.asc())
            .all()
        )
        return [
            {
                "user_id": user.user_id,
                "full_name": user.full_name,
                "license_number": license.license_number,
                "submitted_at": user.created_at,
            }
            for user, license in results
        ]

    @staticmethod
    def verify_doctor_license(
        db: Session,
        *,
        admin_user: User,
        doctor_id: uuid.UUID,
        decision: str,
        reason: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Approves or rejects a doctor's license verification.
        On approve: account status → active, doctor can log in.
        On reject: stays pending, reason recorded.
        """
        user = db.query(User).filter(User.user_id == doctor_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="USER_NOT_FOUND")

        license_record = (
            db.query(DoctorLicense)
            .filter(DoctorLicense.user_id == doctor_id)
            .first()
        )
        if not license_record:
            raise HTTPException(status_code=404, detail="USER_NOT_FOUND")

        if license_record.verification_status != "pending":
            raise HTTPException(status_code=409, detail="ALREADY_VERIFIED")

        if decision == "reject" and not reason:
            raise HTTPException(
                status_code=400, detail="REASON_REQUIRED_FOR_REJECTION"
            )

        if decision == "approve":
            license_record.verification_status = "approved"
            license_record.verified_by = admin_user.user_id
            license_record.verified_at = datetime.now(timezone.utc)
            user.status = "active"
            user.updated_at = datetime.now(timezone.utc)
        elif decision == "reject":
            license_record.verification_status = "rejected"
            license_record.verified_by = admin_user.user_id
            license_record.verified_at = datetime.now(timezone.utc)
            license_record.rejection_reason = reason
        else:
            raise HTTPException(
                status_code=400, detail="VALIDATION_ERROR: decision must be 'approve' or 'reject'"
            )

        audit_entry = AuditService.log_action(
            db,
            actor_id=admin_user.user_id,
            actor_role=admin_user.role,
            action_type="VERIFY_DOCTOR_LICENSE",
            target_entity_type="user",
            target_entity_id=doctor_id,
            justification=f"Decision: {decision}" + (f" — {reason}" if reason else ""),
        )

        db.commit()
        return {
            "user_id": doctor_id,
            "status": user.status,
            "audit_log_id": audit_entry.audit_log_id,
        }

    @staticmethod
    def suspend_account(
        db: Session,
        *,
        admin_user: User,
        user_id: uuid.UUID,
        reason_code: str,
    ) -> Dict[str, Any]:
        """
        Suspends a patient, doctor, or pharmacy-staff account.
        Cannot suspend admin or super_admin accounts (BRD §4.1).
        """
        target_user = db.query(User).filter(User.user_id == user_id).first()
        if not target_user:
            raise HTTPException(status_code=404, detail="USER_NOT_FOUND")

        # User Admin cannot suspend Admin/Super Admin accounts
        if target_user.role in ("admin", "super_admin"):
            raise HTTPException(
                status_code=403,
                detail="FORBIDDEN: Cannot suspend Admin or Super Admin accounts",
            )

        if target_user.status == "suspended":
            raise HTTPException(status_code=409, detail="ACCOUNT_ALREADY_SUSPENDED")

        target_user.status = "suspended"
        target_user.updated_at = datetime.now(timezone.utc)

        # Record status history
        history = AccountStatusHistory(
            status_history_id=uuid.uuid4(),
            user_id=user_id,
            status="suspended",
            reason_code=reason_code,
            changed_by=admin_user.user_id,
            changed_at=datetime.now(timezone.utc),
        )
        db.add(history)

        audit_entry = AuditService.log_action(
            db,
            actor_id=admin_user.user_id,
            actor_role=admin_user.role,
            action_type="SUSPEND_ACCOUNT",
            target_entity_type="user",
            target_entity_id=user_id,
            justification=f"Reason: {reason_code}",
        )

        db.commit()
        return {
            "user_id": user_id,
            "status": "suspended",
            "audit_log_id": audit_entry.audit_log_id,
        }

    @staticmethod
    def reinstate_account(
        db: Session,
        *,
        admin_user: User,
        user_id: uuid.UUID,
        reason_code: str,
    ) -> Dict[str, Any]:
        """Reinstates a previously suspended account."""
        target_user = db.query(User).filter(User.user_id == user_id).first()
        if not target_user:
            raise HTTPException(status_code=404, detail="USER_NOT_FOUND")

        if target_user.status != "suspended":
            raise HTTPException(status_code=409, detail="ACCOUNT_NOT_SUSPENDED")

        target_user.status = "active"
        target_user.updated_at = datetime.now(timezone.utc)

        history = AccountStatusHistory(
            status_history_id=uuid.uuid4(),
            user_id=user_id,
            status="active",
            reason_code=reason_code,
            changed_by=admin_user.user_id,
            changed_at=datetime.now(timezone.utc),
        )
        db.add(history)

        audit_entry = AuditService.log_action(
            db,
            actor_id=admin_user.user_id,
            actor_role=admin_user.role,
            action_type="REINSTATE_ACCOUNT",
            target_entity_type="user",
            target_entity_id=user_id,
            justification=f"Reason: {reason_code}",
        )

        db.commit()
        return {
            "user_id": user_id,
            "status": "active",
            "audit_log_id": audit_entry.audit_log_id,
        }

    @staticmethod
    def update_account(
        db: Session,
        *,
        admin_user: User,
        user_id: uuid.UUID,
        full_name: Optional[str] = None,
        role: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Edits account profile fields or reassigns role."""
        target_user = db.query(User).filter(User.user_id == user_id).first()
        if not target_user:
            raise HTTPException(status_code=404, detail="USER_NOT_FOUND")

        updated_fields = []
        if full_name is not None:
            target_user.full_name = full_name
            updated_fields.append("full_name")
        if role is not None:
            target_user.role = role
            updated_fields.append("role")

        if not updated_fields:
            raise HTTPException(status_code=400, detail="VALIDATION_ERROR: No fields to update")

        target_user.updated_at = datetime.now(timezone.utc)

        audit_entry = AuditService.log_action(
            db,
            actor_id=admin_user.user_id,
            actor_role=admin_user.role,
            action_type="UPDATE_ACCOUNT",
            target_entity_type="user",
            target_entity_id=user_id,
            justification=f"Updated fields: {', '.join(updated_fields)}",
        )

        db.commit()
        return {
            "user_id": user_id,
            "updated_fields": updated_fields,
            "audit_log_id": audit_entry.audit_log_id,
        }


# ─────────────────────────────────────────────────────────────────────────────
# Admin (Operations) Service (BRD FR-20 to FR-22, API §3.8)
# ─────────────────────────────────────────────────────────────────────────────

class AdminService:
    """
    Operations Admin capabilities:
    - Dashboard summary metrics
    - Partner pharmacy onboarding & management
    - Dispute resolution & route overrides
    - Doctor verification queue oversight
    - Cannot create other Admin/Super Admin accounts or change system-wide config
    """

    @staticmethod
    def get_dashboard_summary(db: Session) -> Dict[str, Any]:
        """Returns aggregate operational KPIs for the admin dashboard."""
        today_start = datetime.now(timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0
        )

        # Orders placed today
        orders_today = (
            db.query(func.count(Order.order_id))
            .filter(Order.created_at >= today_start)
            .scalar()
        ) or 0

        # Fulfillment SLA breach count (orders older than 24h still not delivered)
        sla_cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
        sla_breach_count = (
            db.query(func.count(Order.order_id))
            .filter(
                Order.created_at <= sla_cutoff,
                Order.status.in_(["placed", "processing"]),
            )
            .scalar()
        ) or 0

        # Doctor verification queue depth
        queue_depth = (
            db.query(func.count(Prescription.prescription_id))
            .filter(Prescription.verification_status == "pending_review")
            .scalar()
        ) or 0

        # 30-day payment success rate
        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
        total_captures = (
            db.query(func.count(PaymentCapture.capture_id))
            .filter(PaymentCapture.captured_at >= thirty_days_ago)
            .scalar()
        ) or 0
        successful_captures = (
            db.query(func.count(PaymentCapture.capture_id))
            .filter(
                PaymentCapture.captured_at >= thirty_days_ago,
                PaymentCapture.status == "captured",
            )
            .scalar()
        ) or 0
        success_rate = (
            round(successful_captures / total_captures * 100, 2) if total_captures > 0 else 0.0
        )

        return {
            "orders_today": orders_today,
            "fulfillment_sla_breach_count": sla_breach_count,
            "doctor_verification_queue_depth": queue_depth,
            "payment_success_rate_30d": success_rate,
        }

    @staticmethod
    def list_partner_pharmacies(
        db: Session,
        *,
        status_filter: Optional[str] = None,
        limit: int = 20,
        cursor: Optional[str] = None,
    ) -> Tuple[List[PartnerPharmacy], Optional[str]]:
        """Lists onboarded partner pharmacies with optional status filter."""
        query = db.query(PartnerPharmacy)

        if status_filter:
            query = query.filter(PartnerPharmacy.status == status_filter)

        if cursor:
            try:
                cursor_uuid = uuid.UUID(cursor)
                query = query.filter(PartnerPharmacy.partner_id > cursor_uuid)
            except (ValueError, TypeError):
                pass

        query = query.order_by(PartnerPharmacy.partner_id)
        partners = query.limit(limit + 1).all()

        next_cursor = None
        if len(partners) > limit:
            partners = partners[:limit]
            next_cursor = str(partners[-1].partner_id)

        return partners, next_cursor

    @staticmethod
    def create_partner_pharmacy(
        db: Session,
        *,
        admin_user: User,
        name: str,
        address: Dict[str, Any],
        fulfillment_radius_km: float,
        catalog_feed_url: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Onboards a new partner pharmacy."""
        partner = PartnerPharmacy(
            partner_id=uuid.uuid4(),
            name=name,
            address=address,
            fulfillment_radius_km=fulfillment_radius_km,
            catalog_feed_url=catalog_feed_url,
            status="pending_activation",
            created_at=datetime.now(timezone.utc),
        )
        db.add(partner)

        audit_entry = AuditService.log_action(
            db,
            actor_id=admin_user.user_id,
            actor_role=admin_user.role,
            action_type="CREATE_PARTNER_PHARMACY",
            target_entity_type="partner_pharmacy",
            target_entity_id=partner.partner_id,
            justification=f"Onboarded partner: {name}",
        )

        db.commit()
        return {
            "partner_id": partner.partner_id,
            "status": partner.status,
            "audit_log_id": audit_entry.audit_log_id,
        }

    @staticmethod
    def update_partner_pharmacy(
        db: Session,
        *,
        admin_user: User,
        partner_id: uuid.UUID,
        update_status: Optional[str] = None,
        fulfillment_radius_km: Optional[float] = None,
    ) -> Dict[str, Any]:
        """Updates partner pharmacy status or delivery radius."""
        partner = (
            db.query(PartnerPharmacy)
            .filter(PartnerPharmacy.partner_id == partner_id)
            .first()
        )
        if not partner:
            raise HTTPException(status_code=404, detail="PARTNER_NOT_FOUND")

        updated_fields = []
        if update_status is not None:
            partner.status = update_status
            updated_fields.append("status")
        if fulfillment_radius_km is not None:
            partner.fulfillment_radius_km = fulfillment_radius_km
            updated_fields.append("fulfillment_radius_km")

        audit_entry = AuditService.log_action(
            db,
            actor_id=admin_user.user_id,
            actor_role=admin_user.role,
            action_type="UPDATE_PARTNER_PHARMACY",
            target_entity_type="partner_pharmacy",
            target_entity_id=partner_id,
            justification=f"Updated: {', '.join(updated_fields)}",
        )

        db.commit()
        return {
            "partner_id": partner_id,
            "status": partner.status,
            "audit_log_id": audit_entry.audit_log_id,
        }

    @staticmethod
    def list_overdue_verifications(db: Session) -> List[Dict[str, Any]]:
        """Lists verification queue items exceeding the 12-hour SLA target."""
        sla_cutoff = datetime.now(timezone.utc) - timedelta(hours=12)

        results = (
            db.query(Prescription, Document)
            .join(Document, Prescription.document_id == Document.document_id)
            .filter(
                Prescription.verification_status == "pending_review",
                Document.uploaded_at <= sla_cutoff,
            )
            .order_by(Document.uploaded_at.asc())
            .all()
        )

        items = []
        for prescription, document in results:
            hours_overdue = (
                datetime.now(timezone.utc) - document.uploaded_at
            ).total_seconds() / 3600 - 12
            items.append({
                "prescription_id": prescription.prescription_id,
                "queued_at": document.uploaded_at,
                "hours_overdue": round(max(0, hours_overdue), 1),
                "assigned_doctor_id": prescription.assigned_doctor_id
                if hasattr(prescription, "assigned_doctor_id") else None,
            })

        return items


# ─────────────────────────────────────────────────────────────────────────────
# Super Admin Service (BRD FR-26 to FR-29, API §3.10)
# ─────────────────────────────────────────────────────────────────────────────

class SuperAdminService:
    """
    Super Admin capabilities:
    - Create/revoke Admin and User Admin accounts with granular permissions
    - Configure platform-wide settings
    - Compliance overrides (with mandatory justification)
    - Full audit log access
    - N/A — highest authority, but every action is audit-logged
    """

    @staticmethod
    def create_admin_account(
        db: Session,
        *,
        super_admin: User,
        full_name: str,
        email: str,
        role: str,
        permissions: List[str],
    ) -> Dict[str, Any]:
        """Creates a new Admin or User Admin account with granular permissions."""
        if role not in ("admin", "user_admin"):
            raise HTTPException(
                status_code=400,
                detail="VALIDATION_ERROR: Role must be 'admin' or 'user_admin'",
            )

        # Check for existing email
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            raise HTTPException(status_code=409, detail="EMAIL_ALREADY_EXISTS")

        # Create user account with a temporary password
        new_user = User(
            user_id=uuid.uuid4(),
            role=role,
            full_name=full_name,
            email=email,
            password_hash=hash_password("TempPassword2026!"),
            status="active",
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db.add(new_user)
        db.flush()

        # Assign granular permissions
        for perm_code in permissions:
            # Find or create permission
            perm = db.query(Permission).filter(Permission.code == perm_code).first()
            if not perm:
                perm = Permission(
                    permission_id=uuid.uuid4(),
                    code=perm_code,
                    description=f"Permission: {perm_code}",
                )
                db.add(perm)
                db.flush()

            admin_perm = AdminPermission(
                user_id=new_user.user_id,
                permission_id=perm.permission_id,
                granted_by=super_admin.user_id,
                granted_at=datetime.now(timezone.utc),
            )
            db.add(admin_perm)

        audit_entry = AuditService.log_action(
            db,
            actor_id=super_admin.user_id,
            actor_role=super_admin.role,
            action_type="CREATE_ADMIN_ACCOUNT",
            target_entity_type="user",
            target_entity_id=new_user.user_id,
            justification=f"Created {role} account with permissions: {', '.join(permissions)}",
        )

        db.commit()
        return {
            "user_id": new_user.user_id,
            "role": role,
            "audit_log_id": audit_entry.audit_log_id,
        }

    @staticmethod
    def update_admin_permissions(
        db: Session,
        *,
        super_admin: User,
        admin_id: uuid.UUID,
        permissions: List[str],
    ) -> Dict[str, Any]:
        """Updates the granular permission set (full replacement) for an Admin/User Admin."""
        target_user = db.query(User).filter(User.user_id == admin_id).first()
        if not target_user:
            raise HTTPException(status_code=404, detail="USER_NOT_FOUND")

        if target_user.role not in ("admin", "user_admin"):
            raise HTTPException(
                status_code=400,
                detail="VALIDATION_ERROR: Target must be an admin or user_admin",
            )

        # Remove all existing permissions
        db.query(AdminPermission).filter(
            AdminPermission.user_id == admin_id
        ).delete()

        # Assign new permissions
        for perm_code in permissions:
            perm = db.query(Permission).filter(Permission.code == perm_code).first()
            if not perm:
                perm = Permission(
                    permission_id=uuid.uuid4(),
                    code=perm_code,
                    description=f"Permission: {perm_code}",
                )
                db.add(perm)
                db.flush()

            admin_perm = AdminPermission(
                user_id=admin_id,
                permission_id=perm.permission_id,
                granted_by=super_admin.user_id,
                granted_at=datetime.now(timezone.utc),
            )
            db.add(admin_perm)

        audit_entry = AuditService.log_action(
            db,
            actor_id=super_admin.user_id,
            actor_role=super_admin.role,
            action_type="UPDATE_ADMIN_PERMISSIONS",
            target_entity_type="user",
            target_entity_id=admin_id,
            justification=f"Permissions replaced with: {', '.join(permissions)}",
        )

        db.commit()
        return {
            "user_id": admin_id,
            "permissions": permissions,
            "audit_log_id": audit_entry.audit_log_id,
        }

    @staticmethod
    def revoke_admin_account(
        db: Session,
        *,
        super_admin: User,
        admin_id: uuid.UUID,
    ) -> Dict[str, Any]:
        """Revokes an Admin or User Admin account."""
        target_user = db.query(User).filter(User.user_id == admin_id).first()
        if not target_user:
            raise HTTPException(status_code=404, detail="USER_NOT_FOUND")

        if target_user.role not in ("admin", "user_admin"):
            raise HTTPException(
                status_code=400,
                detail="VALIDATION_ERROR: Target must be an admin or user_admin",
            )

        target_user.status = "suspended"
        target_user.updated_at = datetime.now(timezone.utc)

        # Record status history
        history = AccountStatusHistory(
            status_history_id=uuid.uuid4(),
            user_id=admin_id,
            status="suspended",
            reason_code="REVOKED_BY_SUPER_ADMIN",
            changed_by=super_admin.user_id,
            changed_at=datetime.now(timezone.utc),
        )
        db.add(history)

        audit_entry = AuditService.log_action(
            db,
            actor_id=super_admin.user_id,
            actor_role=super_admin.role,
            action_type="REVOKE_ADMIN_ACCOUNT",
            target_entity_type="user",
            target_entity_id=admin_id,
        )

        db.commit()
        return {
            "user_id": admin_id,
            "status": "suspended",
            "audit_log_id": audit_entry.audit_log_id,
        }

    @staticmethod
    def get_platform_settings(db: Session) -> Dict[str, Any]:
        """Returns current platform settings with credentials masked."""
        settings = db.query(PlatformSetting).all()
        result: Dict[str, Any] = {
            "commission_rate_pct": None,
            "payment_gateway_credential_ref": None,
            "security_policies": None,
        }
        for s in settings:
            if s.setting_key == "commission_rate_pct":
                result["commission_rate_pct"] = float(s.setting_value)
            elif s.setting_key == "payment_gateway_credential":
                # Never return full credential — mask it
                val = s.setting_value
                result["payment_gateway_credential_ref"] = (
                    val[:4] + "****" + val[-4:] if len(val) > 8 else "****"
                )
            elif s.setting_key == "security_policies":
                import json
                try:
                    result["security_policies"] = json.loads(s.setting_value)
                except (json.JSONDecodeError, TypeError):
                    result["security_policies"] = {"raw": s.setting_value}

        return result

    @staticmethod
    def update_platform_settings(
        db: Session,
        *,
        super_admin: User,
        commission_rate_pct: Optional[float] = None,
        payment_gateway_credential: Optional[str] = None,
        security_policies: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Updates platform-wide settings with versioning."""
        import json

        updated_fields = []

        def _upsert_setting(key: str, value: str, admin_id: uuid.UUID) -> None:
            existing = db.query(PlatformSetting).filter(
                PlatformSetting.setting_key == key
            ).first()
            if existing:
                existing.setting_value = value
                existing.config_version += 1
                existing.updated_by = admin_id
                existing.updated_at = datetime.now(timezone.utc)
            else:
                new_setting = PlatformSetting(
                    setting_key=key,
                    setting_value=value,
                    config_version=1,
                    updated_by=admin_id,
                    updated_at=datetime.now(timezone.utc),
                )
                db.add(new_setting)

        if commission_rate_pct is not None:
            _upsert_setting("commission_rate_pct", str(commission_rate_pct), super_admin.user_id)
            updated_fields.append("commission_rate_pct")

        if payment_gateway_credential is not None:
            _upsert_setting("payment_gateway_credential", payment_gateway_credential, super_admin.user_id)
            updated_fields.append("payment_gateway_credential")

        if security_policies is not None:
            _upsert_setting("security_policies", json.dumps(security_policies), super_admin.user_id)
            updated_fields.append("security_policies")

        if not updated_fields:
            raise HTTPException(status_code=400, detail="VALIDATION_ERROR: No settings to update")

        # Get current max config_version
        max_version = (
            db.query(func.max(PlatformSetting.config_version)).scalar()
        ) or 1

        audit_entry = AuditService.log_action(
            db,
            actor_id=super_admin.user_id,
            actor_role=super_admin.role,
            action_type="UPDATE_PLATFORM_SETTINGS",
            target_entity_type="setting",
            target_entity_id=super_admin.user_id,  # Use admin's ID as target for settings
            justification=f"Updated settings: {', '.join(updated_fields)}",
        )

        db.commit()
        return {
            "updated_fields": updated_fields,
            "config_version": max_version,
            "audit_log_id": audit_entry.audit_log_id,
        }

    @staticmethod
    def create_compliance_override(
        db: Session,
        *,
        super_admin: User,
        order_id: uuid.UUID,
        justification: str,
    ) -> Dict[str, Any]:
        """
        Overrides a regulated-order compliance block (BRD FR-28).
        Mandatory justification, logged with full context.
        """
        if not justification or not justification.strip():
            raise HTTPException(status_code=400, detail="JUSTIFICATION_REQUIRED")

        order = db.query(Order).filter(Order.order_id == order_id).first()
        if not order:
            raise HTTPException(status_code=404, detail="ORDER_NOT_FOUND")

        audit_entry = AuditService.log_action(
            db,
            actor_id=super_admin.user_id,
            actor_role=super_admin.role,
            action_type="COMPLIANCE_OVERRIDE",
            target_entity_type="order",
            target_entity_id=order_id,
            justification=justification,
        )

        override = ComplianceOverride(
            override_id=uuid.uuid4(),
            order_id=order_id,
            super_admin_id=super_admin.user_id,
            justification=justification,
            audit_log_id=audit_entry.audit_log_id,
            created_at=datetime.now(timezone.utc),
        )
        db.add(override)

        db.commit()
        return {
            "override_id": override.override_id,
            "order_id": order_id,
            "audit_log_id": audit_entry.audit_log_id,
        }

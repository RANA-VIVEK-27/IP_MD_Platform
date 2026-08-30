"""
Pydantic schemas for all Admin Panel APIs (M10).
Covers User Admin (§3.9), Admin/Operations (§3.8), and Super Admin (§3.10) tiers.
"""

from uuid import UUID
from datetime import datetime
from typing import Optional, List, Dict, Any

from pydantic import BaseModel, ConfigDict, Field


# ─── Shared / Audit ─────────────────────────────────────────────────────────

class AuditLogEntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    audit_log_id: UUID
    actor_id: Optional[UUID] = None
    actor_role: str
    action_type: str
    target_entity_type: str
    target_entity_id: UUID
    justification: Optional[str] = None
    timestamp: datetime


class AuditLogQueryResponse(BaseModel):
    data: List[AuditLogEntryResponse]
    next_cursor: Optional[str] = None


# ─── Admin Dashboard (§3.8) ─────────────────────────────────────────────────

class DashboardSummaryResponse(BaseModel):
    orders_today: int
    fulfillment_sla_breach_count: int
    doctor_verification_queue_depth: int
    payment_success_rate_30d: float


# ─── Partner Pharmacy Management (§3.8) ──────────────────────────────────────

class PartnerPharmacyCreateRequest(BaseModel):
    name: str
    email: str
    password: str = Field(..., min_length=6)
    address: Dict[str, Any]
    fulfillment_radius_km: float = 10.0
    phone: Optional[str] = None
    catalog_feed_url: Optional[str] = None


class PartnerPharmacyUpdateRequest(BaseModel):
    status: Optional[str] = Field(None, description="active | suspended | delisted")
    fulfillment_radius_km: Optional[float] = None


class PartnerPharmacyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    partner_id: UUID
    name: str
    fulfillment_radius_km: Optional[float] = None
    status: str


class PartnerPharmacyListResponse(BaseModel):
    data: List[PartnerPharmacyResponse]
    next_cursor: Optional[str] = None


# ─── Overdue Verification (§3.8) ─────────────────────────────────────────────

class OverdueVerificationItem(BaseModel):
    prescription_id: UUID
    queued_at: datetime
    hours_overdue: float
    assigned_doctor_id: Optional[UUID] = None


class OverdueVerificationResponse(BaseModel):
    data: List[OverdueVerificationItem]


# ─── User Admin: Doctor KYC (§3.9) ───────────────────────────────────────────

class DoctorKYCItem(BaseModel):
    user_id: UUID
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    license_number: str
    submitted_at: datetime
    medical_registration: Optional[dict] = None
    qualification: Optional[dict] = None
    practice_info: Optional[dict] = None
    address: Optional[dict] = None


class DoctorKYCListResponse(BaseModel):
    data: List[DoctorKYCItem]


class DoctorKYCVerifyRequest(BaseModel):
    decision: str = Field(..., description="approve | reject")
    reason: Optional[str] = Field(None, description="Required when decision = reject")


class DoctorKYCVerifyResponse(BaseModel):
    user_id: UUID
    status: str
    audit_log_id: UUID


# ─── User Admin: Account Management (§3.9) ───────────────────────────────────

class AccountSuspendRequest(BaseModel):
    reason_code: str = Field(..., description="Mandatory reason code")


class AccountReinstateRequest(BaseModel):
    reason_code: str = Field(..., description="Mandatory reason code")


class AccountApproveRequest(BaseModel):
    reason_code: str = Field(..., description="Mandatory reason code")


class AccountListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: UUID
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    role: str
    status: str
    created_at: datetime


class AccountListResponse(BaseModel):
    data: List[AccountListItem]
    total: int
    next_cursor: Optional[str] = None


class AccountUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None


class AccountActionResponse(BaseModel):
    user_id: UUID
    status: Optional[str] = None
    updated_fields: Optional[List[str]] = None
    audit_log_id: UUID


# ─── Super Admin: Admin Account Management (§3.10) ───────────────────────────

class AdminCreateRequest(BaseModel):
    full_name: str
    email: str
    role: str = Field(..., description="admin | user_admin")
    permissions: List[str] = Field(..., description="Granular permission codes")


class AdminCreateResponse(BaseModel):
    user_id: UUID
    role: str
    audit_log_id: UUID


class AdminListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    user_id: UUID
    full_name: str
    email: Optional[str] = None
    role: str
    status: str


class AdminListResponse(BaseModel):
    data: List[AdminListItem]
    next_cursor: Optional[str] = None


class PermissionUpdateRequest(BaseModel):
    permissions: List[str] = Field(..., description="Full replacement permission set")


class PermissionUpdateResponse(BaseModel):
    user_id: UUID
    permissions: List[str]
    audit_log_id: UUID


class AdminRevokeResponse(BaseModel):
    user_id: UUID
    status: str
    audit_log_id: UUID


# ─── Super Admin: Platform Settings (§3.10) ──────────────────────────────────

class PlatformSettingsResponse(BaseModel):
    commission_rate_pct: Optional[float] = None
    payment_gateway_credential_ref: Optional[str] = None
    security_policies: Optional[Dict[str, Any]] = None


class PlatformSettingsUpdateRequest(BaseModel):
    commission_rate_pct: Optional[float] = None
    payment_gateway_credential: Optional[str] = None
    security_policies: Optional[Dict[str, Any]] = None


class PlatformSettingsUpdateResponse(BaseModel):
    updated_fields: List[str]
    config_version: int
    audit_log_id: UUID


# ─── Super Admin: Compliance Override (§3.10) ────────────────────────────────

class ComplianceOverrideRequest(BaseModel):
    order_id: UUID
    justification: str = Field(..., description="Mandatory justification text")


class ComplianceOverrideResponse(BaseModel):
    override_id: UUID
    order_id: UUID
    audit_log_id: UUID

import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.identity import User
from app.api.deps import require_roles
from app.services.admin_service import SuperAdminService
from app.services.audit_service import AuditService
from app.schemas.admin import (
    AdminCreateRequest,
    AdminCreateResponse,
    PermissionUpdateRequest,
    PermissionUpdateResponse,
    AdminRevokeResponse,
    PlatformSettingsResponse,
    PlatformSettingsUpdateRequest,
    PlatformSettingsUpdateResponse,
    ComplianceOverrideRequest,
    ComplianceOverrideResponse,
    AuditLogQueryResponse,
    AuditLogEntryResponse,
)

router = APIRouter(prefix="/super-admin", tags=["Super Admin System Control"])


@router.post("/admins", response_model=AdminCreateResponse, status_code=status.HTTP_201_CREATED)
def create_admin_account(
    req: AdminCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin")),
):
    """
    Creates a new Admin or User Admin account and assigns granular permissions (BRD FR-26 / API §3.10).
    """
    res = SuperAdminService.create_admin_account(
        db=db,
        super_admin=current_user,
        full_name=req.full_name,
        email=req.email,
        role=req.role,
        permissions=req.permissions,
    )
    return AdminCreateResponse(**res)


@router.patch("/admins/{admin_id}/permissions", response_model=PermissionUpdateResponse)
def update_admin_permissions(
    admin_id: uuid.UUID,
    req: PermissionUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin")),
):
    """
    Updates the granular permission set assigned to an Admin or User Admin (BRD FR-26 / API §3.10).
    """
    res = SuperAdminService.update_admin_permissions(
        db=db,
        super_admin=current_user,
        admin_id=admin_id,
        permissions=req.permissions,
    )
    return PermissionUpdateResponse(**res)


@router.delete("/admins/{admin_id}", response_model=AdminRevokeResponse)
def revoke_admin_account(
    admin_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin")),
):
    """
    Revokes an Admin or User Admin account (BRD FR-26 / API §3.10).
    """
    res = SuperAdminService.revoke_admin_account(
        db=db,
        super_admin=current_user,
        admin_id=admin_id,
    )
    return AdminRevokeResponse(**res)


@router.get("/settings", response_model=PlatformSettingsResponse)
def get_platform_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin")),
):
    """
    Returns platform-wide settings with credentials masked (BRD FR-27 / API §3.10).
    """
    settings = SuperAdminService.get_platform_settings(db=db)
    return PlatformSettingsResponse(**settings)


@router.patch("/settings", response_model=PlatformSettingsUpdateResponse)
def update_platform_settings(
    req: PlatformSettingsUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin")),
):
    """
    Updates platform-wide settings with version increment and audit trail (BRD FR-27 / API §3.10).
    """
    res = SuperAdminService.update_platform_settings(
        db=db,
        super_admin=current_user,
        commission_rate_pct=req.commission_rate_pct,
        payment_gateway_credential=req.payment_gateway_credential,
        security_policies=req.security_policies,
    )
    return PlatformSettingsUpdateResponse(**res)


@router.post("/compliance-overrides", response_model=ComplianceOverrideResponse, status_code=status.HTTP_201_CREATED)
def create_compliance_override(
    req: ComplianceOverrideRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin")),
):
    """
    Overrides a regulated order compliance block with mandatory justification (BRD FR-28 / API §3.10).
    """
    res = SuperAdminService.create_compliance_override(
        db=db,
        super_admin=current_user,
        order_id=req.order_id,
        justification=req.justification,
    )
    return ComplianceOverrideResponse(**res)


@router.get("/audit-logs", response_model=AuditLogQueryResponse)
def query_audit_logs(
    actor_role: Optional[str] = Query(None, description="Filter by actor role"),
    action_type: Optional[str] = Query(None, description="Filter by action type"),
    date_from: Optional[datetime] = Query(None, description="Range start ISO 8601"),
    date_to: Optional[datetime] = Query(None, description="Range end ISO 8601"),
    limit: int = Query(50, ge=1, le=200),
    cursor: Optional[str] = Query(None, description="Pagination cursor"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin")),
):
    """
    Queries append-only audit log store across all tiers for compliance (BRD FR-29 / API §3.10).
    """
    entries, next_cursor = AuditService.query_audit_logs(
        db=db,
        actor_role=actor_role,
        action_type=action_type,
        date_from=date_from,
        date_to=date_to,
        limit=limit,
        cursor=cursor,
    )
    return AuditLogQueryResponse(
        data=[AuditLogEntryResponse.model_validate(e) for e in entries],
        next_cursor=next_cursor,
    )

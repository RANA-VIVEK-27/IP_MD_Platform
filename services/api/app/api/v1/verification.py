import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.identity import User
from app.api.deps import require_roles, require_approved_doctor
from app.services.verification import VerificationService
from app.services.audit_service import AuditService
from app.services.notification_service import NotificationService
from app.schemas.prescription import (
    VerificationApproveRequest,
    VerificationRejectRequest,
    VerificationActionResponse,
    VerificationQueueResponse,
    VerificationAuditListResponse,
    VerificationAuditEntryResponse,
)
from app.schemas.admin import AuditLogEntryResponse, AuditLogQueryResponse

router = APIRouter(prefix="/verification", tags=["Doctor Verification & Clinical Audit"])


@router.get("/queue", response_model=VerificationQueueResponse)
def get_verification_queue(
    status: Optional[str] = "pending_review",
    limit: int = 20,
    cursor: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_approved_doctor)
):
    """
    Returns the doctor's assigned-and-pending prescriptions queue (BRD FR-9, TRD Item 11).
    """
    items, next_cursor, has_more = VerificationService.get_verification_queue(
        db=db,
        doctor=current_user,
        status_filter=status,
        limit=limit,
        cursor=cursor
    )
    return VerificationQueueResponse(
        data=items,
        next_cursor=next_cursor,
        has_more=has_more
    )


@router.post("/{prescription_id}/approve", response_model=VerificationActionResponse)
def approve_prescription(
    prescription_id: uuid.UUID,
    req: VerificationApproveRequest = VerificationApproveRequest(),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_approved_doctor)
):
    """
    Approves AI-extracted prescription (setting verification_status = doctor_verified).
    Required before linked Schedule H/H1/X items can proceed to checkout (BRD FR-10, TRD Item 12).
    """
    prescription, audit_log_id = VerificationService.approve_prescription(
        db=db,
        doctor=current_user,
        prescription_id=prescription_id,
        notes=req.notes
    )
    db.commit()

    # Dispatch notification to patient
    try:
        NotificationService.create_and_dispatch_notification(
            db=db,
            user_id=prescription.patient_id,
            type="verification_result",
            message=f"Your prescription #{str(prescription_id)[:8]} has been verified and approved by Dr. {current_user.full_name}.",
            related_entity_type="prescription",
            related_entity_id=prescription_id,
        )
    except Exception:
        db.rollback()

    return VerificationActionResponse(
        prescription_id=prescription.prescription_id,
        verification_status=prescription.verification_status,
        audit_log_id=audit_log_id
    )


@router.post("/{prescription_id}/reject", response_model=VerificationActionResponse)
def reject_prescription(
    prescription_id: uuid.UUID,
    req: VerificationRejectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_approved_doctor)
):
    """
    Rejects the prescription with a mandatory reason, blocking dependent order flows (BRD FR-10).
    """
    prescription, audit_log_id = VerificationService.reject_prescription(
        db=db,
        doctor=current_user,
        prescription_id=prescription_id,
        reason=req.reason
    )
    db.commit()

    # Dispatch notification to patient
    try:
        NotificationService.create_and_dispatch_notification(
            db=db,
            user_id=prescription.patient_id,
            type="verification_result",
            message=f"Your prescription #{str(prescription_id)[:8]} was rejected by Dr. {current_user.full_name}. Reason: {req.reason[:200]}",
            related_entity_type="prescription",
            related_entity_id=prescription_id,
        )
    except Exception:
        db.rollback()

    return VerificationActionResponse(
        prescription_id=prescription.prescription_id,
        verification_status=prescription.verification_status,
        audit_log_id=audit_log_id
    )


@router.get("/{prescription_id}/audit-log", response_model=VerificationAuditListResponse)
def get_verification_audit_log(
    prescription_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("doctor", "admin", "user_admin", "super_admin"))
):
    """
    Returns the immutable, timestamped audit trail of verification actions (BRD FR-11, TRD Item 12).
    """
    entries = VerificationService.get_verification_audit_log(
        db=db,
        prescription_id=prescription_id
    )
    return VerificationAuditListResponse(data=entries)


@router.get("/my-audit-log", response_model=AuditLogQueryResponse)
def get_my_audit_log(
    limit: int = Query(50, ge=1, le=200),
    cursor: Optional[str] = Query(None, description="Pagination cursor"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_approved_doctor)
):
    """
    Returns the current doctor's own verification audit trail (BRD FR-11).
    """
    entries, next_cursor = AuditService.query_audit_logs(
        db=db,
        actor_id=current_user.user_id,
        limit=limit,
        cursor=cursor,
    )
    return AuditLogQueryResponse(
        data=[AuditLogEntryResponse.model_validate(e) for e in entries],
        next_cursor=next_cursor,
    )

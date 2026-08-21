import uuid
from typing import Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.identity import User
from app.api.deps import require_roles, require_approved_doctor
from app.services.verification import VerificationService
from app.schemas.prescription import (
    VerificationApproveRequest,
    VerificationRejectRequest,
    VerificationActionResponse,
    VerificationQueueResponse,
    VerificationAuditListResponse,
)

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

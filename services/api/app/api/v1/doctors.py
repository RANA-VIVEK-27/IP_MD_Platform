import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.auth import DoctorApprovalRequest, DoctorLicenseResponse
from app.models.identity import User
from app.api.deps import get_current_user, require_roles, require_approved_doctor
from app.services.auth_service import AuthService

router = APIRouter(prefix="/doctors", tags=["Doctor Management & Verification"])

@router.post("/{user_id}/approve-license", response_model=DoctorLicenseResponse)
def approve_doctor_license(
    user_id: str,
    req: DoctorApprovalRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_roles('user_admin', 'super_admin'))
):
    """User Admin KYC gate to approve or reject doctor medical licenses (BRD Section 5)."""
    try:
        doctor_uuid = uuid.UUID(str(user_id)) if not isinstance(user_id, uuid.UUID) else user_id
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="DOCTOR_LICENSE_NOT_FOUND"
        )
    doc_license = AuthService.approve_doctor_license(
        db,
        doctor_user_id=doctor_uuid,
        verifier_user_id=admin_user.user_id,
        status_str=req.verification_status,
        rejection_reason=req.rejection_reason
    )
    return doc_license

@router.get("/doctor-only-action")
def doctor_only_action(
    current_user: User = Depends(require_approved_doctor)
):
    """Clinical action restricted to verified doctors with approved medical licenses."""
    return {
        "status": "success",
        "message": "Doctor clinical action authorized",
        "doctor_id": str(current_user.user_id)
    }

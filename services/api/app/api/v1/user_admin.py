import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.identity import User
from app.api.deps import require_roles
from app.services.admin_service import UserAdminService
from app.schemas.admin import (
    DoctorKYCListResponse,
    DoctorKYCItem,
    DoctorKYCVerifyRequest,
    DoctorKYCVerifyResponse,
    AccountSuspendRequest,
    AccountReinstateRequest,
    AccountUpdateRequest,
    AccountActionResponse,
)

router = APIRouter(prefix="/user-admin", tags=["User Admin Control"])


@router.get("/doctors/pending-kyc", response_model=DoctorKYCListResponse)
def list_pending_kyc(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("user_admin", "super_admin")),
):
    """
    Lists doctor accounts awaiting KYC license verification (BRD FR-23 / API §3.9).
    """
    pending = UserAdminService.list_pending_kyc_doctors(db=db)
    return DoctorKYCListResponse(data=[DoctorKYCItem(**item) for item in pending])


@router.post("/doctors/{doctor_id}/verify-license", response_model=DoctorKYCVerifyResponse)
def verify_doctor_license(
    doctor_id: uuid.UUID,
    req: DoctorKYCVerifyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("user_admin", "super_admin")),
):
    """
    Verifies a doctor's license and activates the account if approved (BRD FR-23 / API §3.9).
    """
    res = UserAdminService.verify_doctor_license(
        db=db,
        admin_user=current_user,
        doctor_id=doctor_id,
        decision=req.decision,
        reason=req.reason,
    )
    return DoctorKYCVerifyResponse(**res)


@router.post("/accounts/{user_id}/suspend", response_model=AccountActionResponse)
def suspend_account(
    user_id: uuid.UUID,
    req: AccountSuspendRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("user_admin", "super_admin")),
):
    """
    Suspends a patient, doctor, or pharmacy staff account with mandatory reason (BRD FR-24 / API §3.9).
    """
    res = UserAdminService.suspend_account(
        db=db,
        admin_user=current_user,
        user_id=user_id,
        reason_code=req.reason_code,
    )
    return AccountActionResponse(**res)


@router.post("/accounts/{user_id}/reinstate", response_model=AccountActionResponse)
def reinstate_account(
    user_id: uuid.UUID,
    req: AccountReinstateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("user_admin", "super_admin")),
):
    """
    Reinstates a previously suspended account (BRD FR-24 / API §3.9).
    """
    res = UserAdminService.reinstate_account(
        db=db,
        admin_user=current_user,
        user_id=user_id,
        reason_code=req.reason_code,
    )
    return AccountActionResponse(**res)


@router.patch("/accounts/{user_id}", response_model=AccountActionResponse)
def update_account(
    user_id: uuid.UUID,
    req: AccountUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("user_admin", "super_admin")),
):
    """
    Updates profile fields or reassigns user role (BRD FR-24 / API §3.9).
    """
    res = UserAdminService.update_account(
        db=db,
        admin_user=current_user,
        user_id=user_id,
        full_name=req.full_name,
        role=req.role,
    )
    return AccountActionResponse(**res)

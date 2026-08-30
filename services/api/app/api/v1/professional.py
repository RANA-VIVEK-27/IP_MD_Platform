"""
Professional onboarding API: registration, verification, credentials, organization membership.
"""
from typing import Optional, List
from uuid import UUID
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.db.session import get_db
from app.api.deps import get_current_user, require_roles
from app.models.identity import User
from app.services.professional_service import ProfessionalService
from app.services.audit_service import AuditService

router = APIRouter(prefix="/professional", tags=["Professional Onboarding"])


# ─── Schemas ────────────────────────────────────────────────────────────────

class CredentialCreateRequest(BaseModel):
    credential_type: str = Field(..., description="medical_registration, pharmacy_registration, degree, license, other")
    credential_name: Optional[str] = None
    issuing_authority: Optional[str] = None
    registration_number: Optional[str] = None
    state: Optional[str] = None
    issue_date: Optional[str] = None
    expiry_date: Optional[str] = None
    document_id: Optional[str] = None

class CredentialVerifyRequest(BaseModel):
    status: str = Field(..., description="verified or rejected")
    notes: Optional[str] = None

class StaffInviteRequest(BaseModel):
    email: str
    role: str = Field(default="staff", description="staff, pharmacist, manager")

class InfoRequestModel(BaseModel):
    reason: str
    requested_fields: Optional[List[str]] = None
    requested_documents: Optional[List[str]] = None

class ResubmitRequest(BaseModel):
    application_data: dict


# ─── Professional Status ────────────────────────────────────────────────────

@router.get("/status")
def get_professional_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's professional verification status."""
    return ProfessionalService.get_professional_status(db, current_user.user_id)


# ─── Verification Requests ──────────────────────────────────────────────────

@router.get("/verification/pending")
def list_pending_verifications(
    request_type: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(require_roles('admin', 'user_admin', 'super_admin')),
    db: Session = Depends(get_db)
):
    """List pending verification requests (admin only)."""
    return ProfessionalService.list_pending_verifications(
        db, request_type=request_type, status_filter=status_filter, limit=limit, offset=offset
    )

@router.post("/verification/{request_id}/review")
def review_verification(
    request_id: str,
    decision: str = Query(..., description="verified or rejected"),
    rejection_reason: Optional[str] = Query(None),
    current_user: User = Depends(require_roles('admin', 'user_admin', 'super_admin')),
    db: Session = Depends(get_db)
):
    """Approve or reject a verification request."""
    vr = ProfessionalService.review_verification(
        db, request_id, current_user.user_id, decision, rejection_reason
    )
    AuditService.log_action(
        db, actor_id=current_user.user_id, actor_role=current_user.role,
        action_type=f'VERIFICATION_{decision.upper()}',
        target_entity_type='verification_request', target_entity_id=str(vr.request_id),
        justification=rejection_reason
    )
    return {'request_id': vr.request_id, 'status': vr.status}

@router.post("/verification/{request_id}/request-info")
def request_info(
    request_id: str,
    body: InfoRequestModel,
    current_user: User = Depends(require_roles('admin', 'user_admin', 'super_admin')),
    db: Session = Depends(get_db)
):
    """Request additional information from applicant."""
    vr = ProfessionalService.request_information(
        db, request_id, current_user.user_id, body.reason,
        body.requested_fields, body.requested_documents
    )
    AuditService.log_action(
        db, actor_id=current_user.user_id, actor_role=current_user.role,
        action_type='INFORMATION_REQUESTED',
        target_entity_type='verification_request', target_entity_id=str(vr.request_id),
        justification=body.reason
    )
    return {'request_id': vr.request_id, 'status': vr.status}

@router.post("/verification/resubmit")
def resubmit_application(
    body: ResubmitRequest,
    current_user: User = Depends(require_roles('doctor', 'pharmacist', 'pharmacy_admin')),
    db: Session = Depends(get_db)
):
    """Resubmit application after information request."""
    vr = ProfessionalService.resubmit_application(
        db, current_user.user_id, body.application_data
    )
    AuditService.log_action(
        db, actor_id=current_user.user_id, actor_role=current_user.role,
        action_type='APPLICATION_RESUBMITTED',
        target_entity_type='verification_request', target_entity_id=str(vr.request_id)
    )
    return {'request_id': vr.request_id, 'status': vr.status}


# ─── Credential Management ──────────────────────────────────────────────────

@router.post("/credentials", status_code=status.HTTP_201_CREATED)
def add_credential(
    body: CredentialCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a professional credential."""
    cred = ProfessionalService.add_credential(
        db, current_user.user_id, body.credential_type, body.credential_name,
        body.issuing_authority, body.registration_number, body.state,
        body.issue_date, body.expiry_date, body.document_id
    )
    return {'credential_id': cred.credential_id, 'status': cred.status}

@router.get("/credentials")
def list_credentials(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List current user's credentials."""
    creds = ProfessionalService.list_user_credentials(db, current_user.user_id)
    return {'credentials': [
        {
            'credential_id': c.credential_id,
            'credential_type': c.credential_type,
            'credential_name': c.credential_name,
            'issuing_authority': c.issuing_authority,
            'registration_number': c.registration_number,
            'status': c.status,
            'verified_at': c.verified_at,
        }
        for c in creds
    ]}

@router.post("/credentials/{credential_id}/verify")
def verify_credential(
    credential_id: str,
    body: CredentialVerifyRequest,
    current_user: User = Depends(require_roles('admin', 'user_admin', 'super_admin')),
    db: Session = Depends(get_db)
):
    """Verify or reject a credential."""
    cred = ProfessionalService.verify_credential(
        db, credential_id, current_user.user_id, body.status, body.notes
    )
    AuditService.log_action(
        db, actor_id=current_user.user_id, actor_role=current_user.role,
        action_type=f'CREDENTIAL_{body.status.upper()}',
        target_entity_type='professional_credential', target_entity_id=str(cred.credential_id)
    )
    return {'credential_id': cred.credential_id, 'status': cred.status}


# ─── Organization Membership ────────────────────────────────────────────────

@router.post("/organizations/{org_id}/invite")
def invite_staff(
    org_id: str,
    body: StaffInviteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Invite a staff member to an organization."""
    membership = ProfessionalService.invite_staff(
        db, current_user.user_id, org_id, body.email, body.role
    )
    AuditService.log_action(
        db, actor_id=current_user.user_id, actor_role=current_user.role,
        action_type='STAFF_INVITED',
        target_entity_type='organization_membership', target_entity_id=str(membership.membership_id)
    )
    return {
        'membership_id': membership.membership_id,
        'invitation_token': membership.invitation_token,
        'status': membership.status
    }

@router.post("/invitations/{token}/accept")
def accept_invitation(
    token: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Accept a staff invitation."""
    membership = ProfessionalService.accept_invitation(
        db, current_user.user_id, token
    )
    AuditService.log_action(
        db, actor_id=current_user.user_id, actor_role=current_user.role,
        action_type='STAFF_ACCEPTED',
        target_entity_type='organization_membership', target_entity_id=str(membership.membership_id)
    )
    return {'membership_id': membership.membership_id, 'status': membership.status}

@router.post("/memberships/{membership_id}/revoke")
def revoke_membership(
    membership_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Revoke a staff membership."""
    membership = ProfessionalService.revoke_membership(
        db, membership_id, current_user.user_id
    )
    AuditService.log_action(
        db, actor_id=current_user.user_id, actor_role=current_user.role,
        action_type='STAFF_REVOKED',
        target_entity_type='organization_membership', target_entity_id=str(membership.membership_id)
    )
    return {'membership_id': membership.membership_id, 'status': membership.status}

@router.get("/organizations/{org_id}/members")
def list_org_members(
    org_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List members of an organization."""
    members = ProfessionalService.list_organization_members(db, org_id)
    return {'members': members}

"""
Professional onboarding service: registration, verification, credentials, organization membership, staff invitations.
"""
import uuid
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Any, Dict, List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text as sql_text, and_, or_

from app.models.identity import (
    User, DoctorLicense, PharmacyProfile, ProfessionalCredential,
    Organization, OrganizationMembership, VerificationRequest, AccountStatusHistory
)
from app.services.audit_service import AuditService


class ProfessionalService:

    # ─── Verification Request Management ────────────────────────────────────

    @staticmethod
    def get_verification_request(db: Session, user_id: Any) -> Optional[VerificationRequest]:
        """Get the latest verification request for a user."""
        user_uuid = uuid.UUID(str(user_id)) if not isinstance(user_id, uuid.UUID) else user_id
        return db.query(VerificationRequest).filter(
            VerificationRequest.user_id == user_uuid
        ).order_by(VerificationRequest.created_at.desc()).first()

    @staticmethod
    def list_pending_verifications(
        db: Session,
        request_type: Optional[str] = None,
        status_filter: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> Dict[str, Any]:
        """List verification requests for admin review."""
        query = db.query(VerificationRequest).filter(
            VerificationRequest.status.in_(['submitted', 'under_review', 'needs_information', 'resubmitted'])
        )
        if request_type:
            query = query.filter(VerificationRequest.request_type == request_type)
        if status_filter:
            query = query.filter(VerificationRequest.status == status_filter)

        total = query.count()
        items = query.order_by(VerificationRequest.submitted_at.asc()).offset(offset).limit(limit).all()

        results = []
        for vr in items:
            user = db.query(User).filter(User.user_id == vr.user_id).first()
            results.append({
                'request_id': vr.request_id,
                'user_id': vr.user_id,
                'user_name': user.full_name if user else None,
                'user_email': user.email if user else None,
                'request_type': vr.request_type,
                'status': vr.status,
                'submitted_at': vr.submitted_at,
                'application_data': vr.application_data,
            })

        return {'items': results, 'total': total, 'limit': limit, 'offset': offset}

    @staticmethod
    def review_verification(
        db: Session,
        request_id: Any,
        reviewer_id: Any,
        decision: str,
        rejection_reason: Optional[str] = None
    ) -> VerificationRequest:
        """Approve or reject a verification request."""
        req_uuid = uuid.UUID(str(request_id)) if not isinstance(request_id, uuid.UUID) else request_id
        reviewer_uuid = uuid.UUID(str(reviewer_id)) if not isinstance(reviewer_id, uuid.UUID) else reviewer_id

        vr = db.query(VerificationRequest).filter(VerificationRequest.request_id == req_uuid).first()
        if not vr:
            raise HTTPException(status_code=404, detail="VERIFICATION_REQUEST_NOT_FOUND")

        if vr.status not in ('submitted', 'under_review', 'needs_information', 'resubmitted'):
            raise HTTPException(status_code=400, detail=f"CANNOT_REVIEW_STATUS: {vr.status}")

        if decision not in ('verified', 'rejected'):
            raise HTTPException(status_code=400, detail="DECISION_MUST_BE_VERIFIED_OR_REJECTED")

        now = datetime.now(timezone.utc)
        vr.status = decision
        vr.reviewed_by = reviewer_uuid
        vr.reviewed_at = now
        vr.decision_at = now
        if decision == 'rejected' and rejection_reason:
            vr.rejection_reason = rejection_reason

        # Update user's professional_status and status
        user = db.query(User).filter(User.user_id == vr.user_id).first()
        if user:
            if decision == 'verified':
                user.professional_status = 'verified'
                user.status = 'active'
            elif decision == 'rejected':
                user.professional_status = 'rejected'
                user.status = 'suspended'

            # Update doctor license if applicable
            if vr.request_type == 'doctor':
                doc_license = db.query(DoctorLicense).filter(DoctorLicense.user_id == user.user_id).first()
                if doc_license:
                    doc_license.verification_status = 'approved' if decision == 'verified' else 'rejected'
                    doc_license.verified_by = reviewer_uuid
                    doc_license.verified_at = now
                    if decision == 'rejected':
                        doc_license.rejection_reason = rejection_reason

            # Create account status history
            status_hist = AccountStatusHistory(
                user_id=user.user_id,
                status=user.status,
                reason_code=f'verification_{decision}',
                changed_by=reviewer_uuid,
                changed_at=now
            )
            db.add(status_hist)

        db.add(vr)
        db.commit()
        db.refresh(vr)
        return vr

    @staticmethod
    def request_information(
        db: Session,
        request_id: Any,
        reviewer_id: Any,
        reason: str,
        requested_fields: Optional[List[str]] = None,
        requested_documents: Optional[List[str]] = None
    ) -> VerificationRequest:
        """Request additional information from applicant."""
        req_uuid = uuid.UUID(str(request_id)) if not isinstance(request_id, uuid.UUID) else request_id
        reviewer_uuid = uuid.UUID(str(reviewer_id)) if not isinstance(reviewer_id, uuid.UUID) else reviewer_id

        vr = db.query(VerificationRequest).filter(VerificationRequest.request_id == req_uuid).first()
        if not vr:
            raise HTTPException(status_code=404, detail="VERIFICATION_REQUEST_NOT_FOUND")

        if vr.status not in ('submitted', 'under_review'):
            raise HTTPException(status_code=400, detail=f"CANNOT_REQUEST_INFO_STATUS: {vr.status}")

        now = datetime.now(timezone.utc)
        vr.status = 'needs_information'
        vr.reviewed_by = reviewer_uuid
        vr.reviewed_at = now
        vr.requested_info = {
            'reason': reason,
            'requested_fields': requested_fields or [],
            'requested_documents': requested_documents or [],
            'requested_at': now.isoformat(),
        }

        # Update user's professional_status
        user = db.query(User).filter(User.user_id == vr.user_id).first()
        if user:
            user.professional_status = 'needs_information'

        db.add(vr)
        db.commit()
        db.refresh(vr)
        return vr

    @staticmethod
    def resubmit_application(
        db: Session,
        user_id: Any,
        application_data: Dict[str, Any]
    ) -> VerificationRequest:
        """Resubmit application after requesting information."""
        user_uuid = uuid.UUID(str(user_id)) if not isinstance(user_id, uuid.UUID) else user_id

        vr = db.query(VerificationRequest).filter(
            VerificationRequest.user_id == user_uuid,
            VerificationRequest.status == 'needs_information'
        ).order_by(VerificationRequest.created_at.desc()).first()

        if not vr:
            raise HTTPException(status_code=404, detail="NO_PENDING_INFO_REQUEST")

        now = datetime.now(timezone.utc)
        vr.status = 'resubmitted'
        vr.application_data = application_data
        vr.submitted_at = now
        vr.updated_at = now

        # Update user
        user = db.query(User).filter(User.user_id == user_uuid).first()
        if user:
            user.professional_status = 'resubmitted'

        db.add(vr)
        db.commit()
        db.refresh(vr)
        return vr

    # ─── Credential Management ──────────────────────────────────────────────

    @staticmethod
    def add_credential(
        db: Session,
        user_id: Any,
        credential_type: str,
        credential_name: Optional[str] = None,
        issuing_authority: Optional[str] = None,
        registration_number: Optional[str] = None,
        state: Optional[str] = None,
        issue_date: Optional[str] = None,
        expiry_date: Optional[str] = None,
        document_id: Optional[Any] = None
    ) -> ProfessionalCredential:
        """Add a professional credential."""
        user_uuid = uuid.UUID(str(user_id)) if not isinstance(user_id, uuid.UUID) else user_id

        # Check for duplicate registration number
        if registration_number:
            existing = db.query(ProfessionalCredential).filter(
                ProfessionalCredential.registration_number == registration_number,
                ProfessionalCredential.credential_type == credential_type,
                ProfessionalCredential.status.in_(['pending', 'verified'])
            ).first()
            if existing:
                raise HTTPException(
                    status_code=400,
                    detail="DUPLICATE_REGISTRATION_NUMBER: This registration number already exists"
                )

        credential = ProfessionalCredential(
            user_id=user_uuid,
            credential_type=credential_type,
            credential_name=credential_name,
            issuing_authority=issuing_authority,
            registration_number=registration_number,
            state=state,
            issue_date=issue_date,
            expiry_date=expiry_date,
            document_id=uuid.UUID(str(document_id)) if document_id else None,
            status='pending'
        )
        db.add(credential)
        db.commit()
        db.refresh(credential)
        return credential

    @staticmethod
    def list_user_credentials(db: Session, user_id: Any) -> List[ProfessionalCredential]:
        """List all credentials for a user."""
        user_uuid = uuid.UUID(str(user_id)) if not isinstance(user_id, uuid.UUID) else user_id
        return db.query(ProfessionalCredential).filter(
            ProfessionalCredential.user_id == user_uuid
        ).order_by(ProfessionalCredential.created_at.desc()).all()

    @staticmethod
    def verify_credential(
        db: Session,
        credential_id: Any,
        verifier_id: Any,
        status_str: str,
        notes: Optional[str] = None
    ) -> ProfessionalCredential:
        """Verify or reject a credential."""
        cred_uuid = uuid.UUID(str(credential_id)) if not isinstance(credential_id, uuid.UUID) else credential_id
        verifier_uuid = uuid.UUID(str(verifier_id)) if not isinstance(verifier_id, uuid.UUID) else verifier_id

        cred = db.query(ProfessionalCredential).filter(ProfessionalCredential.credential_id == cred_uuid).first()
        if not cred:
            raise HTTPException(status_code=404, detail="CREDENTIAL_NOT_FOUND")

        if status_str not in ('verified', 'rejected'):
            raise HTTPException(status_code=400, detail="STATUS_MUST_BE_VERIFIED_OR_REJECTED")

        now = datetime.now(timezone.utc)
        cred.status = status_str
        cred.verified_by = verifier_uuid
        cred.verified_at = now
        cred.verification_notes = notes

        db.add(cred)
        db.commit()
        db.refresh(cred)
        return cred

    # ─── Organization Membership ────────────────────────────────────────────

    @staticmethod
    def invite_staff(
        db: Session,
        inviter_id: Any,
        organization_id: Any,
        email: str,
        role: str = 'staff'
    ) -> OrganizationMembership:
        """Invite a staff member to an organization."""
        inviter_uuid = uuid.UUID(str(inviter_id)) if not isinstance(inviter_id, uuid.UUID) else inviter_id
        org_uuid = uuid.UUID(str(organization_id)) if not isinstance(organization_id, uuid.UUID) else organization_id

        # Check inviter is active member
        inviter_membership = db.query(OrganizationMembership).filter(
            OrganizationMembership.user_id == inviter_uuid,
            OrganizationMembership.organization_id == org_uuid,
            OrganizationMembership.status == 'active',
            OrganizationMembership.role.in_(['owner', 'admin'])
        ).first()
        if not inviter_membership:
            raise HTTPException(status_code=403, detail="NOT_AUTHORIZED_TO_INVITE")

        # Check if user with this email exists
        invitee = db.query(User).filter(User.email == email).first()
        token = secrets.token_urlsafe(48)
        now = datetime.now(timezone.utc)

        membership = OrganizationMembership(
            user_id=invitee.user_id if invitee else None,
            organization_id=org_uuid,
            role=role,
            status='invited',
            invited_by=inviter_uuid,
            invited_at=now,
            invitation_token=token,
            invitation_expires_at=now + timedelta(days=7)
        )
        db.add(membership)
        db.commit()
        db.refresh(membership)
        return membership

    @staticmethod
    def accept_invitation(
        db: Session,
        user_id: Any,
        token: str
    ) -> OrganizationMembership:
        """Accept a staff invitation."""
        user_uuid = uuid.UUID(str(user_id)) if not isinstance(user_id, uuid.UUID) else user_id

        membership = db.query(OrganizationMembership).filter(
            OrganizationMembership.invitation_token == token,
            OrganizationMembership.status == 'invited'
        ).first()

        if not membership:
            raise HTTPException(status_code=404, detail="INVITATION_NOT_FOUND_OR_USED")

        if membership.invitation_expires_at and membership.invitation_expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="INVITATION_EXPIRED")

        now = datetime.now(timezone.utc)
        membership.user_id = user_uuid
        membership.status = 'active'
        membership.accepted_at = now

        db.add(membership)
        db.commit()
        db.refresh(membership)
        return membership

    @staticmethod
    def revoke_membership(
        db: Session,
        membership_id: Any,
        revoker_id: Any
    ) -> OrganizationMembership:
        """Revoke a staff membership."""
        mem_uuid = uuid.UUID(str(membership_id)) if not isinstance(membership_id, uuid.UUID) else membership_id

        membership = db.query(OrganizationMembership).filter(
            OrganizationMembership.membership_id == mem_uuid
        ).first()
        if not membership:
            raise HTTPException(status_code=404, detail="MEMBERSHIP_NOT_FOUND")

        membership.status = 'revoked'
        membership.revoked_at = datetime.now(timezone.utc)

        db.add(membership)
        db.commit()
        db.refresh(membership)
        return membership

    @staticmethod
    def list_organization_members(db: Session, organization_id: Any) -> List[Dict[str, Any]]:
        """List all members of an organization."""
        org_uuid = uuid.UUID(str(organization_id)) if not isinstance(organization_id, uuid.UUID) else organization_id

        memberships = db.query(OrganizationMembership).filter(
            OrganizationMembership.organization_id == org_uuid
        ).order_by(OrganizationMembership.created_at.desc()).all()

        results = []
        for m in memberships:
            user = db.query(User).filter(User.user_id == m.user_id).first() if m.user_id else None
            results.append({
                'membership_id': m.membership_id,
                'user_id': m.user_id,
                'user_name': user.full_name if user else None,
                'user_email': user.email if user else None,
                'role': m.role,
                'status': m.status,
                'invited_at': m.invited_at,
                'accepted_at': m.accepted_at,
            })
        return results

    # ─── Professional Status ────────────────────────────────────────────────

    @staticmethod
    def get_professional_status(db: Session, user_id: Any) -> Dict[str, Any]:
        """Get comprehensive professional status for a user."""
        user_uuid = uuid.UUID(str(user_id)) if not isinstance(user_id, uuid.UUID) else user_id

        user = db.query(User).filter(User.user_id == user_uuid).first()
        if not user:
            raise HTTPException(status_code=404, detail="USER_NOT_FOUND")

        result = {
            'user_id': user.user_id,
            'role': user.role,
            'status': user.status,
            'professional_status': user.professional_status,
        }

        # Get latest verification request
        vr = ProfessionalService.get_verification_request(db, user_uuid)
        if vr:
            result['verification_request'] = {
                'request_id': vr.request_id,
                'request_type': vr.request_type,
                'status': vr.status,
                'submitted_at': vr.submitted_at,
                'reviewed_at': vr.reviewed_at,
                'rejection_reason': vr.rejection_reason,
                'requested_info': vr.requested_info,
            }

        # Get credentials
        credentials = ProfessionalService.list_user_credentials(db, user_uuid)
        result['credentials'] = [
            {
                'credential_id': c.credential_id,
                'credential_type': c.credential_type,
                'credential_name': c.credential_name,
                'registration_number': c.registration_number,
                'status': c.status,
            }
            for c in credentials
        ]

        # Get organization memberships
        memberships = db.query(OrganizationMembership).filter(
            OrganizationMembership.user_id == user_uuid
        ).all()
        result['organizations'] = [
            {
                'membership_id': m.membership_id,
                'organization_id': m.organization_id,
                'role': m.role,
                'status': m.status,
            }
            for m in memberships
        ]

        return result

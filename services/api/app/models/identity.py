import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, Text, TIMESTAMP, Enum, ForeignKey, Index, text as sql_text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.db.base import Base

class User(Base):
    __tablename__ = 'users'

    user_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=sql_text("gen_random_uuid()"))
    role = Column(
        Enum(
            'patient', 'doctor', 'pharmacist', 'pharmacy_admin',
            'pharmacy_staff_owned', 'partner_pharmacy',
            'admin', 'user_admin', 'super_admin',
            name='user_role'
        ),
        nullable=False
    )
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=True)
    phone = Column(String(20), unique=True, nullable=True)
    password_hash = Column(String(255), nullable=True)
    oauth_provider = Column(String(20), nullable=True)
    employer_partner_id = Column(UUID(as_uuid=True), ForeignKey('partner_pharmacies.partner_id'), nullable=True)
    status = Column(
        Enum('active', 'pending', 'suspended', name='user_status'),
        nullable=False,
        server_default='pending'
    )
    professional_status = Column(
        Enum('draft', 'submitted', 'under_review', 'needs_information', 'resubmitted',
             'verified', 'active', 'suspended', 'rejected', 'expired',
             name='professional_status_enum'),
        nullable=True
    )
    date_of_birth = Column(String(10), nullable=True)
    address = Column(JSONB, nullable=True)
    mfa_secret = Column(String(64), nullable=True)
    mfa_enabled = Column(Boolean, nullable=False, server_default=sql_text("false"))
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), server_default=sql_text("now()"))
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index('ix_users_role_status', 'role', 'status'),
        Index('ix_users_professional_status', 'professional_status'),
    )


class DoctorLicense(Base):
    __tablename__ = 'doctor_licenses'

    license_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=sql_text("gen_random_uuid()"))
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.user_id'), unique=True, nullable=False)
    license_number = Column(String(50), nullable=False)
    verification_status = Column(
        Enum('pending', 'approved', 'rejected', name='license_verification_status'),
        nullable=False,
        server_default='pending'
    )
    verified_by = Column(UUID(as_uuid=True), ForeignKey('users.user_id'), nullable=True)
    verified_at = Column(TIMESTAMP(timezone=True), nullable=True)
    rejection_reason = Column(Text, nullable=True)


class PharmacyProfile(Base):
    __tablename__ = 'pharmacy_profiles'

    pharmacy_profile_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=sql_text("gen_random_uuid()"))
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.user_id'), unique=True, nullable=False)
    organization_id = Column(UUID(as_uuid=True), ForeignKey('organizations.organization_id'), nullable=True)
    pharmacy_name = Column(String(255), nullable=False)
    address = Column(JSONB, nullable=False)
    gstin = Column(String(20), nullable=True)
    license_type = Column(String(50), nullable=True)
    license_number = Column(String(100), nullable=True)
    license_issuing_authority = Column(String(255), nullable=True)
    license_issue_date = Column(String(10), nullable=True)
    license_expiry_date = Column(String(10), nullable=True)
    pharmacy_type = Column(String(50), nullable=True)  # retail, hospital, chain, other
    responsible_pharmacist_name = Column(String(255), nullable=True)
    responsible_pharmacist_reg_no = Column(String(100), nullable=True)


class ProfessionalCredential(Base):
    __tablename__ = 'professional_credentials'

    credential_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=sql_text("gen_random_uuid()"))
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.user_id'), nullable=False)
    credential_type = Column(String(50), nullable=False)  # medical_registration, pharmacy_registration, degree, license, other
    credential_name = Column(String(255), nullable=True)  # e.g. "MBBS", "D.Pharm"
    issuing_authority = Column(String(255), nullable=True)  # e.g. "State Medical Council", "Pharmacy Council of India"
    registration_number = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    issue_date = Column(String(10), nullable=True)
    expiry_date = Column(String(10), nullable=True)
    document_id = Column(UUID(as_uuid=True), ForeignKey('documents.document_id'), nullable=True)
    status = Column(
        Enum('pending', 'verified', 'rejected', 'expired', name='credential_status_enum'),
        nullable=False,
        server_default='pending'
    )
    verification_method = Column(String(50), nullable=True)  # manual, ocr, external_api
    verified_at = Column(TIMESTAMP(timezone=True), nullable=True)
    verified_by = Column(UUID(as_uuid=True), ForeignKey('users.user_id'), nullable=True)
    verification_notes = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), server_default=sql_text("now()"))
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index('ix_professional_credentials_user', 'user_id'),
        Index('ix_professional_credentials_type', 'credential_type'),
        Index('ix_professional_credentials_reg_number', 'registration_number'),
    )


class Organization(Base):
    __tablename__ = 'organizations'

    organization_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=sql_text("gen_random_uuid()"))
    name = Column(String(255), nullable=False)
    trade_name = Column(String(255), nullable=True)
    organization_type = Column(String(50), nullable=False)  # pharmacy, hospital, chain
    business_type = Column(String(50), nullable=True)  # retail, hospital_pharmacy, chain, other
    address = Column(JSONB, nullable=True)
    contact_email = Column(String(255), nullable=True)
    contact_phone = Column(String(20), nullable=True)
    gstin = Column(String(20), nullable=True)
    status = Column(
        Enum('pending', 'active', 'suspended', 'rejected', name='organization_status_enum'),
        nullable=False,
        server_default='pending'
    )
    verified_at = Column(TIMESTAMP(timezone=True), nullable=True)
    verified_by = Column(UUID(as_uuid=True), ForeignKey('users.user_id'), nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), server_default=sql_text("now()"))
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))


class OrganizationMembership(Base):
    __tablename__ = 'organization_memberships'

    membership_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=sql_text("gen_random_uuid()"))
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.user_id'), nullable=False)
    organization_id = Column(UUID(as_uuid=True), ForeignKey('organizations.organization_id'), nullable=False)
    role = Column(String(50), nullable=False)  # owner, admin, pharmacist, manager, staff
    status = Column(
        Enum('invited', 'pending', 'active', 'suspended', 'revoked', name='membership_status_enum'),
        nullable=False,
        server_default='invited'
    )
    invited_by = Column(UUID(as_uuid=True), ForeignKey('users.user_id'), nullable=True)
    invited_at = Column(TIMESTAMP(timezone=True), nullable=True)
    accepted_at = Column(TIMESTAMP(timezone=True), nullable=True)
    revoked_at = Column(TIMESTAMP(timezone=True), nullable=True)
    invitation_token = Column(String(128), unique=True, nullable=True)
    invitation_expires_at = Column(TIMESTAMP(timezone=True), nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), server_default=sql_text("now()"))

    __table_args__ = (
        Index('ix_organization_memberships_user', 'user_id'),
        Index('ix_organization_memberships_org', 'organization_id'),
        Index('ix_organization_memberships_token', 'invitation_token'),
    )


class VerificationRequest(Base):
    __tablename__ = 'verification_requests'

    request_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=sql_text("gen_random_uuid()"))
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.user_id'), nullable=False)
    request_type = Column(String(50), nullable=False)  # doctor, pharmacist, pharmacy
    status = Column(
        Enum('draft', 'submitted', 'under_review', 'needs_information', 'resubmitted',
             'verified', 'rejected', name='verification_request_status_enum'),
        nullable=False,
        server_default='draft'
    )
    application_data = Column(JSONB, nullable=True)  # Full application snapshot
    rejection_reason = Column(Text, nullable=True)
    requested_info = Column(JSONB, nullable=True)  # {reason, requested_fields, requested_documents}
    submitted_at = Column(TIMESTAMP(timezone=True), nullable=True)
    reviewed_at = Column(TIMESTAMP(timezone=True), nullable=True)
    reviewed_by = Column(UUID(as_uuid=True), ForeignKey('users.user_id'), nullable=True)
    decision_at = Column(TIMESTAMP(timezone=True), nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), server_default=sql_text("now()"))
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index('ix_verification_requests_user', 'user_id'),
        Index('ix_verification_requests_status', 'status'),
        Index('ix_verification_requests_type', 'request_type'),
    )


class Permission(Base):
    __tablename__ = 'permissions'

    permission_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=sql_text("gen_random_uuid()"))
    code = Column(String(50), unique=True, nullable=False)
    description = Column(String(255), nullable=True)


class AdminPermission(Base):
    __tablename__ = 'admin_permissions'

    user_id = Column(UUID(as_uuid=True), ForeignKey('users.user_id'), primary_key=True, nullable=False)
    permission_id = Column(UUID(as_uuid=True), ForeignKey('permissions.permission_id'), primary_key=True, nullable=False)
    granted_by = Column(UUID(as_uuid=True), ForeignKey('users.user_id'), nullable=False)
    granted_at = Column(TIMESTAMP(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))


class RefreshToken(Base):
    __tablename__ = 'refresh_tokens'

    token_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=sql_text("gen_random_uuid()"))
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.user_id'), nullable=False)
    token_hash = Column(String(255), nullable=False)
    issued_at = Column(TIMESTAMP(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    expires_at = Column(TIMESTAMP(timezone=True), nullable=False)
    revoked_at = Column(TIMESTAMP(timezone=True), nullable=True)


class AccountStatusHistory(Base):
    __tablename__ = 'account_status_history'

    status_history_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=sql_text("gen_random_uuid()"))
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.user_id'), nullable=False)
    status = Column(Enum('active', 'pending', 'suspended', name='account_status_enum'), nullable=False)
    reason_code = Column(String(50), nullable=True)
    changed_by = Column(UUID(as_uuid=True), ForeignKey('users.user_id'), nullable=True)
    changed_at = Column(TIMESTAMP(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))


class SavedAddress(Base):
    __tablename__ = 'saved_addresses'

    address_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=sql_text("gen_random_uuid()"))
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.user_id'), nullable=False)
    label = Column(String(50), nullable=True)
    line1 = Column(String(255), nullable=False)
    line2 = Column(String(255), nullable=True)
    city = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    pincode = Column(String(10), nullable=False)
    is_default = Column(Boolean, nullable=False, server_default=sql_text("false"))


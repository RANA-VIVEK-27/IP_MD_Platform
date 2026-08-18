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
            'patient', 'doctor', 'pharmacy_staff_owned', 'partner_pharmacy',
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
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), server_default=sql_text("now()"))
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index('ix_users_role_status', 'role', 'status'),
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
    pharmacy_name = Column(String(255), nullable=False)
    address = Column(JSONB, nullable=False)
    gstin = Column(String(20), nullable=True)


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


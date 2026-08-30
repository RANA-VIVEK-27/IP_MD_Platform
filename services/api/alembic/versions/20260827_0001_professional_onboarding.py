"""Professional Onboarding Architecture: new roles, credentials, organizations, memberships, verification requests.

Revision ID: 20260827_0001_professional_onboarding
Revises: 20260823_0001_m9_vector_index
Create Date: 2026-08-27
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'prof_onboard_001'
down_revision = '20260823_0001_m9_vector_index'
branch_labels = None
depends_on = None


def _create_enum_if_not_exists(bind, enum_name, values):
    """Create a PostgreSQL enum type only if it does not already exist."""
    check = bind.execute(
        sa.text("SELECT 1 FROM pg_type WHERE typname = :name"), {"name": enum_name}
    ).fetchone()
    if not check:
        vals = ", ".join(f"'{v}'" for v in values)
        bind.execute(sa.text(f"CREATE TYPE {enum_name} AS ENUM ({vals})"))


def upgrade() -> None:
    bind = op.get_bind()

    # 1. Extend user_role enum with new values
    op.execute("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'pharmacist'")
    op.execute("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'pharmacy_admin'")

    # 2. Create all new enums via raw SQL with existence check
    _create_enum_if_not_exists(bind, 'professional_status_enum',
        ['draft', 'submitted', 'under_review', 'needs_information', 'resubmitted', 'verified', 'active', 'suspended', 'rejected', 'expired'])
    _create_enum_if_not_exists(bind, 'credential_status_enum',
        ['pending', 'verified', 'rejected', 'expired'])
    _create_enum_if_not_exists(bind, 'organization_status_enum',
        ['pending', 'active', 'suspended', 'rejected'])
    _create_enum_if_not_exists(bind, 'membership_status_enum',
        ['invited', 'pending', 'active', 'suspended', 'revoked'])
    _create_enum_if_not_exists(bind, 'verification_request_status_enum',
        ['draft', 'submitted', 'under_review', 'needs_information', 'resubmitted', 'verified', 'rejected'])

    # 3. Add new columns to users table
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS professional_status professional_status_enum")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth VARCHAR(10)")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS address JSONB")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_secret VARCHAR(64)")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN NOT NULL DEFAULT false")
    op.execute("CREATE INDEX IF NOT EXISTS ix_users_professional_status ON users (professional_status)")

    # 4. Create professional_credentials table
    op.execute("""
        CREATE TABLE IF NOT EXISTS professional_credentials (
            credential_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(user_id),
            credential_type VARCHAR(50) NOT NULL,
            credential_name VARCHAR(255),
            issuing_authority VARCHAR(255),
            registration_number VARCHAR(100),
            state VARCHAR(100),
            issue_date VARCHAR(10),
            expiry_date VARCHAR(10),
            document_id UUID REFERENCES documents(document_id),
            status credential_status_enum NOT NULL DEFAULT 'pending',
            verification_method VARCHAR(50),
            verified_at TIMESTAMPTZ,
            verified_by UUID REFERENCES users(user_id),
            verification_notes TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_professional_credentials_user ON professional_credentials (user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_professional_credentials_type ON professional_credentials (credential_type)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_professional_credentials_reg_number ON professional_credentials (registration_number)")

    # 5. Create organizations table
    op.execute("""
        CREATE TABLE IF NOT EXISTS organizations (
            organization_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) NOT NULL,
            trade_name VARCHAR(255),
            organization_type VARCHAR(50) NOT NULL,
            business_type VARCHAR(50),
            address JSONB,
            contact_email VARCHAR(255),
            contact_phone VARCHAR(20),
            gstin VARCHAR(20),
            status organization_status_enum NOT NULL DEFAULT 'pending',
            verified_at TIMESTAMPTZ,
            verified_by UUID REFERENCES users(user_id),
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)

    # 6. Create organization_memberships table
    op.execute("""
        CREATE TABLE IF NOT EXISTS organization_memberships (
            membership_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES users(user_id),
            organization_id UUID NOT NULL REFERENCES organizations(organization_id),
            role VARCHAR(50) NOT NULL,
            status membership_status_enum NOT NULL DEFAULT 'invited',
            invited_by UUID REFERENCES users(user_id),
            invited_at TIMESTAMPTZ,
            accepted_at TIMESTAMPTZ,
            revoked_at TIMESTAMPTZ,
            invitation_token VARCHAR(128) UNIQUE,
            invitation_expires_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_organization_memberships_user ON organization_memberships (user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_organization_memberships_org ON organization_memberships (organization_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_organization_memberships_token ON organization_memberships (invitation_token)")

    # 7. Create verification_requests table
    op.execute("""
        CREATE TABLE IF NOT EXISTS verification_requests (
            request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(user_id),
            request_type VARCHAR(50) NOT NULL,
            status verification_request_status_enum NOT NULL DEFAULT 'draft',
            application_data JSONB,
            rejection_reason TEXT,
            requested_info JSONB,
            submitted_at TIMESTAMPTZ,
            reviewed_at TIMESTAMPTZ,
            reviewed_by UUID REFERENCES users(user_id),
            decision_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_verification_requests_user ON verification_requests (user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_verification_requests_status ON verification_requests (status)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_verification_requests_type ON verification_requests (request_type)")

    # 8. Enhance pharmacy_profiles table
    op.execute("ALTER TABLE pharmacy_profiles ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(organization_id)")
    op.execute("ALTER TABLE pharmacy_profiles ADD COLUMN IF NOT EXISTS license_type VARCHAR(50)")
    op.execute("ALTER TABLE pharmacy_profiles ADD COLUMN IF NOT EXISTS license_number VARCHAR(100)")
    op.execute("ALTER TABLE pharmacy_profiles ADD COLUMN IF NOT EXISTS license_issuing_authority VARCHAR(255)")
    op.execute("ALTER TABLE pharmacy_profiles ADD COLUMN IF NOT EXISTS license_issue_date VARCHAR(10)")
    op.execute("ALTER TABLE pharmacy_profiles ADD COLUMN IF NOT EXISTS license_expiry_date VARCHAR(10)")
    op.execute("ALTER TABLE pharmacy_profiles ADD COLUMN IF NOT EXISTS pharmacy_type VARCHAR(50)")
    op.execute("ALTER TABLE pharmacy_profiles ADD COLUMN IF NOT EXISTS responsible_pharmacist_name VARCHAR(255)")
    op.execute("ALTER TABLE pharmacy_profiles ADD COLUMN IF NOT EXISTS responsible_pharmacist_reg_no VARCHAR(100)")


def downgrade() -> None:
    op.execute("ALTER TABLE pharmacy_profiles DROP COLUMN IF EXISTS responsible_pharmacist_reg_no")
    op.execute("ALTER TABLE pharmacy_profiles DROP COLUMN IF EXISTS responsible_pharmacist_name")
    op.execute("ALTER TABLE pharmacy_profiles DROP COLUMN IF EXISTS pharmacy_type")
    op.execute("ALTER TABLE pharmacy_profiles DROP COLUMN IF EXISTS license_expiry_date")
    op.execute("ALTER TABLE pharmacy_profiles DROP COLUMN IF EXISTS license_issue_date")
    op.execute("ALTER TABLE pharmacy_profiles DROP COLUMN IF EXISTS license_issuing_authority")
    op.execute("ALTER TABLE pharmacy_profiles DROP COLUMN IF EXISTS license_number")
    op.execute("ALTER TABLE pharmacy_profiles DROP COLUMN IF EXISTS license_type")
    op.execute("ALTER TABLE pharmacy_profiles DROP COLUMN IF EXISTS organization_id")

    op.execute("DROP TABLE IF EXISTS verification_requests")
    op.execute("DROP TABLE IF EXISTS organization_memberships")
    op.execute("DROP TABLE IF EXISTS organizations")
    op.execute("DROP TABLE IF EXISTS professional_credentials")

    op.execute("DROP INDEX IF EXISTS ix_users_professional_status")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS mfa_enabled")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS mfa_secret")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS address")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS date_of_birth")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS professional_status")

    op.execute("DROP TYPE IF EXISTS verification_request_status_enum")
    op.execute("DROP TYPE IF EXISTS membership_status_enum")
    op.execute("DROP TYPE IF EXISTS organization_status_enum")
    op.execute("DROP TYPE IF EXISTS credential_status_enum")
    op.execute("DROP TYPE IF EXISTS professional_status_enum")

import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple, Dict
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text as sql_text

from app.models.identity import (
    User, DoctorLicense, PharmacyProfile, RefreshToken, AccountStatusHistory
)
from app.schemas.auth import UserRegisterRequest, PharmacyDetails
from app.core.security import (
    hash_password, verify_password, generate_otp, hash_token,
    verify_token_hash, create_access_token, create_refresh_token_string
)
from app.core.config import settings

VALID_ROLES = {
    'patient', 'doctor', 'pharmacy_staff_owned', 'partner_pharmacy',
    'admin', 'user_admin', 'super_admin'
}

# In-memory OTP storage fallback with rate-limiting
_otp_store: Dict[str, dict] = {}
_otp_rate_limits: Dict[str, list] = {}

class AuthService:

    @staticmethod
    def register_user(db: Session, req: UserRegisterRequest) -> User:
        if req.role not in VALID_ROLES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="INVALID_ROLE"
            )

        if not req.email and not req.phone:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="VALIDATION_ERROR: Email or phone is required"
            )

        if req.email:
            existing_email = db.query(User).filter(User.email == req.email).first()
            if existing_email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="EMAIL_ALREADY_EXISTS"
                )

        if req.phone:
            existing_phone = db.query(User).filter(User.phone == req.phone).first()
            if existing_phone:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="PHONE_ALREADY_EXISTS"
                )

        if req.role == 'doctor' and not req.license_number:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="LICENSE_FORMAT_INVALID: Doctor registration requires license_number"
            )

        password_hash = hash_password(req.password) if req.password else None
        
        # Initial status starts as 'pending' (per DB schema default)
        user = User(
            role=req.role,
            full_name=req.full_name,
            email=req.email,
            phone=req.phone,
            password_hash=password_hash,
            status='pending',
            updated_at=datetime.now(timezone.utc)
        )
        db.add(user)
        db.flush()

        # Handle role-specific entities
        if req.role == 'doctor':
            doc_license = DoctorLicense(
                user_id=user.user_id,
                license_number=req.license_number,
                verification_status='pending'
            )
            db.add(doc_license)

        if req.role in ('partner_pharmacy', 'pharmacy_staff_owned') and req.pharmacy_details:
            pharmacy_prof = PharmacyProfile(
                user_id=user.user_id,
                pharmacy_name=req.pharmacy_details.pharmacy_name,
                address=req.pharmacy_details.address,
                gstin=req.pharmacy_details.gstin
            )
            db.add(pharmacy_prof)

        # Audit account status creation
        status_hist = AccountStatusHistory(
            user_id=user.user_id,
            status='pending',
            reason_code='registration',
            changed_at=datetime.now(timezone.utc)
        )
        db.add(status_hist)

        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def verify_email(db: Session, email: str) -> User:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="USER_NOT_FOUND"
            )

        if user.status == 'pending':
            user.status = 'active'
            user.updated_at = datetime.now(timezone.utc)
            db.add(user)

            status_hist = AccountStatusHistory(
                user_id=user.user_id,
                status='active',
                reason_code='email_verified',
                changed_at=datetime.now(timezone.utc)
            )
            db.add(status_hist)
            db.commit()
            db.refresh(user)

        return user

    @staticmethod
    def request_otp(phone: str) -> dict:
        now = datetime.now(timezone.utc)
        # Rate limit: max 5 requests per 5 minutes per phone
        window_start = now - timedelta(minutes=5)
        recent_requests = [t for t in _otp_rate_limits.get(phone, []) if t > window_start]
        if len(recent_requests) >= 5:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="RATE_LIMITED: Too many OTP requests for this number"
            )
        
        recent_requests.append(now)
        _otp_rate_limits[phone] = recent_requests

        otp_code = generate_otp()
        req_id = str(uuid.uuid4())
        expires_at = now + timedelta(seconds=settings.OTP_EXPIRE_SECONDS)

        _otp_store[req_id] = {
            "phone": phone,
            "otp_code": otp_code,
            "expires_at": expires_at,
            "used": False
        }

        return {
            "otp_request_id": req_id,
            "expires_in": settings.OTP_EXPIRE_SECONDS,
            "debug_otp": otp_code
        }

    @staticmethod
    def verify_otp(db: Session, otp_request_id: str, otp_code: str, phone: Optional[str] = None) -> Tuple[User, bool]:
        otp_data = _otp_store.get(otp_request_id)
        now = datetime.now(timezone.utc)

        if not otp_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OTP_INVALID_OR_EXPIRED"
            )

        if otp_data["used"] or otp_data["expires_at"] < now:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OTP_INVALID_OR_EXPIRED"
            )

        if otp_data["otp_code"] != otp_code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OTP_INVALID_OR_EXPIRED"
            )

        otp_data["used"] = True
        target_phone = phone or otp_data["phone"]

        user = db.query(User).filter(User.phone == target_phone).first()
        is_new_user = False

        if not user:
            is_new_user = True
            user = User(
                role='patient',
                full_name=f"User {target_phone[-4:]}",
                phone=target_phone,
                status='active',
                updated_at=datetime.now(timezone.utc)
            )
            db.add(user)
            db.flush()

            status_hist = AccountStatusHistory(
                user_id=user.user_id,
                status='active',
                reason_code='phone_otp_verified',
                changed_at=datetime.now(timezone.utc)
            )
            db.add(status_hist)
            db.commit()
            db.refresh(user)
        else:
            if user.status == 'suspended':
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="ACCOUNT_SUSPENDED"
                )
            if user.status == 'pending':
                user.status = 'active'
                user.updated_at = datetime.now(timezone.utc)
                db.add(user)
                status_hist = AccountStatusHistory(
                    user_id=user.user_id,
                    status='active',
                    reason_code='phone_otp_verified',
                    changed_at=datetime.now(timezone.utc)
                )
                db.add(status_hist)
                db.commit()
                db.refresh(user)

        return user, is_new_user

    @staticmethod
    def handle_oauth_callback(db: Session, provider: str, auth_code: str, email: str, full_name: Optional[str]) -> Tuple[User, bool]:
        if provider not in ('google', 'apple'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OAUTH_PROVIDER_ERROR: Unsupported provider"
            )

        user = db.query(User).filter(User.email == email).first()
        is_new_user = False

        if not user:
            is_new_user = True
            user = User(
                role='patient',
                full_name=full_name or "OAuth User",
                email=email,
                password_hash=None,
                oauth_provider=provider,
                status='active', # BRD 3.1: Activate immediately post successful OAuth callback
                updated_at=datetime.now(timezone.utc)
            )
            db.add(user)
            db.flush()

            status_hist = AccountStatusHistory(
                user_id=user.user_id,
                status='active',
                reason_code='oauth_registration',
                changed_at=datetime.now(timezone.utc)
            )
            db.add(status_hist)
            db.commit()
            db.refresh(user)
        else:
            if user.status == 'suspended':
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="ACCOUNT_SUSPENDED"
                )
            
            user.oauth_provider = provider
            if user.status == 'pending':
                user.status = 'active' # Activate upon OAuth login
                status_hist = AccountStatusHistory(
                    user_id=user.user_id,
                    status='active',
                    reason_code='oauth_activated',
                    changed_at=datetime.now(timezone.utc)
                )
                db.add(status_hist)
            user.updated_at = datetime.now(timezone.utc)
            db.add(user)
            db.commit()
            db.refresh(user)

        return user, is_new_user

    @staticmethod
    def authenticate_user(db: Session, email: str, password: str) -> User:
        user = db.query(User).filter(User.email == email).first()
        if not user or not user.password_hash or not verify_password(password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="INVALID_CREDENTIALS"
            )

        # Check live account status
        if user.status == 'pending':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="ACCOUNT_PENDING_VERIFICATION"
            )

        if user.status == 'suspended':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="ACCOUNT_SUSPENDED"
            )

        return user

    @staticmethod
    def issue_token_pair(db: Session, user: User, is_new_user: Optional[bool] = None) -> dict:
        access_token = create_access_token(subject=str(user.user_id), role=user.role)
        raw_refresh_token = create_refresh_token_string()
        hashed_refresh = hash_token(raw_refresh_token)

        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

        refresh_record = RefreshToken(
            user_id=user.user_id,
            token_hash=hashed_refresh,
            issued_at=now,
            expires_at=expires_at
        )
        db.add(refresh_record)
        db.commit()

        res = {
            "access_token": access_token,
            "refresh_token": raw_refresh_token,
            "token_type": "bearer",
            "user": user
        }
        if is_new_user is not None:
            res["is_new_user"] = is_new_user
        return res

    @staticmethod
    def refresh_access_token(db: Session, raw_refresh_token: str) -> dict:
        hashed_refresh = hash_token(raw_refresh_token)
        now = datetime.now(timezone.utc)

        token_record = db.query(RefreshToken).filter(
            RefreshToken.token_hash == hashed_refresh,
            RefreshToken.revoked_at.is_(None),
            RefreshToken.expires_at > now
        ).first()

        if not token_record:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="REFRESH_TOKEN_INVALID_OR_EXPIRED"
            )

        user = db.query(User).filter(User.user_id == token_record.user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="USER_NOT_FOUND"
            )

        if user.status == 'pending':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="ACCOUNT_PENDING_VERIFICATION"
            )
        if user.status == 'suspended':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="ACCOUNT_SUSPENDED"
            )

        # Token rotation: revoke current token
        token_record.revoked_at = now
        db.add(token_record)
        db.commit()

        return AuthService.issue_token_pair(db, user)

    @staticmethod
    def logout(db: Session, raw_refresh_token: str) -> bool:
        hashed_refresh = hash_token(raw_refresh_token)
        token_record = db.query(RefreshToken).filter(
            RefreshToken.token_hash == hashed_refresh,
            RefreshToken.revoked_at.is_(None)
        ).first()

        if token_record:
            token_record.revoked_at = datetime.now(timezone.utc)
            db.add(token_record)
            db.commit()
        return True

    @staticmethod
    def approve_doctor_license(db: Session, doctor_user_id: str, verifier_user_id: str, status_str: str, rejection_reason: Optional[str] = None) -> DoctorLicense:
        doc_license = db.query(DoctorLicense).filter(DoctorLicense.user_id == doctor_user_id).first()
        if not doc_license:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="DOCTOR_LICENSE_NOT_FOUND"
            )

        if status_str not in ('approved', 'rejected'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="VALIDATION_ERROR: status must be approved or rejected"
            )

        doc_license.verification_status = status_str
        doc_license.verified_by = verifier_user_id
        doc_license.verified_at = datetime.now(timezone.utc)
        if status_str == 'rejected':
            doc_license.rejection_reason = rejection_reason

        db.add(doc_license)
        db.commit()
        db.refresh(doc_license)
        return doc_license

    @staticmethod
    def update_user_status(db: Session, user_id: str, new_status: str, changed_by: str, reason_code: Optional[str] = None) -> User:
        user = db.query(User).filter(User.user_id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="USER_NOT_FOUND"
            )

        if new_status not in ('active', 'pending', 'suspended'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="VALIDATION_ERROR: status must be active, pending, or suspended"
            )

        user.status = new_status
        user.updated_at = datetime.now(timezone.utc)
        db.add(user)

        status_hist = AccountStatusHistory(
            user_id=user.user_id,
            status=new_status,
            reason_code=reason_code or 'admin_action',
            changed_by=changed_by,
            changed_at=datetime.now(timezone.utc)
        )
        db.add(status_hist)
        db.commit()
        db.refresh(user)
        return user

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.auth import (
    UserRegisterRequest, EmailVerifyRequest, UserLoginRequest,
    OTPRequest, OTPRequestResponse, OTPVerifyRequest,
    OAuthCallbackRequest, RefreshTokenRequest, LogoutRequest,
    UserResponse, TokenResponse
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication & Access"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(req: UserRegisterRequest, db: Session = Depends(get_db)):
    """Registers a new account (patient, doctor, pharmacy_staff_owned, partner_pharmacy)."""
    user = AuthService.register_user(db, req)
    return user

@router.post("/verify-email", response_model=UserResponse)
def verify_email(req: EmailVerifyRequest, db: Session = Depends(get_db)):
    """Verifies email and activates pending email-registered accounts."""
    user = AuthService.verify_email(db, req.email)
    return user

@router.post("/login", response_model=TokenResponse)
def login(req: UserLoginRequest, db: Session = Depends(get_db)):
    """Authenticates via email/password and issues access/refresh tokens."""
    user = AuthService.authenticate_user(db, req.email, req.password)
    tokens = AuthService.issue_token_pair(db, user)
    return tokens

@router.post("/otp/request", response_model=OTPRequestResponse)
def request_otp(req: OTPRequest):
    """Sends a short-lived OTP (5 min TTL) to the requested phone number."""
    return AuthService.request_otp(req.phone)

@router.post("/otp/verify", response_model=TokenResponse)
def verify_otp(req: OTPVerifyRequest, db: Session = Depends(get_db)):
    """Verifies OTP, activates/creates account, and issues tokens."""
    user, is_new_user = AuthService.verify_otp(db, req.otp_request_id, req.otp_code, req.phone)
    tokens = AuthService.issue_token_pair(db, user, is_new_user=is_new_user)
    return tokens

@router.post("/oauth/callback", response_model=TokenResponse)
def oauth_callback(req: OAuthCallbackRequest, db: Session = Depends(get_db)):
    """Completes OAuth login, activates user immediately, and issues tokens."""
    user, is_new_user = AuthService.handle_oauth_callback(
        db, req.provider, req.auth_code, req.email, req.full_name
    )
    tokens = AuthService.issue_token_pair(db, user, is_new_user=is_new_user)
    return tokens

@router.post("/refresh", response_model=TokenResponse)
def refresh_token(req: RefreshTokenRequest, db: Session = Depends(get_db)):
    """Rotates refresh token and issues a new token pair."""
    tokens = AuthService.refresh_access_token(db, req.refresh_token)
    return tokens

@router.post("/logout")
def logout(req: LogoutRequest, db: Session = Depends(get_db)):
    """Revokes the supplied refresh token."""
    revoked = AuthService.logout(db, req.refresh_token)
    return {"revoked": revoked}

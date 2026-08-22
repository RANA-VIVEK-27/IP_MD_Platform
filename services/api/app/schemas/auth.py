from uuid import UUID
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field

class PharmacyDetails(BaseModel):
    pharmacy_name: str
    address: Dict[str, Any]
    gstin: Optional[str] = None

class UserRegisterRequest(BaseModel):
    role: str = Field(..., description="One of 7 roles: patient, doctor, pharmacy_staff_owned, partner_pharmacy, admin, user_admin, super_admin")
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    password: Optional[str] = Field(None, min_length=6)
    license_number: Optional[str] = None
    pharmacy_details: Optional[PharmacyDetails] = None

class EmailVerifyRequest(BaseModel):
    email: str
    verification_code: Optional[str] = "VERIFIED"

class UserLoginRequest(BaseModel):
    email: str
    password: str = Field(..., min_length=6)

class OTPRequest(BaseModel):
    phone: str

class OTPRequestResponse(BaseModel):
    otp_request_id: str
    expires_in: int
    debug_otp: Optional[str] = None

class OTPVerifyRequest(BaseModel):
    otp_request_id: str
    otp_code: str
    phone: Optional[str] = None

class OAuthCallbackRequest(BaseModel):
    provider: str
    auth_code: str
    email: str
    full_name: Optional[str] = "OAuth User"

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class LogoutRequest(BaseModel):
    refresh_token: str

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: UUID
    role: str
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    status: str
    created_at: datetime

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse
    is_new_user: Optional[bool] = None

class DoctorLicenseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    license_id: UUID
    user_id: UUID
    license_number: str
    verification_status: str
    verified_by: Optional[UUID] = None
    verified_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None

class DoctorApprovalRequest(BaseModel):
    verification_status: str = Field(..., description="approved or rejected")
    rejection_reason: Optional[str] = None

class UserStatusChangeRequest(BaseModel):
    status: str = Field(..., description="active, pending, or suspended")
    reason_code: Optional[str] = None

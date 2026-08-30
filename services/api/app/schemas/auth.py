from uuid import UUID
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field

class PharmacyDetails(BaseModel):
    pharmacy_name: str
    trade_name: Optional[str] = None
    business_type: Optional[str] = None
    address: Dict[str, Any]
    gstin: Optional[str] = None

class MedicalRegistration(BaseModel):
    registration_authority: Optional[str] = None
    state_medical_council: Optional[str] = None
    medical_registration_number: Optional[str] = None
    registration_date: Optional[str] = None

class QualificationInfo(BaseModel):
    primary_qualification: Optional[str] = None
    university: Optional[str] = None
    graduation_year: Optional[str] = None
    specialization: Optional[str] = None
    additional_qualifications: Optional[List[Dict[str, Any]]] = None

class PracticeInfo(BaseModel):
    clinic_hospital: Optional[str] = None
    facility_association: Optional[str] = None
    practice_address: Optional[Dict[str, Any]] = None
    consultation_type: Optional[str] = None
    professional_contact: Optional[str] = None

class PharmacyRegistration(BaseModel):
    state_pharmacy_council: Optional[str] = None
    registration_number: Optional[str] = None
    registration_date: Optional[str] = None
    expiry_date: Optional[str] = None

class UserRegisterRequest(BaseModel):
    role: str = Field(..., description="One of: patient, doctor, pharmacist, pharmacy_admin, pharmacy_staff_owned, partner_pharmacy")
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    password: Optional[str] = Field(None, min_length=6)
    license_number: Optional[str] = None
    date_of_birth: Optional[str] = None
    address: Optional[Dict[str, Any]] = None
    medical_registration: Optional[MedicalRegistration] = None
    qualification: Optional[QualificationInfo] = None
    practice_info: Optional[PracticeInfo] = None
    pharmacy_registration: Optional[PharmacyRegistration] = None
    pharmacy_details: Optional[PharmacyDetails] = None
    auto_activate: Optional[bool] = Field(None, description="If true, account is immediately active (admin use only)")

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

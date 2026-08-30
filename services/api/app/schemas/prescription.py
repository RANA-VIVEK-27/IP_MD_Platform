from uuid import UUID
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field

# --- Prescription & Document Schemas ---

class PrescriptionUploadResponse(BaseModel):
    prescription_id: UUID
    document_id: UUID
    status: str

class PrescriptionStatusResponse(BaseModel):
    status: str
    progress_pct: int
    is_ai_generated: bool

class ExtractedFieldResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    field_id: UUID
    prescription_id: UUID
    field_name: str
    value: str
    confidence_score: float
    review_state: str
    edited_by: Optional[UUID] = None
    edited_reason: Optional[str] = None

class MedicineItemResponse(BaseModel):
    """Structured medicine extraction result."""
    sequence: int
    raw_name: str
    name: str
    strength: Optional[str] = None
    dosage_instruction: Optional[str] = None
    duration: Optional[str] = None
    quantity: Optional[int] = None
    ocr_confidence: float = 0.0
    parser_confidence: float = 0.0
    validation_confidence: float = 0.0
    overall_confidence: float = 0.0
    needs_review: bool = True


class PrescriptionDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    prescription_id: UUID
    patient_id: UUID
    doctor_id: Optional[UUID] = None
    document_id: UUID
    extraction_status: str
    verification_status: str
    is_ai_generated: bool = True
    extracted_fields: List[ExtractedFieldResponse] = []
    medicines: List[MedicineItemResponse] = []
    raw_ocr_text: Optional[str] = None
    overall_confidence: Optional[float] = None
    needs_review: Optional[bool] = None
    doctor_name: Optional[str] = None
    doctor_phone: Optional[str] = None
    doctor_reg_no: Optional[str] = None
    doctor_qualification: Optional[str] = None
    doctor_specialization: Optional[str] = None
    clinic_name: Optional[str] = None
    clinic_address: Optional[str] = None
    patient_name: Optional[str] = None
    patient_phone: Optional[str] = None
    patient_age: Optional[str] = None
    patient_gender: Optional[str] = None
    patient_mrd: Optional[str] = None
    prescription_date: Optional[str] = None
    patient_note: Optional[str] = None
    diagnosis: Optional[str] = None
    document_url: Optional[str] = None
    created_at: datetime

class PrescriptionSummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    prescription_id: UUID
    patient_id: UUID
    doctor_id: Optional[UUID] = None
    document_id: UUID
    extraction_status: str
    verification_status: str
    created_at: datetime

class PrescriptionListResponse(BaseModel):
    data: List[PrescriptionSummaryResponse]
    next_cursor: Optional[str] = None
    has_more: bool = False

class FieldEditRequest(BaseModel):
    value: str = Field(..., description="Corrected field value")
    reason: Optional[str] = Field(None, description="Optional free-text reason for correction")

class FieldEditResponse(BaseModel):
    field_id: UUID
    value: str
    review_state: str

# --- Report Schemas ---

class ReportUploadResponse(BaseModel):
    report_id: UUID
    document_id: UUID
    status: str

class ReportSummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    report_id: UUID
    patient_id: UUID
    document_id: UUID
    report_type: Optional[str] = None
    extraction_status: str
    created_at: datetime

class ReportListResponse(BaseModel):
    data: List[ReportSummaryResponse]
    next_cursor: Optional[str] = None

class ReportValueResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    value_id: UUID
    test_name: str
    value: str
    unit: Optional[str] = None
    reference_range: Optional[str] = None
    flag: str

class ReportDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    report_id: UUID
    patient_id: UUID
    document_id: UUID
    report_type: Optional[str] = None
    extraction_status: str
    ai_explanation: Optional[str] = None
    is_ai_generated: bool = True
    values: List[ReportValueResponse] = []
    created_at: datetime

# --- Verification & Audit Schemas ---

class VerificationApproveRequest(BaseModel):
    notes: Optional[str] = Field(None, description="Optional reviewer notes")

class VerificationRejectRequest(BaseModel):
    reason: str = Field(..., description="Mandatory rejection reason")

class VerificationActionResponse(BaseModel):
    prescription_id: UUID
    verification_status: str
    audit_log_id: UUID

class VerificationQueueItem(BaseModel):
    prescription_id: UUID
    patient_ref: str
    extraction_status: str
    verification_status: str
    queued_at: datetime
    sla_breach: bool = False

class VerificationQueueResponse(BaseModel):
    data: List[VerificationQueueItem]
    next_cursor: Optional[str] = None
    has_more: bool = False

class VerificationAuditEntryResponse(BaseModel):
    actor_id: Optional[UUID] = None
    actor_role: str
    action_type: str
    timestamp: datetime
    justification: Optional[str] = None

class VerificationAuditListResponse(BaseModel):
    data: List[VerificationAuditEntryResponse]

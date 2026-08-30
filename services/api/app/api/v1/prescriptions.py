import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, File, Form, UploadFile, status, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from app.db.session import get_db
from app.models.identity import User
from app.models.prescription_report import Prescription, ExtractedField, Document
from app.api.deps import get_current_user, require_roles, require_approved_doctor
from app.services.prescription_service import PrescriptionService
from app.schemas.prescription import (
    PrescriptionUploadResponse,
    PrescriptionStatusResponse,
    PrescriptionDetailResponse,
    PrescriptionListResponse,
    FieldEditRequest,
    FieldEditResponse,
)

router = APIRouter(prefix="/prescriptions", tags=["Prescription Intake & Management"])


class PrescriptionMedicine(BaseModel):
    field_name: str = Field(..., description="Medicine field name (e.g. medicine_1_name)")
    value: str = Field(..., description="Medicine value (e.g. Paracetamol 500mg)")


class DoctorPrescriptionCreateRequest(BaseModel):
    patient_id: uuid.UUID
    medicines: List[PrescriptionMedicine] = Field(default_factory=list, description="Extracted medicine fields")
    report_id: Optional[uuid.UUID] = Field(None, description="Optional source report ID")
    notes: Optional[str] = Field(None, description="Doctor notes")


@router.post(
    "/upload",
    response_model=PrescriptionUploadResponse,
    status_code=status.HTTP_201_CREATED
)
async def upload_prescription(
    file: UploadFile = File(..., description="Prescription image or PDF (max 20MB)"),
    doctor_id: Optional[str] = Form(None, description="Optional UUID of prescribing or reviewing doctor"),
    document_type: str = Form("prescription", description="Document intake type"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("patient"))
):
    """
    Uploads a prescription document via multipart/form-data.
    Performs file type and size validation (max 20MB) and queues OCR/NLP extraction (BRD FR-1, TRD Item 1-3).
    """
    if document_type != "prescription":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="INVALID_DOCUMENT_TYPE: Use /reports/upload for diagnostic reports."
        )

    parsed_doctor_id: Optional[uuid.UUID] = None
    if doctor_id:
        try:
            parsed_doctor_id = uuid.UUID(str(doctor_id))
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="INVALID_DOCTOR_ID: doctor_id must be a valid UUID."
            )

    content = await file.read()

    prescription = await PrescriptionService.create_prescription_upload(
        db=db,
        patient=current_user,
        filename=file.filename or "prescription.jpg",
        content=content,
        content_type=file.content_type or "",
        doctor_id=parsed_doctor_id,
        auto_process=True
    )

    return PrescriptionUploadResponse(
        prescription_id=prescription.prescription_id,
        document_id=prescription.document_id,
        status=prescription.extraction_status
    )


@router.post("/create", status_code=status.HTTP_201_CREATED)
def create_doctor_prescription(
    req: DoctorPrescriptionCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("doctor"))
):
    """
    Doctor creates a prescription directly with medicine fields (no OCR needed).
    """
    from datetime import datetime, timezone

    # Create a placeholder document record
    doc = Document(
        uploaded_by=current_user.user_id,
        original_filename="doctor_created_prescription",
        mime_type="text/plain",
        file_size_bytes=0,
        file_type="pdf",
        doc_status="ready",
        scan_status="clean",
        processing_status="completed",
        uploaded_at=datetime.now(timezone.utc),
    )
    db.add(doc)
    db.flush()

    # Create prescription
    prescription = Prescription(
        patient_id=req.patient_id,
        doctor_id=current_user.user_id,
        document_id=doc.document_id,
        extraction_status="extracted",
        verification_status="doctor_verified",
        created_at=datetime.now(timezone.utc),
    )
    db.add(prescription)
    db.flush()

    # Create extracted fields from medicines
    for med in req.medicines:
        field = ExtractedField(
            prescription_id=prescription.prescription_id,
            field_name=med.field_name,
            value=med.value,
            confidence_score=1.0,
            review_state="doctor_edited",
            edited_by=current_user.user_id,
            edited_reason="Directly prescribed by doctor",
        )
        db.add(field)

    # Add notes as a field if provided
    if req.notes:
        field = ExtractedField(
            prescription_id=prescription.prescription_id,
            field_name="doctor_notes",
            value=req.notes,
            confidence_score=1.0,
            review_state="doctor_edited",
            edited_by=current_user.user_id,
            edited_reason="Doctor notes",
        )
        db.add(field)

    db.commit()
    db.refresh(prescription)

    return {
        "prescription_id": str(prescription.prescription_id),
        "document_id": str(prescription.document_id),
        "status": "created",
        "message": "Prescription created successfully"
    }


@router.get("/{prescription_id}/status", response_model=PrescriptionStatusResponse)
def get_prescription_status(
    prescription_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Polling endpoint for extraction status and progress percentage (TRD Item 6).
    """
    return PrescriptionService.get_prescription_status(db, current_user, prescription_id)


@router.get("/{prescription_id}", response_model=PrescriptionDetailResponse)
def get_prescription_detail(
    prescription_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns full prescription details and confidence-scored extracted fields (BRD FR-3, TRD Item 3-4).
    """
    return PrescriptionService.get_prescription(db, current_user, prescription_id)


@router.get("", response_model=PrescriptionListResponse)
def list_prescriptions(
    status: Optional[str] = None,
    limit: int = 20,
    cursor: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lists prescriptions with cursor-based pagination, scoped by user role (BRD Section 3.1).
    """
    items, next_cursor, has_more = PrescriptionService.list_prescriptions(
        db=db,
        user=current_user,
        status_filter=status,
        limit=limit,
        cursor=cursor
    )
    return PrescriptionListResponse(
        data=items,
        next_cursor=next_cursor,
        has_more=has_more
    )


@router.patch("/{prescription_id}/fields/{field_id}", response_model=FieldEditResponse)
def edit_extracted_field(
    prescription_id: uuid.UUID,
    field_id: uuid.UUID,
    req: FieldEditRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_approved_doctor)
):
    """
    Allows an approved doctor to correct an extracted prescription field during clinical review (BRD FR-4, TRD Item 12).
    """
    return PrescriptionService.edit_extracted_field(
        db=db,
        doctor=current_user,
        prescription_id=prescription_id,
        field_id=field_id,
        new_value=req.value,
        reason=req.reason
    )

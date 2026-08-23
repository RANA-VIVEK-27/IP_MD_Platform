import uuid
from datetime import datetime, timezone
from typing import List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.identity import User
from app.models.prescription_report import Prescription, ExtractedField, VerificationAction
from app.models.audit import AuditLogEntry
from app.services.storage_service import StorageService
from app.services.extraction_service import ExtractionService
from app.schemas.prescription import (
    PrescriptionSummaryResponse,
    PrescriptionDetailResponse,
    ExtractedFieldResponse,
    FieldEditResponse,
    PrescriptionStatusResponse,
)


class PrescriptionService:
    @staticmethod
    async def create_prescription_upload(
        db: Session,
        patient: User,
        filename: str,
        content: bytes,
        content_type: str = "",
        doctor_id: Optional[uuid.UUID] = None,
        auto_process: bool = True
    ) -> Prescription:
        """
        Uploads a prescription document and creates an intake record in 'queued' status.
        Uses real storage via StorageService.upload_document().
        """
        document = await StorageService.upload_document(
            db=db,
            user_id=patient.user_id,
            filename=filename,
            content=content,
            content_type=content_type,
            doc_type="prescriptions",
        )

        presc_id = uuid.uuid4()
        prescription = Prescription(
            prescription_id=presc_id,
            patient_id=patient.user_id,
            doctor_id=doctor_id,
            document_id=document.document_id,
            extraction_status="queued",
            verification_status="pending_review",
            created_at=datetime.now(timezone.utc)
        )
        db.add(prescription)
        db.flush()

        if auto_process:
            ExtractionService.stub_process_prescription(db, prescription, image_bytes=content)

        db.commit()
        db.refresh(prescription)
        return prescription

    @staticmethod
    def get_prescription(
        db: Session,
        user: User,
        prescription_id: uuid.UUID
    ) -> PrescriptionDetailResponse:
        """
        Retrieves full prescription details with extracted fields, enforcing RBAC ownership.
        """
        prescription = db.query(Prescription).filter(
            Prescription.prescription_id == prescription_id
        ).first()

        if not prescription:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="PRESCRIPTION_NOT_FOUND"
            )

        # RBAC Check: Patients can only view their own prescriptions
        if user.role == "patient" and prescription.patient_id != user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="FORBIDDEN: You do not have permission to view this prescription."
            )

        fields = db.query(ExtractedField).filter(
            ExtractedField.prescription_id == prescription.prescription_id
        ).all()

        fields_response = [
            ExtractedFieldResponse(
                field_id=f.field_id,
                prescription_id=f.prescription_id,
                field_name=f.field_name,
                value=f.value,
                confidence_score=float(f.confidence_score),
                review_state=f.review_state,
                edited_by=f.edited_by,
                edited_reason=f.edited_reason
            )
            for f in fields
        ]

        return PrescriptionDetailResponse(
            prescription_id=prescription.prescription_id,
            patient_id=prescription.patient_id,
            doctor_id=prescription.doctor_id,
            document_id=prescription.document_id,
            extraction_status=prescription.extraction_status,
            verification_status=prescription.verification_status,
            is_ai_generated=True,
            extracted_fields=fields_response,
            created_at=prescription.created_at
        )

    @staticmethod
    def get_prescription_status(
        db: Session,
        user: User,
        prescription_id: uuid.UUID
    ) -> PrescriptionStatusResponse:
        """
        Returns extraction progress and status for polling clients.
        """
        prescription = db.query(Prescription).filter(
            Prescription.prescription_id == prescription_id
        ).first()

        if not prescription:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="PRESCRIPTION_NOT_FOUND"
            )

        if user.role == "patient" and prescription.patient_id != user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="FORBIDDEN: You do not have permission to view this prescription status."
            )

        pct_map = {
            "queued": 0,
            "processing": 50,
            "extracted": 100,
            "needs_review": 100,
            "failed": 0
        }

        progress = pct_map.get(prescription.extraction_status, 0)

        return PrescriptionStatusResponse(
            status=prescription.extraction_status,
            progress_pct=progress,
            is_ai_generated=True
        )

    @staticmethod
    def list_prescriptions(
        db: Session,
        user: User,
        status_filter: Optional[str] = None,
        limit: int = 20,
        cursor: Optional[str] = None
    ) -> Tuple[List[PrescriptionSummaryResponse], Optional[str], bool]:
        """
        Lists prescriptions scoped to the caller's role with cursor pagination.
        """
        query = db.query(Prescription)

        if user.role == "patient":
            query = query.filter(Prescription.patient_id == user.user_id)
        elif user.role == "doctor":
            query = query.filter(
                (Prescription.doctor_id == user.user_id) | (Prescription.doctor_id == None)
            )

        if status_filter:
            query = query.filter(Prescription.verification_status == status_filter)

        query = query.order_by(Prescription.created_at.desc())

        offset = 0
        if cursor:
            try:
                offset = int(cursor)
            except ValueError:
                offset = 0

        items = query.offset(offset).limit(limit + 1).all()
        has_more = len(items) > limit
        page_items = items[:limit]
        next_cursor = str(offset + limit) if has_more else None

        summaries = [
            PrescriptionSummaryResponse(
                prescription_id=p.prescription_id,
                patient_id=p.patient_id,
                doctor_id=p.doctor_id,
                document_id=p.document_id,
                extraction_status=p.extraction_status,
                verification_status=p.verification_status,
                created_at=p.created_at
            )
            for p in page_items
        ]

        return summaries, next_cursor, has_more

    @staticmethod
    def edit_extracted_field(
        db: Session,
        doctor: User,
        prescription_id: uuid.UUID,
        field_id: uuid.UUID,
        new_value: str,
        reason: Optional[str] = None
    ) -> FieldEditResponse:
        """
        Allows a reviewing doctor to correct an individual extracted field (BRD FR-4, TRD Item 12).
        """
        prescription = db.query(Prescription).filter(
            Prescription.prescription_id == prescription_id
        ).first()

        if not prescription:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="PRESCRIPTION_NOT_FOUND"
            )

        field = db.query(ExtractedField).filter(
            ExtractedField.field_id == field_id,
            ExtractedField.prescription_id == prescription_id
        ).first()

        if not field:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="FIELD_NOT_FOUND: Extracted field not found on this prescription."
            )

        field.value = new_value
        field.review_state = "doctor_edited"
        field.edited_by = doctor.user_id
        field.edited_reason = reason

        # Log verification action and audit log entry
        action = VerificationAction(
            verification_action_id=uuid.uuid4(),
            prescription_id=prescription_id,
            doctor_id=doctor.user_id,
            action="field_edit",
            notes_or_reason=f"Field '{field.field_name}' edited to '{new_value}'. Reason: {reason or 'None'}",
            created_at=datetime.now(timezone.utc)
        )
        db.add(action)

        audit_entry = AuditLogEntry(
            audit_log_id=uuid.uuid4(),
            actor_id=doctor.user_id,
            actor_role="doctor",
            action_type="PRESCRIPTION_FIELD_EDITED",
            target_entity_type="prescription",
            target_entity_id=prescription_id,
            justification=f"Field {field.field_name} modified",
            timestamp=datetime.now(timezone.utc)
        )
        db.add(audit_entry)

        db.commit()
        db.refresh(field)

        return FieldEditResponse(
            field_id=field.field_id,
            value=field.value,
            review_state=field.review_state
        )

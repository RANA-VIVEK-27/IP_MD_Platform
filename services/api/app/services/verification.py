import uuid
from datetime import datetime, timezone
from typing import List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.identity import User
from app.models.prescription_report import Prescription, VerificationAction
from app.models.audit import AuditLogEntry
from app.schemas.prescription import (
    VerificationQueueItem,
    VerificationAuditEntryResponse,
)


class VerificationService:
    @staticmethod
    def get_verification_queue(
        db: Session,
        doctor: User,
        status_filter: Optional[str] = "pending_review",
        limit: int = 20,
        cursor: Optional[str] = None
    ) -> Tuple[List[VerificationQueueItem], Optional[str], bool]:
        """
        Retrieves pending verification queue items for the doctor (BRD FR-9 / TRD Item 11).
        """
        query = db.query(Prescription)

        if status_filter:
            query = query.filter(Prescription.verification_status == status_filter)

        # Pending items assigned to this doctor or unassigned in the on-call pool
        query = query.filter(
            (Prescription.doctor_id == doctor.user_id) | (Prescription.doctor_id == None)
        )

        query = query.order_by(Prescription.created_at.asc())

        # Offset cursor pagination
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

        queue_items = [
            VerificationQueueItem(
                prescription_id=p.prescription_id,
                patient_ref=f"PAT-{str(p.patient_id)[:8].upper()}",
                extraction_status=p.extraction_status,
                verification_status=p.verification_status,
                queued_at=p.created_at,
                sla_breach=False
            )
            for p in page_items
        ]

        return queue_items, next_cursor, has_more

    @staticmethod
    def approve_prescription(
        db: Session,
        doctor: User,
        prescription_id: uuid.UUID,
        notes: Optional[str] = None
    ) -> Tuple[Prescription, uuid.UUID]:
        """
        Doctor approves extracted prescription, enabling checkout on regulated items (BRD FR-10).
        """
        prescription = db.query(Prescription).filter(
            Prescription.prescription_id == prescription_id
        ).first()

        if not prescription:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="PRESCRIPTION_NOT_FOUND"
            )

        if prescription.verification_status == "doctor_verified":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="ALREADY_VERIFIED: Prescription has already been approved."
            )

        prescription.verification_status = "doctor_verified"
        if not prescription.doctor_id:
            prescription.doctor_id = doctor.user_id

        # Verification action record
        action_entry = VerificationAction(
            verification_action_id=uuid.uuid4(),
            prescription_id=prescription.prescription_id,
            doctor_id=doctor.user_id,
            action="approve",
            notes_or_reason=notes,
            created_at=datetime.now(timezone.utc)
        )
        db.add(action_entry)

        # Immutable Audit Log Entry (TRD Item 12)
        audit_entry = AuditLogEntry(
            audit_log_id=uuid.uuid4(),
            actor_id=doctor.user_id,
            actor_role="doctor",
            action_type="PRESCRIPTION_APPROVED",
            target_entity_type="prescription",
            target_entity_id=prescription.prescription_id,
            justification=notes,
            timestamp=datetime.now(timezone.utc)
        )
        db.add(audit_entry)
        db.flush()

        return prescription, audit_entry.audit_log_id

    @staticmethod
    def reject_prescription(
        db: Session,
        doctor: User,
        prescription_id: uuid.UUID,
        reason: str
    ) -> Tuple[Prescription, uuid.UUID]:
        """
        Doctor rejects prescription with mandatory reason, blocking dependent order flows (BRD FR-10).
        """
        if not reason or not reason.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="REASON_REQUIRED: Mandatory rejection reason must be provided."
            )

        prescription = db.query(Prescription).filter(
            Prescription.prescription_id == prescription_id
        ).first()

        if not prescription:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="PRESCRIPTION_NOT_FOUND"
            )

        prescription.verification_status = "rejected"
        if not prescription.doctor_id:
            prescription.doctor_id = doctor.user_id

        action_entry = VerificationAction(
            verification_action_id=uuid.uuid4(),
            prescription_id=prescription.prescription_id,
            doctor_id=doctor.user_id,
            action="reject",
            notes_or_reason=reason.strip(),
            created_at=datetime.now(timezone.utc)
        )
        db.add(action_entry)

        audit_entry = AuditLogEntry(
            audit_log_id=uuid.uuid4(),
            actor_id=doctor.user_id,
            actor_role="doctor",
            action_type="PRESCRIPTION_REJECTED",
            target_entity_type="prescription",
            target_entity_id=prescription.prescription_id,
            justification=reason.strip(),
            timestamp=datetime.now(timezone.utc)
        )
        db.add(audit_entry)
        db.flush()

        return prescription, audit_entry.audit_log_id

    @staticmethod
    def get_verification_audit_log(
        db: Session,
        prescription_id: uuid.UUID
    ) -> List[VerificationAuditEntryResponse]:
        """
        Returns full timestamped verification and review audit logs for the prescription (BRD FR-11).
        """
        prescription = db.query(Prescription).filter(
            Prescription.prescription_id == prescription_id
        ).first()

        if not prescription:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="PRESCRIPTION_NOT_FOUND"
            )

        audit_entries = db.query(AuditLogEntry).filter(
            AuditLogEntry.target_entity_type == "prescription",
            AuditLogEntry.target_entity_id == prescription_id
        ).order_by(AuditLogEntry.timestamp.asc()).all()

        return [
            VerificationAuditEntryResponse(
                actor_id=a.actor_id,
                actor_role=a.actor_role,
                action_type=a.action_type,
                timestamp=a.timestamp,
                justification=a.justification
            )
            for a in audit_entries
        ]

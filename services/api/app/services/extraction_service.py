import uuid
from decimal import Decimal
from typing import Set, Dict, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.prescription_report import Prescription, ExtractedField, Report, ReportValue

VALID_EXTRACTION_STATUSES: Set[str] = {
    "queued", "processing", "extracted", "needs_review", "failed"
}

VALID_TRANSITIONS: Dict[str, Set[str]] = {
    "queued": {"processing", "failed"},
    "processing": {"extracted", "needs_review", "failed"},
    "needs_review": {"extracted", "failed"},
    "extracted": {"needs_review", "failed"},
    "failed": {"queued", "processing"},
}


class ExtractionService:
    @staticmethod
    def transition_status(entity, new_status: str) -> None:
        """
        Enforces state machine transitions for extraction_status.
        """
        if new_status not in VALID_EXTRACTION_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"INVALID_STATUS: '{new_status}' is not a valid extraction status."
            )

        current_status = entity.extraction_status
        allowed = VALID_TRANSITIONS.get(current_status, set())

        if new_status != current_status and new_status not in allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"INVALID_STATE_TRANSITION: Cannot transition extraction_status from '{current_status}' to '{new_status}'."
            )

        entity.extraction_status = new_status

    @staticmethod
    def stub_process_prescription(
        db: Session,
        prescription: Prescription,
        simulate_low_confidence: bool = False
    ) -> Prescription:
        """
        M4 Stub processing for prescription OCR/NLP extraction.
        Real OCR/NLP is integrated in M9.
        """
        ExtractionService.transition_status(prescription, "processing")
        db.flush()

        # Seed sample extracted fields
        confidence = Decimal("0.750") if simulate_low_confidence else Decimal("0.950")
        review_state = "needs_review" if simulate_low_confidence else "auto_accepted"

        fields_data = [
            ("medicine_name", "Amoxicillin 500mg", confidence),
            ("dosage", "1 capsule", Decimal("0.980")),
            ("frequency", "Three times daily", Decimal("0.920")),
            ("duration", "7 days", Decimal("0.960")),
            ("prescribing_doctor", "Dr. A. Sharma, MBBS", Decimal("0.990")),
        ]

        for field_name, value, score in fields_data:
            field = ExtractedField(
                field_id=uuid.uuid4(),
                prescription_id=prescription.prescription_id,
                field_name=field_name,
                value=value,
                confidence_score=score,
                review_state="needs_review" if score < Decimal("0.850") else "auto_accepted"
            )
            db.add(field)

        next_status = "needs_review" if simulate_low_confidence else "extracted"
        ExtractionService.transition_status(prescription, next_status)
        db.flush()
        return prescription

    @staticmethod
    def stub_process_report(
        db: Session,
        report: Report,
        simulate_abnormal: bool = False
    ) -> Report:
        """
        M4 Stub processing for diagnostic report OCR/NLP parsing.
        """
        ExtractionService.transition_status(report, "processing")
        db.flush()

        if simulate_abnormal:
            values = [
                ReportValue(
                    value_id=uuid.uuid4(),
                    report_id=report.report_id,
                    test_name="Fasting Blood Glucose",
                    value="142",
                    unit="mg/dL",
                    reference_range="70-99",
                    flag="abnormal"
                ),
                ReportValue(
                    value_id=uuid.uuid4(),
                    report_id=report.report_id,
                    test_name="HbA1c",
                    value="7.1",
                    unit="%",
                    reference_range="4.0-5.6",
                    flag="abnormal"
                )
            ]
            report.ai_explanation = (
                "Your Fasting Blood Glucose and HbA1c levels are elevated above standard reference ranges. "
                "This may indicate impaired glycemic control. Please consult your physician for clinical interpretation."
            )
        else:
            values = [
                ReportValue(
                    value_id=uuid.uuid4(),
                    report_id=report.report_id,
                    test_name="Hemoglobin",
                    value="14.5",
                    unit="g/dL",
                    reference_range="13.0-17.0",
                    flag="normal"
                ),
                ReportValue(
                    value_id=uuid.uuid4(),
                    report_id=report.report_id,
                    test_name="Total Leukocyte Count",
                    value="7200",
                    unit="/mcL",
                    reference_range="4000-11000",
                    flag="normal"
                )
            ]
            report.ai_explanation = None

        for val in values:
            db.add(val)

        ExtractionService.transition_status(report, "extracted")
        db.flush()
        return report

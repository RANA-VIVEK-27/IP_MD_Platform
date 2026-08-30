import uuid
from datetime import datetime, timezone
from typing import Optional, List, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.models.identity import User
from app.models.prescription_report import Report, ReportValue, ReportAccessGrant
from app.services.storage_service import StorageService
from app.services.extraction_service import ExtractionService
from app.schemas.prescription import (
    ReportDetailResponse,
    ReportValueResponse,
    ReportSummaryResponse,
)


class ReportService:
    @staticmethod
    async def create_report_upload(
        db: Session,
        patient: User,
        filename: str,
        content: bytes,
        content_type: str = "",
        report_type: Optional[str] = None,
        auto_process: bool = True,
        simulate_abnormal: bool = False
    ) -> Report:
        """
        Uploads a diagnostic report and initiates extraction parsing (BRD FR-1, FR-3).
        Uses real storage via StorageService.upload_document().
        """
        document = await StorageService.upload_document(
            db=db,
            user_id=patient.user_id,
            filename=filename,
            content=content,
            content_type=content_type,
            doc_type="reports",
        )

        report_id = uuid.uuid4()
        report = Report(
            report_id=report_id,
            patient_id=patient.user_id,
            document_id=document.document_id,
            report_type=report_type,
            extraction_status="queued",
            created_at=datetime.now(timezone.utc)
        )
        db.add(report)
        db.flush()

        if auto_process:
            ExtractionService.stub_process_report(db, report, simulate_abnormal=simulate_abnormal, doc_bytes=content)

        db.commit()
        db.refresh(report)
        return report

    @staticmethod
    def get_report(
        db: Session,
        user: User,
        report_id: uuid.UUID
    ) -> ReportDetailResponse:
        """
        Retrieves parsed diagnostic report with normal/abnormal flags and plain-language explanation (BRD FR-3).
        """
        report = db.query(Report).filter(
            Report.report_id == report_id
        ).first()

        if not report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="REPORT_NOT_FOUND"
            )

        if user.role == "patient" and report.patient_id != user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="FORBIDDEN: You do not have permission to view this report."
            )

        if user.role == "doctor":
            access = db.query(ReportAccessGrant).filter(
                ReportAccessGrant.report_id == report_id,
                ReportAccessGrant.doctor_id == user.user_id
            ).first()
            if not access:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="FORBIDDEN: You do not have access to this report. Ask the patient to grant access."
                )

        values = db.query(ReportValue).filter(
            ReportValue.report_id == report.report_id
        ).all()

        values_response = [
            ReportValueResponse(
                value_id=v.value_id,
                test_name=v.test_name,
                value=v.value,
                unit=v.unit,
                reference_range=v.reference_range,
                flag=v.flag
            )
            for v in values
        ]

        return ReportDetailResponse(
            report_id=report.report_id,
            patient_id=report.patient_id,
            document_id=report.document_id,
            report_type=report.report_type,
            extraction_status=report.extraction_status,
            ai_explanation=report.ai_explanation,
            is_ai_generated=True,
            values=values_response,
            created_at=report.created_at
        )

    @staticmethod
    def list_reports(
        db: Session,
        user: User,
        limit: int = 50,
        cursor: Optional[uuid.UUID] = None,
    ) -> Tuple[List[Report], Optional[str]]:
        """
        Lists reports accessible to the current user.
        - Patients see their own reports.
        - Doctors see reports they have access to via ReportAccessGrant.
        """
        query = db.query(Report)

        if user.role == "patient":
            query = query.filter(Report.patient_id == user.user_id)
        elif user.role == "doctor":
            # Get report IDs the doctor has access to
            accessible_ids = db.query(ReportAccessGrant.report_id).filter(
                ReportAccessGrant.doctor_id == user.user_id
            ).subquery()
            query = query.filter(Report.report_id.in_(accessible_ids))
        else:
            # Admins can see all reports
            pass

        query = query.order_by(desc(Report.created_at))

        if cursor:
            cursor_report = db.query(Report).filter(Report.report_id == cursor).first()
            if cursor_report:
                query = query.filter(Report.created_at < cursor_report.created_at)

        results = query.limit(limit + 1).all()
        next_cursor = None
        if len(results) > limit:
            next_cursor = str(results[-1].report_id)
            results = results[:limit]

        return results, next_cursor

    @staticmethod
    def grant_access(
        db: Session,
        patient: User,
        report_id: uuid.UUID,
        doctor_id: uuid.UUID,
    ) -> dict:
        """
        Patient grants a doctor access to a report.
        """
        report = db.query(Report).filter(Report.report_id == report_id).first()
        if not report:
            raise HTTPException(status_code=404, detail="REPORT_NOT_FOUND")
        if report.patient_id != patient.user_id:
            raise HTTPException(status_code=403, detail="FORBIDDEN: You do not own this report")

        doctor = db.query(User).filter(User.user_id == doctor_id, User.role == "doctor").first()
        if not doctor:
            raise HTTPException(status_code=404, detail="DOCTOR_NOT_FOUND")

        existing = db.query(ReportAccessGrant).filter(
            ReportAccessGrant.report_id == report_id,
            ReportAccessGrant.doctor_id == doctor_id,
        ).first()
        if existing:
            return {"message": "Access already granted", "grant_id": str(existing.grant_id)}

        grant = ReportAccessGrant(
            report_id=report_id,
            doctor_id=doctor_id,
            granted_at=datetime.now(timezone.utc),
        )
        db.add(grant)
        db.commit()

        return {"message": "Access granted", "grant_id": str(grant.grant_id)}

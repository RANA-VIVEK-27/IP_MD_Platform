import uuid
from typing import Optional
from fastapi import APIRouter, Depends, File, Form, UploadFile, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.identity import User
from app.api.deps import get_current_user, require_roles
from app.services.report_service import ReportService
from app.schemas.prescription import (
    ReportUploadResponse,
    ReportDetailResponse,
)

router = APIRouter(prefix="/reports", tags=["Diagnostic Report Intake & Analysis"])


@router.post(
    "/upload",
    response_model=ReportUploadResponse,
    status_code=status.HTTP_201_CREATED
)
async def upload_report(
    file: UploadFile = File(..., description="Diagnostic report PDF or image (max 20MB)"),
    report_type: Optional[str] = Form(None, description="Report type e.g. blood_panel, sonography, ct_scan"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("patient"))
):
    """
    Uploads a diagnostic report (blood report, sonography, etc.) for extraction (BRD FR-1, FR-3, TRD Item 3).
    """
    content = await file.read()

    report = ReportService.create_report_upload(
        db=db,
        patient=current_user,
        filename=file.filename or "report.pdf",
        content=content,
        content_type=file.content_type or "",
        report_type=report_type,
        auto_process=True
    )

    return ReportUploadResponse(
        report_id=report.report_id,
        document_id=report.document_id,
        status=report.extraction_status
    )


@router.get("/{report_id}", response_model=ReportDetailResponse)
def get_report_detail(
    report_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves structured test values, normal/abnormal flags, and AI-generated plain language explanation (BRD FR-3).
    """
    return ReportService.get_report(db, current_user, report_id)

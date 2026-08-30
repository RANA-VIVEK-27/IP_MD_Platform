import uuid
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, UploadFile, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.db.session import get_db
from app.models.identity import User
from app.models.prescription_report import Document
from app.api.deps import get_current_user, require_roles
from app.services.storage_service import StorageService
from app.services.audit_service import AuditService
from app.schemas.document import (
    DocumentUploadResponse,
    DocumentResponse,
    DocumentDownloadResponse,
    DocumentListResponse,
    DocumentStatusResponse,
    DocumentDeleteResponse,
)
from app.api.celery_tasks import scan_document, process_document

router = APIRouter(prefix="/documents", tags=["Document Management"])


@router.post(
    "/upload",
    response_model=DocumentUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a document",
    description="Upload a medical document (prescription, report, etc.). Validates file, stores securely, and queues security scan.",
)
async def upload_document(
    file: UploadFile = File(..., description="Document file (JPG, PNG, PDF, max 20MB)"),
    doc_type: str = Form("documents", description="Document category: documents, prescriptions, reports"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("patient", "doctor", "admin", "user_admin", "super_admin")),
):
    content = await file.read()

    document = await StorageService.upload_document(
        db=db,
        user_id=current_user.user_id,
        filename=file.filename or "unnamed",
        content=content,
        content_type=file.content_type or "",
        doc_type=doc_type,
    )

    # Audit log
    AuditService.log_action(
        db,
        actor_id=current_user.user_id,
        actor_role=current_user.role,
        action_type="DOCUMENT_UPLOADED",
        target_entity_type="document",
        target_entity_id=document.document_id,
        justification=f"Uploaded '{document.original_filename}' ({document.file_size_bytes} bytes)",
    )
    db.commit()

    # Queue background security scan & vector processing with inline fallback
    try:
        scan_and_process_document.delay(str(document.document_id))
    except Exception:
        try:
            scan_document(str(document.document_id))
            process_document(str(document.document_id))
            db.refresh(document)
        except Exception as ie:
            print(f"[Document Processing Error]: {ie}")

    return DocumentUploadResponse(
        document_id=document.document_id,
        filename=document.original_filename,
        mime_type=document.mime_type,
        file_size=document.file_size_bytes,
        doc_status=document.doc_status,
        scan_status=document.scan_status,
        checksum_sha256=document.checksum_sha256,
    )



@router.get(
    "",
    response_model=DocumentListResponse,
    summary="List documents",
    description="List documents for the authenticated user. Patients see only their own; admins see all.",
)
def list_documents(
    doc_status: Optional[str] = Query(None, description="Filter by document status"),
    doc_type: Optional[str] = Query(None, description="Filter by document type (prescription, report)"),
    limit: int = Query(20, ge=1, le=100),
    cursor: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Document).filter(Document.deleted_at.is_(None))

    # Scope by role
    if current_user.role == "patient":
        query = query.filter(Document.uploaded_by == current_user.user_id)

    if doc_status:
        query = query.filter(Document.doc_status == doc_status)

    query = query.order_by(desc(Document.uploaded_at))

    # Cursor pagination
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

    doc_list = []
    for doc in page_items:
        doc_list.append(DocumentResponse(
            document_id=doc.document_id,
            uploaded_by=doc.uploaded_by,
            original_filename=doc.original_filename,
            mime_type=doc.mime_type,
            file_size_bytes=doc.file_size_bytes,
            checksum_sha256=doc.checksum_sha256,
            file_type=doc.file_type,
            doc_status=doc.doc_status,
            scan_status=doc.scan_status,
            processing_status=doc.processing_status,
            storage_provider=doc.storage_provider,
            uploaded_at=doc.uploaded_at,
            updated_at=doc.updated_at,
        ))

    return DocumentListResponse(
        data=doc_list,
        next_cursor=next_cursor,
        has_more=has_more,
    )


@router.get(
    "/{document_id}",
    response_model=DocumentResponse,
    summary="Get document details",
    description="Get metadata for a specific document.",
)
def get_document(
    document_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    document = StorageService.get_document_or_404(db, document_id)

    # Authorization
    if current_user.role == "patient" and document.uploaded_by != current_user.user_id:
        from fastapi import HTTPException
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="FORBIDDEN")

    AuditService.log_action(
        db,
        actor_id=current_user.user_id,
        actor_role=current_user.role,
        action_type="DOCUMENT_VIEWED",
        target_entity_type="document",
        target_entity_id=document.document_id,
    )
    db.commit()

    return DocumentResponse(
        document_id=document.document_id,
        uploaded_by=document.uploaded_by,
        original_filename=document.original_filename,
        mime_type=document.mime_type,
        file_size_bytes=document.file_size_bytes,
        checksum_sha256=document.checksum_sha256,
        file_type=document.file_type,
        doc_status=document.doc_status,
        scan_status=document.scan_status,
        processing_status=document.processing_status,
        storage_provider=document.storage_provider,
        uploaded_at=document.uploaded_at,
        updated_at=document.updated_at,
    )


@router.get(
    "/{document_id}/status",
    response_model=DocumentStatusResponse,
    summary="Get document processing status",
    description="Poll document scan/processing status.",
)
def get_document_status(
    document_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    document = StorageService.get_document_or_404(db, document_id)

    if current_user.role == "patient" and document.uploaded_by != current_user.user_id:
        from fastapi import HTTPException
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="FORBIDDEN")

    return DocumentStatusResponse(
        document_id=document.document_id,
        doc_status=document.doc_status,
        scan_status=document.scan_status,
        processing_status=document.processing_status,
    )


@router.get(
    "/{document_id}/download",
    response_model=DocumentDownloadResponse,
    summary="Download document",
    description="Get a short-lived signed URL to securely download the document.",
)
async def download_document(
    document_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    document = StorageService.get_document_or_404(db, document_id)

    download_url = await StorageService.get_download_url(db, document, current_user.user_id, current_user.role)

    AuditService.log_action(
        db,
        actor_id=current_user.user_id,
        actor_role=current_user.role,
        action_type="DOCUMENT_DOWNLOADED",
        target_entity_type="document",
        target_entity_id=document.document_id,
    )
    db.commit()

    return DocumentDownloadResponse(
        document_id=document.document_id,
        download_url=download_url,
        expires_in=300,
        filename=document.original_filename,
    )


@router.delete(
    "/{document_id}",
    response_model=DocumentDeleteResponse,
    summary="Delete document",
    description="Soft-delete a document. Only the owner or an admin can delete.",
)
async def delete_document(
    document_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    document = StorageService.get_document_or_404(db, document_id)

    # Authorization
    if current_user.role == "patient" and document.uploaded_by != current_user.user_id:
        from fastapi import HTTPException
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="FORBIDDEN")

    await StorageService.soft_delete_document(db, document)

    AuditService.log_action(
        db,
        actor_id=current_user.user_id,
        actor_role=current_user.role,
        action_type="DOCUMENT_DELETED",
        target_entity_type="document",
        target_entity_id=document.document_id,
        justification=f"Deleted document '{document.original_filename}'",
    )
    db.commit()

    return DocumentDeleteResponse(
        document_id=document.document_id,
        deleted=True,
        message="Document deleted successfully.",
    )

from enum import Enum
from typing import Optional, List
from uuid import UUID
from datetime import datetime

from pydantic import BaseModel, Field


class DocumentStatusEnum(str, Enum):
    UPLOAD_PENDING = "upload_pending"
    UPLOADED = "uploaded"
    QUARANTINED = "quarantined"
    SCANNING = "scanning"
    CLEAN = "clean"
    PROCESSING = "processing"
    READY = "ready"
    UPLOAD_FAILED = "upload_failed"
    SCAN_FAILED = "scan_failed"
    INFECTED = "infected"
    PROCESSING_FAILED = "processing_failed"
    DELETED = "deleted"


class ScanStatusEnum(str, Enum):
    PENDING = "pending"
    CLEAN = "clean"
    INFECTED = "infected"
    SCAN_FAILED = "scan_failed"


class ProcessingStatusEnum(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class DocumentUploadResponse(BaseModel):
    document_id: UUID
    filename: str
    mime_type: str
    file_size: int
    doc_status: str
    scan_status: str
    checksum_sha256: Optional[str] = None
    message: str = "Document uploaded successfully. Security scan in progress."


class DocumentResponse(BaseModel):
    document_id: UUID
    uploaded_by: UUID
    original_filename: str
    mime_type: str
    file_size_bytes: int
    checksum_sha256: Optional[str] = None
    file_type: str
    doc_status: str
    scan_status: str
    processing_status: str
    storage_provider: Optional[str] = None
    uploaded_at: datetime
    updated_at: Optional[datetime] = None


class DocumentDownloadResponse(BaseModel):
    document_id: UUID
    download_url: str
    expires_in: int
    filename: str


class DocumentListResponse(BaseModel):
    data: List[DocumentResponse]
    next_cursor: Optional[str] = None
    has_more: bool = False


class DocumentStatusResponse(BaseModel):
    document_id: UUID
    doc_status: str
    scan_status: str
    processing_status: str


class DocumentDeleteResponse(BaseModel):
    document_id: UUID
    deleted: bool
    message: str

from enum import Enum

from pydantic import BaseModel


class DocumentType(str, Enum):
    PRESCRIPTION = "prescription"
    REPORT = "report"


class DocumentUploadResponse(BaseModel):
    document_id: int
    document_type: DocumentType
    filename: str
    file_size: int
    extraction_status: str
    malware_scan_status: str
    verification_status: str


class DocumentStatusResponse(BaseModel):
    document_id: int
    extraction_status: str
    malware_scan_status: str
    verification_status: str
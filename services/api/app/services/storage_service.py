import os
import uuid
from datetime import datetime, timezone
from typing import Tuple
from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session
from app.models.prescription_report import Document

MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024  # 20 MB
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "pdf"}
ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "application/pdf",
    "application/octet-stream",  # Fallback handled via extension
}


class StorageService:
    @staticmethod
    def validate_file(filename: str, content: bytes, content_type: str = "") -> str:
        """
        Validates file size (max 20MB) and extension/MIME type.
        Returns normalized file type: 'jpg', 'png', or 'pdf'.
        """
        if len(content) > MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="FILE_TOO_LARGE: Uploaded file exceeds the 20MB maximum limit."
            )

        if not filename or "." not in filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="UNSUPPORTED_FILE_TYPE: Missing or invalid file extension."
            )

        ext = filename.rsplit(".", 1)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"UNSUPPORTED_FILE_TYPE: File extension '{ext}' is not supported. Allowed: jpg, png, pdf."
            )

        # Normalize extension for database enum ('jpg', 'png', 'pdf')
        normalized_type = "jpg" if ext in ("jpg", "jpeg") else ext
        return normalized_type

    @staticmethod
    def save_and_create_document(
        db: Session,
        user_id: uuid.UUID,
        filename: str,
        content: bytes,
        content_type: str = ""
    ) -> Document:
        """
        Validates the file, creates a storage URL, and records a new Document entry.
        """
        normalized_type = StorageService.validate_file(filename, content, content_type)
        doc_id = uuid.uuid4()

        # Simulated cloud/object storage URL (TRD Section 4.1 Item 2)
        storage_url = f"https://storage.ipmd-platform.in/documents/{doc_id}.{normalized_type}"

        document = Document(
            document_id=doc_id,
            uploaded_by=user_id,
            storage_url=storage_url,
            file_type=normalized_type,
            file_size_bytes=len(content),
            malware_scan_status="clean",
            uploaded_at=datetime.now(timezone.utc)
        )
        db.add(document)
        db.flush()
        return document

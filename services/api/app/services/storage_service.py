import hashlib
import io
import os
import uuid
from datetime import datetime, timezone
from typing import Optional, Tuple

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.prescription_report import Document
from app.storage.factory import get_storage

# Magic bytes for file type validation
MAGIC_BYTES = {
    "jpg": [b"\xff\xd8\xff"],
    "jpeg": [b"\xff\xd8\xff"],
    "png": [b"\x89PNG\r\n\x1a\n"],
    "pdf": [b"%PDF"],
}


class StorageService:
    @staticmethod
    def sanitize_filename(filename: str) -> str:
        """Sanitize filename - remove path traversal, null bytes, etc."""
        if not filename:
            return "unnamed_file"

        # Remove null bytes
        filename = filename.replace("\x00", "")

        # Remove path components
        filename = os.path.basename(filename)

        # Remove leading dots and spaces
        filename = filename.lstrip(". ")

        # Replace dangerous characters
        for ch in ["\\", "/", "..", ":", "*", "?", '"', "<", ">", "|"]:
            filename = filename.replace(ch, "_")

        # Ensure non-empty
        if not filename or filename.strip() == "":
            filename = "unnamed_file"

        return filename[:255]  # Truncate to max length

    @staticmethod
    def validate_magic_bytes(content: bytes, extension: str) -> bool:
        """Validate file content matches expected type via magic bytes."""
        if extension not in MAGIC_BYTES:
            return False
        for magic in MAGIC_BYTES[extension]:
            if content[:len(magic)] == magic:
                return True
        return False

    @staticmethod
    def calculate_checksum(data: bytes) -> str:
        """Calculate SHA-256 checksum of file data."""
        sha256 = hashlib.sha256()
        sha256.update(data)
        return sha256.hexdigest()

    @staticmethod
    def generate_storage_key(owner_id: uuid.UUID, document_id: uuid.UUID, extension: str, doc_type: str = "documents") -> str:
        """Generate a secure, unique storage key."""
        return f"{doc_type}/{owner_id}/{document_id}/original.{extension}"

    @staticmethod
    async def validate_upload(filename: str, content: bytes, content_type: str = "") -> Tuple[str, str]:
        """
        Validate file upload: size, extension, MIME, magic bytes.
        Returns (normalized_type, mime_type).
        """
        # 1. Check empty file
        if len(content) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="EMPTY_FILE: Uploaded file is empty."
            )

        # 2. Check file size
        if len(content) > settings.UPLOAD_MAX_SIZE_BYTES:
            max_mb = settings.UPLOAD_MAX_SIZE_BYTES // (1024 * 1024)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"FILE_TOO_LARGE: Uploaded file exceeds the {max_mb}MB maximum limit."
            )

        # 3. Check extension
        if not filename or "." not in filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="UNSUPPORTED_FILE_TYPE: Missing or invalid file extension."
            )

        ext = filename.rsplit(".", 1)[1].lower()
        if ext not in settings.UPLOAD_ALLOWED_EXTENSIONS_SET:
            allowed = ", ".join(sorted(settings.UPLOAD_ALLOWED_EXTENSIONS_SET))
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"UNSUPPORTED_FILE_TYPE: File extension '{ext}' is not supported. Allowed: {allowed}."
            )

        # Normalize extension
        normalized_type = "jpg" if ext in ("jpg", "jpeg") else ext

        # 4. Validate MIME type (authoritative backend check)
        mime_map = {
            "jpg": "image/jpeg",
            "jpeg": "image/jpeg",
            "png": "image/png",
            "pdf": "application/pdf",
        }
        expected_mime = mime_map.get(normalized_type, "application/octet-stream")

        # Check against configured MIME types
        if content_type and content_type not in settings.UPLOAD_ALLOWED_MIME_TYPES_SET:
            # Allow if it matches our expected MIME for the extension
            if content_type != expected_mime:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"INVALID_MIME_TYPE: Content type '{content_type}' is not allowed."
                )

        # 5. Validate magic bytes (content-based validation)
        if not StorageService.validate_magic_bytes(content, normalized_type):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"INVALID_FILE_CONTENT: File content does not match extension '{normalized_type}'."
            )

        return normalized_type, expected_mime

    @staticmethod
    async def upload_document(
        db: Session,
        user_id: uuid.UUID,
        filename: str,
        content: bytes,
        content_type: str = "",
        doc_type: str = "documents",
    ) -> Document:
        """
        Complete upload flow: validate, checksum, store, create metadata.
        Returns Document in QUARANTINED state.
        """
        # 1. Validate file
        normalized_type, mime_type = await StorageService.validate_upload(filename, content, content_type)

        # 2. Generate document ID and storage key
        doc_id = uuid.uuid4()
        storage_key = StorageService.generate_storage_key(user_id, doc_id, normalized_type, doc_type)

        # 3. Calculate checksum
        checksum = StorageService.calculate_checksum(content)

        # 4. Upload to storage
        storage = get_storage()
        try:
            data_stream = io.BytesIO(content)
            await storage.upload(
                key=storage_key,
                data=data_stream,
                content_type=mime_type,
                size=len(content),
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"STORAGE_ERROR: Failed to store file. {str(e)}"
            )

        # 5. Create document metadata
        safe_filename = StorageService.sanitize_filename(filename)
        document = Document(
            document_id=doc_id,
            uploaded_by=user_id,
            original_filename=safe_filename,
            mime_type=mime_type,
            file_size_bytes=len(content),
            checksum_sha256=checksum,
            storage_url=f"{storage_key}",
            file_type=normalized_type,
            storage_key=storage_key,
            storage_provider=settings.STORAGE_PROVIDER,
            doc_status="quarantined",
            scan_status="pending",
            processing_status="pending",
            uploaded_at=datetime.now(timezone.utc),
        )
        db.add(document)
        db.flush()
        return document

    @staticmethod
    async def get_download_url(db: Session, document: Document, user_id: uuid.UUID, user_role: str) -> str:
        """
        Generate a secure signed download URL after authorization checks.
        """
        # Verify document is downloadable
        if document.doc_status in ("deleted", "infected", "scan_failed", "upload_pending", "upload_failed"):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="DOCUMENT_NOT_AVAILABLE: This document is not available for download."
            )

        if document.doc_status not in ("ready", "clean", "processing"):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"DOCUMENT_NOT_READY: Document is in '{document.doc_status}' state."
            )

        # Authorization check
        if user_role == "patient" and document.uploaded_by != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="FORBIDDEN: You do not have permission to download this document."
            )

        # Generate signed URL
        storage = get_storage()
        try:
            url = await storage.generate_signed_url(
                key=document.storage_key,
                expires_in=settings.STORAGE_SIGNED_URL_EXPIRES,
            )
            return url
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="STORAGE_ERROR: Failed to generate download URL."
            )

    @staticmethod
    def get_document_or_404(db: Session, document_id: uuid.UUID) -> Document:
        """Get document by ID, raise 404 if not found or soft-deleted."""
        document = db.query(Document).filter(
            Document.document_id == document_id,
            Document.deleted_at.is_(None),
        ).first()
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="DOCUMENT_NOT_FOUND"
            )
        return document

    @staticmethod
    async def soft_delete_document(db: Session, document: Document) -> None:
        """Soft delete a document."""
        document.doc_status = "deleted"
        document.deleted_at = datetime.now(timezone.utc)
        document.updated_at = datetime.now(timezone.utc)
        db.flush()

    @staticmethod
    def transition_doc_status(document: Document, new_status: str) -> None:
        """Enforce valid document state transitions."""
        VALID_TRANSITIONS = {
            "upload_pending": {"uploaded", "upload_failed", "deleted"},
            "uploaded": {"quarantined", "upload_failed", "deleted"},
            "quarantined": {"scanning", "deleted"},
            "scanning": {"clean", "infected", "scan_failed", "deleted"},
            "clean": {"processing", "deleted"},
            "processing": {"ready", "processing_failed", "deleted"},
            "ready": {"deleted"},
            "upload_failed": {"deleted"},
            "scan_failed": {"deleted"},
            "infected": {"deleted"},
            "processing_failed": {"quarantined", "deleted"},
            "deleted": set(),
        }

        current = document.doc_status
        allowed = VALID_TRANSITIONS.get(current, set())

        if new_status not in allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"INVALID_STATE_TRANSITION: Cannot move document from '{current}' to '{new_status}'."
            )
        document.doc_status = new_status

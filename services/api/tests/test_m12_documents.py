"""
M12 Tests — Document Storage & Secure File Management
Tests for storage service, upload validation, checksum, state machine, authorization.
"""
import uuid
import hashlib
import io
import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from fastapi import UploadFile, status
from fastapi.testclient import TestClient

from app.services.storage_service import StorageService
from app.services.malware_scanner import SafeScanner, ScanResult
from app.models.prescription_report import Document
from app.models.identity import User


# ─── Sample file content ──────────────────────────────────────────
VALID_PDF_BYTES = b"%PDF-1.4 fake-pdf-content-for-testing"
VALID_PNG_BYTES = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR" + b"\x00" * 50
VALID_JPG_BYTES = b"\xff\xd8\xff\xe0" + b"\x00" * 50
EMPTY_FILE = b""
OVERSIZED_FILE = b"\x00" * (21 * 1024 * 1024)  # 21MB


# ─── Filename Sanitization ───────────────────────────────────────
class TestFilenameSanitization:
    def test_normal_filename(self):
        assert StorageService.sanitize_filename("report.pdf") == "report.pdf"

    def test_path_traversal(self):
        result = StorageService.sanitize_filename("../../etc/passwd")
        assert ".." not in result
        assert "/" not in result

    def test_null_bytes(self):
        result = StorageService.sanitize_filename("file\x00.pdf")
        assert "\x00" not in result

    def test_empty_filename(self):
        assert StorageService.sanitize_filename("") == "unnamed_file"

    def test_dots_only(self):
        result = StorageService.sanitize_filename("...")
        assert result == "unnamed_file"

    def test_long_filename_truncated(self):
        result = StorageService.sanitize_filename("a" * 300 + ".pdf")
        assert len(result) <= 255

    def test_dangerous_chars(self):
        result = StorageService.sanitize_filename('file:name*?"<>|.pdf')
        for ch in [":", "*", "?", '"', "<", ">", "|"]:
            assert ch not in result


# ─── Magic Byte Validation ────────────────────────────────────────
class TestMagicBytes:
    def test_valid_pdf(self):
        assert StorageService.validate_magic_bytes(VALID_PDF_BYTES, "pdf") is True

    def test_valid_png(self):
        assert StorageService.validate_magic_bytes(VALID_PNG_BYTES, "png") is True

    def test_valid_jpg(self):
        assert StorageService.validate_magic_bytes(VALID_JPG_BYTES, "jpg") is True

    def test_mismatch_pdf_extension(self):
        assert StorageService.validate_magic_bytes(VALID_PNG_BYTES, "pdf") is False

    def test_unknown_extension(self):
        assert StorageService.validate_magic_bytes(b"data", "xyz") is False


# ─── Checksum ─────────────────────────────────────────────────────
class TestChecksum:
    def test_sha256_deterministic(self):
        data = b"test file content"
        c1 = StorageService.calculate_checksum(data)
        c2 = StorageService.calculate_checksum(data)
        assert c1 == c2

    def test_sha256_correct(self):
        data = b"hello world"
        expected = hashlib.sha256(data).hexdigest()
        assert StorageService.calculate_checksum(data) == expected

    def test_different_data_different_checksum(self):
        c1 = StorageService.calculate_checksum(b"file1")
        c2 = StorageService.calculate_checksum(b"file2")
        assert c1 != c2


# ─── Storage Key Generation ──────────────────────────────────────
class TestStorageKey:
    def test_key_format(self):
        key = StorageService.generate_storage_key(
            uuid.UUID("11111111-1111-1111-1111-111111111111"),
            uuid.UUID("22222222-2222-2222-2222-222222222222"),
            "pdf",
            "prescriptions",
        )
        assert "prescriptions/" in key
        assert "11111111-1111-1111-1111-111111111111" in key
        assert "22222222-2222-2222-2222-222222222222" in key
        assert key.endswith("original.pdf")


# ─── File Validation ──────────────────────────────────────────────
class TestFileValidation:
    @pytest.mark.asyncio
    async def test_empty_file_rejected(self):
        with pytest.raises(Exception) as exc_info:
            await StorageService.validate_upload("file.pdf", EMPTY_FILE, "application/pdf")
        assert "EMPTY_FILE" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_oversized_file_rejected(self):
        with pytest.raises(Exception) as exc_info:
            await StorageService.validate_upload("file.pdf", OVERSIZED_FILE, "application/pdf")
        assert "FILE_TOO_LARGE" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_no_extension_rejected(self):
        with pytest.raises(Exception) as exc_info:
            await StorageService.validate_upload("noext", VALID_PDF_BYTES, "application/pdf")
        assert "UNSUPPORTED_FILE_TYPE" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_invalid_extension_rejected(self):
        with pytest.raises(Exception) as exc_info:
            await StorageService.validate_upload("file.exe", b"MZ\x00\x00", "application/octet-stream")
        assert "UNSUPPORTED_FILE_TYPE" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_valid_pdf(self):
        ext, mime = await StorageService.validate_upload("report.pdf", VALID_PDF_BYTES, "application/pdf")
        assert ext == "pdf"

    @pytest.mark.asyncio
    async def test_valid_png(self):
        ext, mime = await StorageService.validate_upload("image.png", VALID_PNG_BYTES, "image/png")
        assert ext == "png"

    @pytest.mark.asyncio
    async def test_valid_jpg(self):
        ext, mime = await StorageService.validate_upload("photo.jpg", VALID_JPG_BYTES, "image/jpeg")
        assert ext == "jpg"

    @pytest.mark.asyncio
    async def test_magic_bytes_mismatch(self):
        with pytest.raises(Exception) as exc_info:
            await StorageService.validate_upload("image.pdf", VALID_PNG_BYTES, "application/pdf")
        assert "INVALID_FILE_CONTENT" in str(exc_info.value.detail)


# ─── State Machine ────────────────────────────────────────────────
class TestDocumentStateMachine:
    def _make_doc(self, status="quarantined"):
        doc = MagicMock(spec=Document)
        doc.doc_status = status
        return doc

    def test_valid_transition_quarantined_to_scanning(self):
        doc = self._make_doc("quarantined")
        StorageService.transition_doc_status(doc, "scanning")
        assert doc.doc_status == "scanning"

    def test_valid_transition_scanning_to_clean(self):
        doc = self._make_doc("scanning")
        StorageService.transition_doc_status(doc, "clean")
        assert doc.doc_status == "clean"

    def test_valid_transition_clean_to_processing(self):
        doc = self._make_doc("clean")
        StorageService.transition_doc_status(doc, "processing")
        assert doc.doc_status == "processing"

    def test_valid_transition_processing_to_ready(self):
        doc = self._make_doc("processing")
        StorageService.transition_doc_status(doc, "ready")
        assert doc.doc_status == "ready"

    def test_invalid_transition_ready_to_scanning(self):
        doc = self._make_doc("ready")
        with pytest.raises(Exception) as exc_info:
            StorageService.transition_doc_status(doc, "scanning")
        assert "INVALID_STATE_TRANSITION" in str(exc_info.value.detail)

    def test_invalid_transition_infected_to_ready(self):
        doc = self._make_doc("infected")
        with pytest.raises(Exception) as exc_info:
            StorageService.transition_doc_status(doc, "ready")
        assert "INVALID_STATE_TRANSITION" in str(exc_info.value.detail)

    def test_deleted_has_no_transitions(self):
        doc = self._make_doc("deleted")
        with pytest.raises(Exception):
            StorageService.transition_doc_status(doc, "ready")


# ─── Malware Scanner ─────────────────────────────────────────────
class TestMalwareScanner:
    @pytest.mark.asyncio
    async def test_safe_scanner_always_clean(self):
        scanner = SafeScanner()
        result = await scanner.scan(VALID_PDF_BYTES, "test.pdf")
        assert result == ScanResult.CLEAN

    @pytest.mark.asyncio
    async def test_safe_scanner_empty_file(self):
        scanner = SafeScanner()
        result = await scanner.scan(b"", "empty.pdf")
        assert result == ScanResult.CLEAN


# ─── API Endpoints ────────────────────────────────────────────────
class TestDocumentAPI:
    def _auth_headers(self, token: str = "test-token"):
        return {"Authorization": f"Bearer {token}"}

    def test_upload_requires_auth(self, client):
        response = client.post("/api/v1/documents/upload")
        assert response.status_code in (401, 403)

    def test_list_requires_auth(self, client):
        response = client.get("/api/v1/documents")
        assert response.status_code in (401, 403)

    def test_download_requires_auth(self, client):
        doc_id = str(uuid.uuid4())
        response = client.get(f"/api/v1/documents/{doc_id}/download")
        assert response.status_code in (401, 403)

    def test_delete_requires_auth(self, client):
        doc_id = str(uuid.uuid4())
        response = client.delete(f"/api/v1/documents/{doc_id}")
        assert response.status_code in (401, 403)

    def test_get_nonexistent_document(self, client, db_session):
        # Create a test user
        user = User(
            user_id=uuid.uuid4(),
            role="patient",
            full_name="Test Patient",
            email="test@test.com",
            phone="1234567890",
            status="active",
        )
        db_session.add(user)
        db_session.commit()

        from app.core.security import create_access_token
        token = create_access_token(str(user.user_id), role="patient")
        headers = self._auth_headers(token)

        fake_id = str(uuid.uuid4())
        response = client.get(f"/api/v1/documents/{fake_id}", headers=headers)
        assert response.status_code == 404

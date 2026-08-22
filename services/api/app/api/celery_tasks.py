import uuid
import logging
from celery import Celery
from datetime import datetime, timezone

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.prescription_report import Document
from app.services.malware_scanner import get_scanner, ScanResult
from app.services.storage_service import StorageService
from app.services.audit_service import AuditService

logger = logging.getLogger(__name__)

celery_app = Celery(
    "ipmd_documents",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_soft_time_limit=60,
    task_time_limit=120,
)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=10)
def scan_document(self, document_id: str):
    """
    Background task: scan document for malware.
    Flow: QUARANTINED -> SCANNING -> CLEAN/INFECTED/SCAN_FAILED
    """
    db = SessionLocal()
    try:
        doc_uuid = uuid.UUID(document_id)
        document = db.query(Document).filter(Document.document_id == doc_uuid).first()
        if not document:
            logger.error(f"Document {document_id} not found for scanning")
            return {"success": False, "error": "Document not found"}

        if document.doc_status == "deleted":
            logger.info(f"Document {document_id} was deleted, skipping scan")
            return {"success": False, "error": "Document deleted"}

        # Transition to SCANNING
        StorageService.transition_doc_status(document, "scanning")
        document.scan_status = "pending"
        db.commit()

        # Audit: scan started
        AuditService.log_action(
            db,
            actor_id=document.uploaded_by,
            actor_role="system",
            action_type="DOCUMENT_SCAN_STARTED",
            target_entity_type="document",
            target_entity_id=document.document_id,
            justification="Automated malware scan initiated",
        )
        db.commit()

        # Read file from storage and scan
        try:
            from app.storage.factory import get_storage
            import asyncio

            storage = get_storage()
            loop = asyncio.new_event_loop()
            file_data = loop.run_until_complete(storage.download(document.storage_key))
            content = file_data.read()
            file_data.close()
            loop.close()
        except Exception as e:
            logger.error(f"Failed to read file for scanning: {e}")
            document.doc_status = "scan_failed"
            document.scan_status = "scan_failed"
            db.commit()
            return {"success": False, "error": f"Storage read failed: {str(e)}"}

        # Perform scan
        scanner = get_scanner()
        loop = asyncio.new_event_loop()
        result = loop.run_until_complete(scanner.scan(content, document.original_filename))
        loop.close()

        if result == ScanResult.CLEAN:
            document.doc_status = "clean"
            document.scan_status = "clean"
            AuditService.log_action(
                db,
                actor_id=document.uploaded_by,
                actor_role="system",
                action_type="DOCUMENT_SCAN_CLEAN",
                target_entity_type="document",
                target_entity_id=document.document_id,
                justification="Malware scan passed",
            )
            logger.info(f"Document {document_id} scan: CLEAN")

        elif result == ScanResult.INFECTED:
            document.doc_status = "infected"
            document.scan_status = "infected"
            AuditService.log_action(
                db,
                actor_id=document.uploaded_by,
                actor_role="system",
                action_type="DOCUMENT_INFECTED",
                target_entity_type="document",
                target_entity_id=document.document_id,
                justification="Malware detected in uploaded file",
            )
            logger.warning(f"Document {document_id} scan: INFECTED")

        else:  # ERROR
            document.doc_status = "scan_failed"
            document.scan_status = "scan_failed"
            AuditService.log_action(
                db,
                actor_id=document.uploaded_by,
                actor_role="system",
                action_type="DOCUMENT_SCAN_FAILED",
                target_entity_type="document",
                target_entity_id=document.document_id,
                justification="Scanner error during malware scan",
            )
            logger.error(f"Document {document_id} scan: ERROR")

        db.commit()
        return {"success": True, "document_id": document_id, "scan_result": result.value}

    except Exception as exc:
        db.rollback()
        logger.error(f"Scan task failed for {document_id}: {exc}")
        try:
            doc_uuid = uuid.UUID(document_id)
            document = db.query(Document).filter(Document.document_id == doc_uuid).first()
            if document and document.doc_status not in ("deleted", "infected"):
                document.doc_status = "scan_failed"
                document.scan_status = "scan_failed"
                db.commit()
        except Exception:
            pass
        raise self.retry(exc=exc)
    finally:
        db.close()


@celery_app.task(bind=True, max_retries=2, default_retry_delay=15)
def process_document(self, document_id: str):
    """
    Background task: process document (OCR/extraction placeholder).
    Flow: CLEAN -> PROCESSING -> READY/PROCESSING_FAILED
    """
    db = SessionLocal()
    try:
        doc_uuid = uuid.UUID(document_id)
        document = db.query(Document).filter(Document.document_id == doc_uuid).first()
        if not document:
            logger.error(f"Document {document_id} not found for processing")
            return {"success": False, "error": "Document not found"}

        if document.doc_status == "deleted":
            return {"success": False, "error": "Document deleted"}

        # Only process CLEAN documents
        if document.doc_status != "clean":
            logger.info(f"Document {document_id} status is '{document.doc_status}', skipping processing")
            return {"success": False, "error": f"Invalid status: {document.doc_status}"}

        # Transition to PROCESSING
        StorageService.transition_doc_status(document, "processing")
        document.processing_status = "processing"
        db.commit()

        # Audit: processing started
        AuditService.log_action(
            db,
            actor_id=document.uploaded_by,
            actor_role="system",
            action_type="DOCUMENT_PROCESSING_STARTED",
            target_entity_type="document",
            target_entity_id=document.document_id,
            justification="Document processing initiated",
        )
        db.commit()

        # TODO: M13 - Real OCR/NLP processing pipeline
        # For now, mark as ready
        document.doc_status = "ready"
        document.processing_status = "completed"
        document.updated_at = datetime.now(timezone.utc)

        AuditService.log_action(
            db,
            actor_id=document.uploaded_by,
            actor_role="system",
            action_type="DOCUMENT_READY",
            target_entity_type="document",
            target_entity_id=document.document_id,
            justification="Document processing completed successfully",
        )

        db.commit()
        logger.info(f"Document {document_id} processing complete: READY")
        return {"success": True, "document_id": document_id, "status": "ready"}

    except Exception as exc:
        db.rollback()
        logger.error(f"Processing task failed for {document_id}: {exc}")
        try:
            doc_uuid = uuid.UUID(document_id)
            document = db.query(Document).filter(Document.document_id == doc_uuid).first()
            if document and document.doc_status not in ("deleted", "infected"):
                document.doc_status = "processing_failed"
                document.processing_status = "failed"
                db.commit()
        except Exception:
            pass
        raise self.retry(exc=exc)
    finally:
        db.close()


@celery_app.task
def scan_and_process_document(document_id: str):
    """
    Combined task: scan then process if clean.
    Chains scan_document -> process_document.
    """
    from celery import chain
    workflow = chain(
        scan_document.s(document_id),
        _process_if_clean.s(document_id),
    )
    workflow.apply_async()


@celery_app.task
def _process_if_clean(scan_result: dict, document_id: str):
    """Callback: process document only if scan was clean."""
    if scan_result and scan_result.get("scan_result") == "clean":
        process_document.delay(document_id)

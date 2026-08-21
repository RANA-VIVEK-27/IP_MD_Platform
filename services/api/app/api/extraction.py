import uuid
from celery import Celery
from app.db.session import SessionLocal
from app.models.prescription_report import Document, Prescription
from app.services.extraction_service import ExtractionService

celery_app = Celery(
    "ipmd",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/1",
)


@celery_app.task
def process_prescription_document(prescription_id: str):
    """
    Celery task stub for asynchronous OCR & Medical NLP processing (M4).
    Full AI pipeline implemented in M9.
    """
    db = SessionLocal()
    try:
        presc_uuid = uuid.UUID(str(prescription_id)) if not isinstance(prescription_id, uuid.UUID) else prescription_id
        prescription = db.query(Prescription).filter(Prescription.prescription_id == presc_uuid).first()
        if not prescription:
            return {"success": False, "error": "Prescription not found"}

        ExtractionService.stub_process_prescription(db, prescription)
        db.commit()

        return {
            "success": True,
            "prescription_id": str(prescription.prescription_id),
            "status": prescription.extraction_status,
        }
    except Exception as exc:
        db.rollback()
        try:
            prescription = db.query(Prescription).filter(Prescription.prescription_id == presc_uuid).first()
            if prescription:
                prescription.extraction_status = "failed"
                db.commit()
        except Exception:
            pass
        raise
    finally:
        db.close()
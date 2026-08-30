import uuid
from decimal import Decimal
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class ExtractedFieldItem(BaseModel):
    """Single extracted field (backward compatible)."""
    field_name: str
    value: str
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    needs_review: bool = False


class MedicineItem(BaseModel):
    """Structured medicine extraction result."""
    sequence: int
    raw_name: str
    name: str
    strength: Optional[str] = None
    dosage_instruction: Optional[str] = None
    duration: Optional[str] = None
    quantity: Optional[int] = None
    ocr_confidence: float = 0.0
    parser_confidence: float = 0.0
    validation_confidence: float = 0.0
    overall_confidence: float = 0.0
    needs_review: bool = True


class PrescriptionExtractionRequest(BaseModel):
    prescription_id: str
    image_base64: Optional[str] = None
    image_url: Optional[str] = None
    filename: Optional[str] = "prescription.jpg"
    simulate_low_confidence: Optional[bool] = False


class PrescriptionExtractionResponse(BaseModel):
    prescription_id: str
    extraction_status: str  # extracted, needs_review, failed
    fields: List[ExtractedFieldItem] = []
    medicines: List[MedicineItem] = []
    metadata: Dict[str, Any] = {}
    raw_ocr_text: str = ""
    ocr_provider: str = "none"
    nlp_provider: str = "none"
    overall_confidence: float = 0.0
    needs_review: bool = True


class ReportValueItem(BaseModel):
    test_name: str
    value: str
    unit: Optional[str] = None
    reference_range: Optional[str] = None
    flag: str = "normal"  # normal or abnormal


class ReportParseRequest(BaseModel):
    report_id: str
    document_base64: Optional[str] = None
    filename: Optional[str] = "lab_report.pdf"


class ReportParseResponse(BaseModel):
    report_id: str
    extraction_status: str = "extracted"
    values: List[ReportValueItem]
    ai_explanation: Optional[str] = None
    ocr_provider: str = "none"
    nlp_provider: str = "openai_gpt4o"


class ChatCompletionRequest(BaseModel):
    session_id: str
    message_text: str
    document_type: Optional[str] = None
    context_prescription_id: Optional[str] = None
    is_first_message: bool = False
    rag_context: List[str] = []
    pharmacy_price_context: List[str] = []


class ChatCompletionResponse(BaseModel):
    session_id: str
    reply_text: str
    is_ai_generated: bool = True
    guardrail_triggered: bool = False
    llm_provider: str = "google_genai_gemini_2.5_flash"

import uuid
from decimal import Decimal
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class ExtractedFieldItem(BaseModel):
    field_name: str
    value: str
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    needs_review: bool = False


class PrescriptionExtractionRequest(BaseModel):
    prescription_id: str
    image_base64: Optional[str] = None
    image_url: Optional[str] = None
    filename: Optional[str] = "prescription.jpg"
    simulate_low_confidence: bool = False


class PrescriptionExtractionResponse(BaseModel):
    prescription_id: str
    extraction_status: str  # extracted or needs_review
    fields: List[ExtractedFieldItem]
    ocr_provider: str = "google_cloud_vision"
    nlp_provider: str = "openai_gpt4o"


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
    simulate_abnormal: bool = False


class ReportParseResponse(BaseModel):
    report_id: str
    extraction_status: str = "extracted"
    values: List[ReportValueItem]
    ai_explanation: Optional[str] = None
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

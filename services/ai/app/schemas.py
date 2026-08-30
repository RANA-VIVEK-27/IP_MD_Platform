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


from enum import Enum


class FactSource(str, Enum):
    UPLOADED_DOCUMENT = "uploaded_document"
    USER_PROVIDED = "user_provided"
    GENERAL_EDUCATION = "general_education"


class TestStatus(str, Enum):
    TEST_NOT_MENTIONED = "TEST_NOT_MENTIONED"
    TEST_ADVISED = "TEST_ADVISED"
    TEST_RESULT_AVAILABLE = "TEST_RESULT_AVAILABLE"
    TEST_RESULT_UNAVAILABLE = "TEST_RESULT_UNAVAILABLE"


class ClaimClassification(str, Enum):
    SUPPORTED_DOCUMENT_FACT = "SUPPORTED_DOCUMENT_FACT"
    DOCUMENT_GROUNDED_INTERPRETATION = "DOCUMENT_GROUNDED_INTERPRETATION"
    SUPPORTED_USER_FACT = "SUPPORTED_USER_FACT"
    GENERAL_MEDICAL_EDUCATION = "GENERAL_MEDICAL_EDUCATION"
    UNSUPPORTED_PATIENT_CLAIM = "UNSUPPORTED_PATIENT_CLAIM"


class ProvenanceItem(BaseModel):
    source: FactSource = FactSource.UPLOADED_DOCUMENT
    source_location: str = "document"
    confidence: float = Field(0.95, ge=0.0, le=1.0)


class StructuredMedicineItem(BaseModel):
    name: str
    dose: str = "Not clearly mentioned in the uploaded document."
    frequency: str = "Not clearly mentioned in the uploaded document."
    duration: str = "Not clearly mentioned in the uploaded document."
    instructions: str = "Not clearly mentioned in the uploaded document."
    provenance: ProvenanceItem = Field(default_factory=ProvenanceItem)


class StructuredAdvisedTestItem(BaseModel):
    test_name: str
    status: TestStatus = TestStatus.TEST_ADVISED
    result_value: Optional[str] = None
    unit: Optional[str] = None
    flag: Optional[str] = None
    provenance: ProvenanceItem = Field(default_factory=ProvenanceItem)


class StructuredLabTestResultItem(BaseModel):
    parameter: str
    value: str
    unit: str = ""
    reference_range: str = "Not specified"
    flag: str = "normal"  # normal, abnormal, low, high
    status: TestStatus = TestStatus.TEST_RESULT_AVAILABLE
    provenance: ProvenanceItem = Field(default_factory=ProvenanceItem)


class StructuredPrescriptionFactBundle(BaseModel):
    document_id: Optional[str] = None
    document_type: str = "prescription"
    patient_name: str = "Not clearly mentioned in the uploaded document."
    patient_age: str = "Not clearly mentioned in the uploaded document."
    patient_gender: str = "Not clearly mentioned in the uploaded document."
    doctor_name: str = "Not clearly mentioned in the uploaded document."
    doctor_qualification: str = "Not clearly mentioned in the uploaded document."
    doctor_reg_no: str = "Not clearly mentioned in the uploaded document."
    date: str = "Not clearly mentioned in the uploaded document."
    diagnosis: List[str] = []
    medicines: List[StructuredMedicineItem] = []
    tests_advised: List[StructuredAdvisedTestItem] = []
    test_results: List[StructuredLabTestResultItem] = []
    general_advice: List[str] = []
    follow_up: str = "Not clearly mentioned in the uploaded document."
    raw_ocr_text: str = ""
    overall_confidence: float = 0.95


class ChatCompletionRequest(BaseModel):
    session_id: str
    message_text: str
    document_type: Optional[str] = None
    context_prescription_id: Optional[str] = None
    is_first_message: bool = False
    rag_context: List[str] = []
    pharmacy_price_context: List[str] = []
    structured_facts: Optional[StructuredPrescriptionFactBundle] = None


class ChatCompletionResponse(BaseModel):
    session_id: str
    reply_text: str
    is_ai_generated: bool = True
    guardrail_triggered: bool = False
    llm_provider: str = "google_genai_gemini_2.5_flash"
    validation_status: str = "PASSED"
    rejected_claims_count: int = 0


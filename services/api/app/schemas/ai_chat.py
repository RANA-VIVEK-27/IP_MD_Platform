import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


# ─── Consent ───────────────────────────────────────────────────────────────────

class ConsentCreateRequest(BaseModel):
    consent_type: str = Field(default="chat_logging", description="Type of consent: chat_logging")
    consent_given: bool = Field(..., description="Must be True to start a chat session")


class ConsentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    consent_id: uuid.UUID
    user_id: uuid.UUID
    consent_type: str
    consent_given: bool
    recorded_at: datetime


# ─── Chat Session ───────────────────────────────────────────────────────────────

class ChatSessionCreateRequest(BaseModel):
    consent_given: bool = Field(..., description="Must be True to create a session — required for DPDP Act compliance")
    document_type: Optional[str] = Field(None, description="prescription | lab_report | general_report")
    context_prescription_id: Optional[uuid.UUID] = Field(None, description="Optional prescription context for grounded AI responses")
    context_document_id: Optional[uuid.UUID] = Field(None, description="Optional document context ID")
    context_report_id: Optional[uuid.UUID] = Field(None, description="Optional report context ID")


class ChatSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    session_id: uuid.UUID
    patient_id: uuid.UUID
    document_type: Optional[str] = None
    context_prescription_id: Optional[uuid.UUID] = None
    context_document_id: Optional[uuid.UUID] = None
    context_report_id: Optional[uuid.UUID] = None
    consent_record_id: Optional[uuid.UUID] = None
    created_at: datetime
    purged_at: Optional[datetime] = None


# ─── Chat Messages ─────────────────────────────────────────────────────────────

class ChatMessageRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000, description="User message text")
    document_type: Optional[str] = Field(None, description="prescription | lab_report | general_report")
    document_id: Optional[uuid.UUID] = Field(None, description="Active selected document ID")


class ChatMessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    message_id: uuid.UUID
    session_id: uuid.UUID
    sender: str = Field(..., description="user | assistant")
    text: str
    is_ai_generated: bool
    guardrail_triggered: bool
    created_at: datetime


class ChatTurnResponse(BaseModel):
    user_message: ChatMessageResponse
    assistant_message: ChatMessageResponse
    rag_sources_used: int = Field(0, description="Number of knowledge chunks used to ground this response")


class ChatHistoryResponse(BaseModel):
    session_id: uuid.UUID
    messages: List[ChatMessageResponse]
    total: int


# ─── Knowledge Embeddings (Admin) ─────────────────────────────────────────────

class KnowledgeEmbeddingCreate(BaseModel):
    source_reference: str = Field(..., description="Source citation (e.g. 'WHO Essential Medicines List 2023')")
    content_chunk: str = Field(..., min_length=10, max_length=4000, description="Text content chunk for RAG retrieval")
    embedding_vector: Optional[List[float]] = Field(None, description="1536-dim embedding vector. If omitted, a deterministic vector is generated.")
    metadata: Optional[dict] = Field(None, description="Optional metadata (author, section, date, etc.)")


class KnowledgeEmbeddingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    embedding_id: uuid.UUID
    source_reference: str
    content_chunk: str
    created_at: datetime


class KnowledgeEmbeddingListResponse(BaseModel):
    items: List[KnowledgeEmbeddingResponse]
    total: int


# ─── OCR Extraction ────────────────────────────────────────────────────────────

class ExtractedFieldResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    field_id: uuid.UUID
    field_name: str
    value: str
    confidence_score: float
    review_state: str = Field(..., description="auto_accepted | needs_review | doctor_edited")


class ExtractionResultResponse(BaseModel):
    prescription_id: uuid.UUID
    extraction_status: str
    fields: List[ExtractedFieldResponse]
    low_confidence_count: int
    message: str

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from .schemas import (
    PrescriptionExtractionRequest,
    PrescriptionExtractionResponse,
    ReportParseRequest,
    ReportParseResponse,
    ChatCompletionRequest,
    ChatCompletionResponse,
)
from .ocr_nlp_engine import OCRNLPEngine
from .chat_engine import GeminiChatEngine

app = FastAPI(
    title="IPMD AI & OCR/NLP Microservice",
    description="Microservice providing OCR extraction, Medical NLP report parsing, and Gemini RAG Chat Assistant",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["Health Check"])
async def health_check():
    return {
        "status": "ok",
        "service": "ipmd-ai-service",
        "providers": {
            "ocr": "google_cloud_vision",
            "medical_nlp": "openai_gpt4o",
            "chat_llm": "google_gemini_1.5",
            "embeddings": "gemini_text_embedding_004",
        }
    }


@app.post(
    "/api/v1/ai/extract-prescription",
    response_model=PrescriptionExtractionResponse,
    tags=["OCR & Prescription Intake"]
)
async def extract_prescription(req: PrescriptionExtractionRequest):
    """
    Executes prescription OCR via Google Cloud Vision & Entity extraction via GPT-4o.
    Calculates per-field confidence scores. Flags fields < 0.85 as needs_review.
    """
    try:
        image_bytes = None
        if req.image_base64:
            import base64
            image_bytes = base64.b64decode(req.image_base64)

        res = OCRNLPEngine.extract_prescription(
            prescription_id=req.prescription_id,
            image_bytes=image_bytes,
            image_base64=req.image_base64,
            filename=req.filename or "prescription.jpg",
            simulate_low_confidence=req.simulate_low_confidence,
        )
        return res
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"EXTRACTION_FAILED: {str(e)}"
        )


@app.post(
    "/api/v1/ai/parse-report",
    response_model=ReportParseResponse,
    tags=["Medical NLP & Diagnostic Reports"]
)
async def parse_report(req: ReportParseRequest):
    """
    Parses lab reports via GPT-4o NLP. Identifies test names, values, units, reference ranges.
    Flags abnormal metrics with plain-language diagnostic summaries.
    """
    try:
        doc_bytes = None
        if req.document_base64:
            import base64
            doc_bytes = base64.b64decode(req.document_base64)

        res = OCRNLPEngine.parse_report(
            report_id=req.report_id,
            doc_bytes=doc_bytes,
            doc_base64=req.document_base64,
            filename=req.filename or "lab_report.pdf",
            simulate_abnormal=req.simulate_abnormal,
        )
        return res
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"REPORT_PARSING_FAILED: {str(e)}"
        )


@app.post(
    "/api/v1/ai/chat-completion",
    response_model=ChatCompletionResponse,
    tags=["AI Health Chat Assistant"]
)
async def chat_completion(req: ChatCompletionRequest):
    """
    Generates health chat responses using Google Gemini 1.5.
    Appends mandatory non-diagnostic disclaimer on initial turn.
    Triggers red-flag emergency guardrails on emergency keywords.
    """
    try:
        res = GeminiChatEngine.process_chat_message(
            session_id=req.session_id,
            message_text=req.message_text,
            document_type=req.document_type,
            is_first_message=req.is_first_message,
            rag_context=req.rag_context,
            pharmacy_price_context=req.pharmacy_price_context,
            structured_facts=req.structured_facts,
        )
        return res
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"CHAT_COMPLETION_FAILED: {str(e)}"
        )

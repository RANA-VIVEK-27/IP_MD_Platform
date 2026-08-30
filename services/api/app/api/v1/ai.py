import uuid
from typing import Optional
from fastapi import APIRouter, Depends, status, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.identity import User
from app.models.ai_chat import ChatSession, ChatMessage
from app.api.deps import get_current_user, require_roles
from app.services.ai_service import AIService
from app.schemas.ai_chat import (
    ConsentCreateRequest,
    ConsentResponse,
    ChatSessionCreateRequest,
    ChatSessionResponse,
    ChatMessageRequest,
    ChatTurnResponse,
    ChatMessageResponse,
    ChatHistoryResponse,
    KnowledgeEmbeddingCreate,
    KnowledgeEmbeddingResponse,
)

router = APIRouter(prefix="/ai", tags=["AI & Health Chat (RAG)"])


@router.post(
    "/consent",
    response_model=ConsentResponse,
    status_code=status.HTTP_201_CREATED
)
def record_ai_consent(
    req: ConsentCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("patient"))
):
    """
    Records patient consent for AI health chat processing (BRD FR-10 / DPDP Act compliance).
    """
    record = AIService.record_consent(
        db=db,
        user_id=current_user.user_id,
        consent_given=req.consent_given,
        consent_type=req.consent_type
    )
    return record


@router.post(
    "/chat/sessions",
    response_model=ChatSessionResponse,
    status_code=status.HTTP_201_CREATED
)
def create_chat_session(
    req: ChatSessionCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("patient"))
):
    """
    Creates a new AI health chat session linked to document scope & context (BRD FR-11).
    """
    if not req.consent_given:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CONSENT_REQUIRED: Patient consent must be granted to initiate AI health chat."
        )

    AIService.record_consent(db, current_user.user_id, consent_given=True)

    session = AIService.create_chat_session(
        db=db,
        patient_id=current_user.user_id,
        document_type=req.document_type,
        context_prescription_id=req.context_prescription_id,
        context_document_id=req.context_document_id,
        context_report_id=req.context_report_id
    )
    return session


@router.get(
    "/documents",
    status_code=status.HTTP_200_OK
)
def get_patient_documents_for_chat(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("patient"))
):
    """
    Retrieves uploaded user documents grouped by type (Prescriptions, Lab Reports, General Reports) for AI Chat scope selection.
    """
    from app.models.prescription_report import Prescription, Report, Document
    prescriptions = db.query(Prescription).filter(Prescription.patient_id == current_user.user_id).all()
    reports = db.query(Report).filter(Report.patient_id == current_user.user_id).all()
    documents = db.query(Document).filter(Document.uploaded_by == current_user.user_id).all()

    return {
        "prescriptions": [
            {
                "id": str(p.prescription_id),
                "title": f"Prescription #{str(p.prescription_id)[:8]}",
                "status": p.extraction_status,
                "created_at": p.created_at.isoformat()
            } for p in prescriptions
        ],
        "lab_reports": [
            {
                "id": str(r.report_id),
                "title": f"Lab Report ({r.report_type or 'Diagnostic'}) #{str(r.report_id)[:8]}",
                "status": r.extraction_status,
                "created_at": r.created_at.isoformat()
            } for r in reports
        ],
        "general_reports": [
            {
                "id": str(d.document_id),
                "title": d.original_filename,
                "status": d.doc_status,
                "created_at": d.uploaded_at.isoformat()
            } for d in documents
        ]
    }


@router.post(
    "/chat/sessions/{session_id}/messages",
    response_model=ChatTurnResponse
)
def send_chat_message(
    session_id: uuid.UUID,
    req: ChatMessageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("patient"))
):
    """
    Posts patient query to AI Chat Assistant (BRD FR-11, FR-12 / TRD Item 24-25).
    Features RAG knowledge base grounding, mandatory non-diagnostic disclaimers, and red-flag emergency escalation guardrails.
    """
    user_msg, assistant_msg = AIService.send_chat_message(
        db=db,
        patient_id=current_user.user_id,
        session_id=session_id,
        message_text=req.text,
        document_type=req.document_type,
        document_id=req.document_id
    )

    return ChatTurnResponse(
        user_message=ChatMessageResponse.model_validate(user_msg),
        assistant_message=ChatMessageResponse.model_validate(assistant_msg),
        rag_sources_used=1 if not assistant_msg.guardrail_triggered else 0
    )


@router.get(
    "/chat/sessions/{session_id}/messages",
    response_model=ChatHistoryResponse
)
def get_chat_history(
    session_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves chronological chat conversation history for a session (BRD FR-11).
    """
    chat_sess = db.query(ChatSession).filter(
        ChatSession.session_id == session_id
    ).first()
    if not chat_sess:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CHAT_SESSION_NOT_FOUND"
        )
    if current_user.role == 'patient' and chat_sess.patient_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="FORBIDDEN: You do not own this chat session"
        )

    messages = db.query(ChatMessage).filter(
        ChatMessage.session_id == session_id
    ).order_by(ChatMessage.created_at.asc()).all()

    return ChatHistoryResponse(
        session_id=session_id,
        messages=[ChatMessageResponse.model_validate(m) for m in messages],
        total=len(messages)
    )


@router.post(
    "/knowledge/seed",
    status_code=status.HTTP_200_OK
)
def seed_knowledge_base(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "super_admin"))
):
    """
    Seeds medical reference knowledge base chunks into pgvector embeddings for RAG retrieval.
    """
    added_count = AIService.seed_knowledge_embeddings(db)
    return {
        "status": "success",
        "message": f"Successfully seeded {added_count} medical knowledge embeddings into pgvector DB.",
        "records_added": added_count
    }

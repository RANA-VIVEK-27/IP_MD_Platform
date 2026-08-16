from sqlalchemy import Column, String, Boolean, Text, TIMESTAMP, Enum, ForeignKey, text as sql_text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from pgvector.sqlalchemy import Vector
from app.db.base import Base

class ConsentRecord(Base):
    __tablename__ = 'consent_records'

    consent_id = Column(UUID(as_uuid=True), primary_key=True, server_default=sql_text("gen_random_uuid()"))
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.user_id'), nullable=False)
    consent_type = Column(String(50), nullable=False, server_default='chat_logging')
    consent_given = Column(Boolean, nullable=False)
    recorded_at = Column(TIMESTAMP(timezone=True), nullable=False)


class ChatSession(Base):
    __tablename__ = 'chat_sessions'

    session_id = Column(UUID(as_uuid=True), primary_key=True, server_default=sql_text("gen_random_uuid()"))
    patient_id = Column(UUID(as_uuid=True), ForeignKey('users.user_id'), nullable=False)
    context_prescription_id = Column(UUID(as_uuid=True), ForeignKey('prescriptions.prescription_id'), nullable=True)
    consent_record_id = Column(UUID(as_uuid=True), ForeignKey('consent_records.consent_id'), nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False)
    purged_at = Column(TIMESTAMP(timezone=True), nullable=True)


class ChatMessage(Base):
    __tablename__ = 'chat_messages'

    message_id = Column(UUID(as_uuid=True), primary_key=True, server_default=sql_text("gen_random_uuid()"))
    session_id = Column(UUID(as_uuid=True), ForeignKey('chat_sessions.session_id'), nullable=False)
    sender = Column(
        Enum('user', 'assistant', name='chat_message_sender'),
        nullable=False
    )
    text = Column(Text, nullable=False)
    is_ai_generated = Column(Boolean, nullable=False, server_default=sql_text("false"))
    guardrail_triggered = Column(Boolean, nullable=False, server_default=sql_text("false"))
    created_at = Column(TIMESTAMP(timezone=True), nullable=False)


class KnowledgeEmbedding(Base):
    __tablename__ = 'knowledge_embeddings'

    embedding_id = Column(UUID(as_uuid=True), primary_key=True, server_default=sql_text("gen_random_uuid()"))
    source_reference = Column(String(255), nullable=False)
    content_chunk = Column(Text, nullable=False)
    embedding = Column(Vector(1536), nullable=False)
    metadata_ = Column('metadata', JSONB, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False)

from sqlalchemy import Column, String, Integer, Text, Numeric, TIMESTAMP, Enum, ForeignKey, Index, text as sql_text
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base

class Document(Base):
    __tablename__ = 'documents'

    document_id = Column(UUID(as_uuid=True), primary_key=True, server_default=sql_text("gen_random_uuid()"))
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey('users.user_id'), nullable=False)
    storage_url = Column(String(500), nullable=False)
    file_type = Column(
        Enum('jpg', 'png', 'pdf', name='document_file_type'),
        nullable=False
    )
    file_size_bytes = Column(Integer, nullable=False)
    malware_scan_status = Column(
        Enum('pending', 'clean', 'rejected', name='malware_scan_status'),
        nullable=False,
        server_default='pending'
    )
    uploaded_at = Column(TIMESTAMP(timezone=True), nullable=False)


class Prescription(Base):
    __tablename__ = 'prescriptions'

    prescription_id = Column(UUID(as_uuid=True), primary_key=True, server_default=sql_text("gen_random_uuid()"))
    patient_id = Column(UUID(as_uuid=True), ForeignKey('users.user_id'), nullable=False)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey('users.user_id'), nullable=True)
    document_id = Column(UUID(as_uuid=True), ForeignKey('documents.document_id'), nullable=False)
    extraction_status = Column(
        Enum('queued', 'processing', 'extracted', 'needs_review', 'failed', name='prescription_extraction_status'),
        nullable=False,
        server_default='queued'
    )
    verification_status = Column(
        Enum('pending_review', 'doctor_verified', 'rejected', name='prescription_verification_status'),
        nullable=False,
        server_default='pending_review'
    )
    created_at = Column(TIMESTAMP(timezone=True), nullable=False)

    __table_args__ = (
        Index('ix_prescriptions_patient_ext_status', 'patient_id', 'extraction_status'),
        Index('ix_prescriptions_doctor_ver_status', 'doctor_id', 'verification_status'),
    )


class ExtractedField(Base):
    __tablename__ = 'extracted_fields'

    field_id = Column(UUID(as_uuid=True), primary_key=True, server_default=sql_text("gen_random_uuid()"))
    prescription_id = Column(UUID(as_uuid=True), ForeignKey('prescriptions.prescription_id'), nullable=False)
    field_name = Column(String(50), nullable=False)
    value = Column(Text, nullable=False)
    confidence_score = Column(Numeric(4, 3), nullable=False)
    review_state = Column(
        Enum('auto_accepted', 'needs_review', 'doctor_edited', name='extracted_field_review_state'),
        nullable=False
    )
    edited_by = Column(UUID(as_uuid=True), ForeignKey('users.user_id'), nullable=True)
    edited_reason = Column(Text, nullable=True)

    __table_args__ = (
        Index('ix_extracted_fields_prescription_id', 'prescription_id'),
    )


class Report(Base):
    __tablename__ = 'reports'

    report_id = Column(UUID(as_uuid=True), primary_key=True, server_default=sql_text("gen_random_uuid()"))
    patient_id = Column(UUID(as_uuid=True), ForeignKey('users.user_id'), nullable=False)
    document_id = Column(UUID(as_uuid=True), ForeignKey('documents.document_id'), nullable=False)
    report_type = Column(String(50), nullable=True)
    extraction_status = Column(
        Enum('queued', 'processing', 'extracted', 'needs_review', 'failed', name='report_extraction_status'),
        nullable=False,
        server_default='queued'
    )
    ai_explanation = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False)


class ReportValue(Base):
    __tablename__ = 'report_values'

    value_id = Column(UUID(as_uuid=True), primary_key=True, server_default=sql_text("gen_random_uuid()"))
    report_id = Column(UUID(as_uuid=True), ForeignKey('reports.report_id'), nullable=False)
    test_name = Column(String(100), nullable=False)
    value = Column(String(50), nullable=False)
    unit = Column(String(20), nullable=True)
    reference_range = Column(String(50), nullable=True)
    flag = Column(
        Enum('normal', 'abnormal', name='report_value_flag'),
        nullable=False
    )


class ReportAccessGrant(Base):
    __tablename__ = 'report_access_grants'

    grant_id = Column(UUID(as_uuid=True), primary_key=True, server_default=sql_text("gen_random_uuid()"))
    report_id = Column(UUID(as_uuid=True), ForeignKey('reports.report_id'), nullable=False)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey('users.user_id'), nullable=False)
    granted_at = Column(TIMESTAMP(timezone=True), nullable=False)


class VerificationAction(Base):
    __tablename__ = 'verification_actions'

    verification_action_id = Column(UUID(as_uuid=True), primary_key=True, server_default=sql_text("gen_random_uuid()"))
    prescription_id = Column(UUID(as_uuid=True), ForeignKey('prescriptions.prescription_id'), nullable=False)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey('users.user_id'), nullable=False)
    action = Column(
        Enum('approve', 'reject', 'field_edit', name='verification_action_type'),
        nullable=False
    )
    notes_or_reason = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False)

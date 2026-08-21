import uuid
from sqlalchemy import Column, String, Integer, Text, TIMESTAMP, ForeignKey, Index, text as sql_text
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base

class AuditLogEntry(Base):
    __tablename__ = 'audit_log_entries'

    audit_log_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=sql_text("gen_random_uuid()"))
    actor_id = Column(UUID(as_uuid=True), ForeignKey('users.user_id'), nullable=True)
    actor_role = Column(String(30), nullable=False)
    action_type = Column(String(100), nullable=False)
    target_entity_type = Column(String(50), nullable=False)
    target_entity_id = Column(UUID(as_uuid=True), nullable=False)
    justification = Column(Text, nullable=True)
    timestamp = Column(TIMESTAMP(timezone=True), nullable=False)

    __table_args__ = (
        Index('ix_audit_log_actor_action_ts', 'actor_role', 'action_type', 'timestamp'),
        Index('ix_audit_log_target_entity', 'target_entity_type', 'target_entity_id'),
    )


class ComplianceOverride(Base):
    __tablename__ = 'compliance_overrides'

    override_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=sql_text("gen_random_uuid()"))
    order_id = Column(UUID(as_uuid=True), ForeignKey('orders.order_id'), nullable=False)
    super_admin_id = Column(UUID(as_uuid=True), ForeignKey('users.user_id'), nullable=False)
    justification = Column(Text, nullable=False)
    audit_log_id = Column(UUID(as_uuid=True), ForeignKey('audit_log_entries.audit_log_id'), nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False)


class PlatformSetting(Base):
    __tablename__ = 'platform_settings'

    setting_key = Column(String(100), primary_key=True, nullable=False)
    setting_value = Column(Text, nullable=False)
    config_version = Column(Integer, nullable=False)
    updated_by = Column(UUID(as_uuid=True), ForeignKey('users.user_id'), nullable=False)
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False)

from sqlalchemy import Column, String, Boolean, Text, TIMESTAMP, Enum, ForeignKey, Index, text as sql_text
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base

class NotificationEvent(Base):
    __tablename__ = 'notification_events'

    notification_id = Column(UUID(as_uuid=True), primary_key=True, server_default=sql_text("gen_random_uuid()"))
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.user_id'), nullable=False)
    type = Column(String(50), nullable=False)
    related_entity_type = Column(String(50), nullable=True)
    related_entity_id = Column(UUID(as_uuid=True), nullable=True)
    message = Column(Text, nullable=False)
    read = Column(Boolean, nullable=False, server_default=sql_text("false"))
    created_at = Column(TIMESTAMP(timezone=True), nullable=False)

    __table_args__ = (
        Index('ix_notification_events_user_read_created', 'user_id', 'read', created_at.desc()),
    )


class DeliveryLog(Base):
    __tablename__ = 'delivery_logs'

    delivery_log_id = Column(UUID(as_uuid=True), primary_key=True, server_default=sql_text("gen_random_uuid()"))
    notification_id = Column(UUID(as_uuid=True), ForeignKey('notification_events.notification_id'), nullable=False)
    channel = Column(
        Enum('push', 'email', 'sms', name='delivery_channel'),
        nullable=False
    )
    status = Column(
        Enum('sent', 'failed', name='delivery_status'),
        nullable=False
    )
    error_detail = Column(Text, nullable=True)
    attempted_at = Column(TIMESTAMP(timezone=True), nullable=False)


class UserChannelPreference(Base):
    __tablename__ = 'user_channel_preferences'

    user_id = Column(UUID(as_uuid=True), ForeignKey('users.user_id'), primary_key=True, nullable=False)
    push_enabled = Column(Boolean, nullable=False, server_default=sql_text("true"))
    email_enabled = Column(Boolean, nullable=False, server_default=sql_text("true"))
    sms_enabled = Column(Boolean, nullable=False, server_default=sql_text("true"))
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False)

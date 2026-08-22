import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    notification_id: uuid.UUID
    user_id: uuid.UUID
    type: str = Field(..., description="order_confirmation | verification_result | dispatch | delivery | refill_reminder | abnormal_report_flag")
    related_entity_type: Optional[str] = Field(None, description="order | prescription | report")
    related_entity_id: Optional[uuid.UUID] = None
    message: str
    read: bool = Field(..., alias="read")
    is_read: bool = Field(False, description="Alias for read — used by frontend")
    created_at: datetime

    def model_post_init(self, __context) -> None:
        self.is_read = self.read


class NotificationListResponse(BaseModel):
    items: List[NotificationResponse]
    total: int
    unread_count: int
    page: int
    page_size: int


class UnreadCountResponse(BaseModel):
    unread_count: int


class NotificationPreferenceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: uuid.UUID
    push_enabled: bool
    email_enabled: bool
    sms_enabled: bool
    updated_at: datetime


class NotificationPreferenceUpdate(BaseModel):
    push_enabled: Optional[bool] = Field(None, description="Firebase push notification opt-in")
    email_enabled: Optional[bool] = Field(None, description="Transactional email opt-in")
    sms_enabled: Optional[bool] = Field(None, description="SMS opt-in")


class DeliveryLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    delivery_log_id: uuid.UUID
    notification_id: uuid.UUID
    channel: str = Field(..., description="push | email | sms")
    status: str = Field(..., description="sent | failed")
    error_detail: Optional[str] = None
    attempted_at: datetime


class NotificationTriggerRequest(BaseModel):
    user_id: uuid.UUID = Field(..., description="Target user ID")
    type: str = Field(..., description="order_confirmation | verification_result | dispatch | delivery | refill_reminder | abnormal_report_flag")
    message: str = Field(..., min_length=1, max_length=1000)
    related_entity_type: Optional[str] = Field(None, description="order | prescription | report")
    related_entity_id: Optional[uuid.UUID] = None
    channels_override: Optional[List[str]] = Field(None, description="Optional list of channels to dispatch to ['push', 'email', 'sms']")


class NotificationTriggerResponse(BaseModel):
    notification: NotificationResponse
    dispatched_channels: List[DeliveryLogResponse]

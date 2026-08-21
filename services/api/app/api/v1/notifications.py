import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.identity import User
from app.api.deps import get_current_user, require_roles
from app.services.notification_service import NotificationService
from app.schemas.notifications import (
    NotificationResponse,
    NotificationListResponse,
    UnreadCountResponse,
    NotificationPreferenceResponse,
    NotificationPreferenceUpdate,
    DeliveryLogResponse,
    NotificationTriggerRequest,
    NotificationTriggerResponse,
)

router = APIRouter(prefix="/notifications", tags=["Notifications & Preferences"])


@router.get(
    "",
    response_model=NotificationListResponse,
    summary="List Notifications"
)
def list_notifications(
    unread_only: bool = Query(False, description="Filter only unread notifications"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves a paginated list of notifications for the authenticated user.
    """
    items, total, unread_count = NotificationService.list_user_notifications(
        db=db,
        user_id=current_user.user_id,
        unread_only=unread_only,
        page=page,
        page_size=page_size,
    )
    return NotificationListResponse(
        items=[NotificationResponse.model_validate(item) for item in items],
        total=total,
        unread_count=unread_count,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/unread-count",
    response_model=UnreadCountResponse,
    summary="Get Unread Notification Count"
)
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns the total unread notification count for badge counters in web/mobile UI.
    """
    count = NotificationService.get_unread_count(
        db=db,
        user_id=current_user.user_id,
    )
    return UnreadCountResponse(unread_count=count)


@router.patch(
    "/{notification_id}/read",
    response_model=NotificationResponse,
    summary="Mark Notification as Read"
)
def mark_notification_read(
    notification_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Marks a single notification as read for the authenticated user.
    """
    notification = NotificationService.mark_as_read(
        db=db,
        user_id=current_user.user_id,
        notification_id=notification_id,
    )
    return NotificationResponse.model_validate(notification)


@router.post(
    "/read-all",
    summary="Mark All Notifications as Read"
)
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Marks all unread notifications as read for the authenticated user.
    """
    updated_count = NotificationService.mark_all_as_read(
        db=db,
        user_id=current_user.user_id,
    )
    return {"status": "ok", "marked_read_count": updated_count}


@router.get(
    "/preferences",
    response_model=NotificationPreferenceResponse,
    summary="Get User Channel Preferences"
)
def get_channel_preferences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves the user's opt-in/opt-out status for push, email, and SMS channels.
    """
    prefs = NotificationService.get_or_create_user_preferences(
        db=db,
        user_id=current_user.user_id,
    )
    return NotificationPreferenceResponse.model_validate(prefs)


@router.put(
    "/preferences",
    response_model=NotificationPreferenceResponse,
    summary="Update User Channel Preferences"
)
def update_channel_preferences(
    req: NotificationPreferenceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Updates the user's opt-in/opt-out status for push, email, and SMS channels.
    """
    prefs = NotificationService.update_user_preferences(
        db=db,
        user_id=current_user.user_id,
        req=req,
    )
    return NotificationPreferenceResponse.model_validate(prefs)


@router.get(
    "/{notification_id}/delivery-logs",
    response_model=List[DeliveryLogResponse],
    summary="Get Delivery Logs"
)
def get_delivery_logs(
    notification_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves per-channel delivery attempts and status diagnostics for a notification.
    """
    logs = NotificationService.get_delivery_logs(
        db=db,
        notification_id=notification_id,
        current_user=current_user,
    )
    return [DeliveryLogResponse.model_validate(log) for log in logs]


@router.post(
    "/trigger",
    response_model=NotificationTriggerResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Trigger Notification (Admin / System)"
)
def trigger_notification(
    req: NotificationTriggerRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "super_admin")),
):
    """
    Triggers a notification event and dispatches across channels respecting user preferences.
    """
    notification, logs = NotificationService.create_and_dispatch_notification(
        db=db,
        user_id=req.user_id,
        type=req.type,
        message=req.message,
        related_entity_type=req.related_entity_type,
        related_entity_id=req.related_entity_id,
        channels_override=req.channels_override,
    )
    return NotificationTriggerResponse(
        notification=NotificationResponse.model_validate(notification),
        dispatched_channels=[DeliveryLogResponse.model_validate(log) for log in logs],
    )

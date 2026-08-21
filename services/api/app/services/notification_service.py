import uuid
from datetime import datetime, timezone
from typing import List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from app.models.notifications import (
    NotificationEvent,
    DeliveryLog,
    UserChannelPreference,
)
from app.models.identity import User
from app.schemas.notifications import (
    NotificationPreferenceUpdate,
)


class NotificationService:

    @staticmethod
    def get_or_create_user_preferences(db: Session, user_id: uuid.UUID) -> UserChannelPreference:
        """
        Retrieves user channel preferences. If none exists, creates default (all enabled).
        """
        pref = db.query(UserChannelPreference).filter(
            UserChannelPreference.user_id == user_id
        ).first()

        if not pref:
            pref = UserChannelPreference(
                user_id=user_id,
                push_enabled=True,
                email_enabled=True,
                sms_enabled=True,
                updated_at=datetime.now(timezone.utc),
            )
            db.add(pref)
            db.flush()

        return pref

    @staticmethod
    def update_user_preferences(
        db: Session,
        user_id: uuid.UUID,
        req: NotificationPreferenceUpdate,
    ) -> UserChannelPreference:
        """
        Updates user channel preferences (opt-in / opt-out for push, email, SMS).
        """
        pref = NotificationService.get_or_create_user_preferences(db, user_id)

        if req.push_enabled is not None:
            pref.push_enabled = req.push_enabled
        if req.email_enabled is not None:
            pref.email_enabled = req.email_enabled
        if req.sms_enabled is not None:
            pref.sms_enabled = req.sms_enabled

        pref.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(pref)
        return pref

    @staticmethod
    def create_and_dispatch_notification(
        db: Session,
        user_id: uuid.UUID,
        type: str,
        message: str,
        related_entity_type: Optional[str] = None,
        related_entity_id: Optional[uuid.UUID] = None,
        channels_override: Optional[List[str]] = None,
    ) -> Tuple[NotificationEvent, List[DeliveryLog]]:
        """
        Creates a notification event and dispatches across channels respecting user preferences (M8 / TRD Item 23).
        Failed sends never block the underlying transaction or notification creation.
        """
        # Verify user exists
        user = db.query(User).filter(User.user_id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="USER_NOT_FOUND"
            )

        # 1. Lookup Channel Preferences first
        prefs = NotificationService.get_or_create_user_preferences(db, user_id)

        # 2. Create Notification Event
        now = datetime.now(timezone.utc)
        notif_id = uuid.uuid4()
        notification = NotificationEvent(
            notification_id=notif_id,
            user_id=user_id,
            type=type,
            related_entity_type=related_entity_type,
            related_entity_id=related_entity_id,
            message=message,
            read=False,
            created_at=now,
        )
        db.add(notification)

        target_channels = []
        if channels_override:
            for ch in channels_override:
                ch_lower = ch.lower()
                if ch_lower == "push" and prefs.push_enabled:
                    target_channels.append("push")
                elif ch_lower == "email" and prefs.email_enabled:
                    target_channels.append("email")
                elif ch_lower == "sms" and prefs.sms_enabled:
                    target_channels.append("sms")
        else:
            if prefs.push_enabled:
                target_channels.append("push")
            if prefs.email_enabled:
                target_channels.append("email")
            if prefs.sms_enabled:
                target_channels.append("sms")

        delivery_logs: List[DeliveryLog] = []

        # 3. Fan-out dispatch and record delivery logs
        for channel in target_channels:
            try:
                # Simulated dispatch (In production wired to Firebase/SendGrid/Twilio/DLT)
                delivery_status = "sent"
                error_detail = None

                log = DeliveryLog(
                    delivery_log_id=uuid.uuid4(),
                    notification_id=notif_id,
                    channel=channel,
                    status=delivery_status,
                    error_detail=error_detail,
                    attempted_at=datetime.now(timezone.utc),
                )
                db.add(log)
                delivery_logs.append(log)
            except Exception as e:
                log = DeliveryLog(
                    delivery_log_id=uuid.uuid4(),
                    notification_id=notif_id,
                    channel=channel,
                    status="failed",
                    error_detail=str(e),
                    attempted_at=datetime.now(timezone.utc),
                )
                db.add(log)
                delivery_logs.append(log)

        db.commit()
        db.refresh(notification)
        for log in delivery_logs:
            db.refresh(log)

        return notification, delivery_logs


    @staticmethod
    def list_user_notifications(
        db: Session,
        user_id: uuid.UUID,
        unread_only: bool = False,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[NotificationEvent], int, int]:
        """
        Lists user's notifications with pagination and unread counts.
        """
        query = db.query(NotificationEvent).filter(NotificationEvent.user_id == user_id)

        if unread_only:
            query = query.filter(NotificationEvent.read == False)

        total = query.count()
        unread_count = db.query(func.count(NotificationEvent.notification_id)).filter(
            NotificationEvent.user_id == user_id,
            NotificationEvent.read == False
        ).scalar() or 0

        items = (
            query.order_by(desc(NotificationEvent.created_at))
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )

        return items, total, unread_count

    @staticmethod
    def get_unread_count(db: Session, user_id: uuid.UUID) -> int:
        """
        Returns number of unread notifications for badge display.
        """
        return db.query(func.count(NotificationEvent.notification_id)).filter(
            NotificationEvent.user_id == user_id,
            NotificationEvent.read == False
        ).scalar() or 0

    @staticmethod
    def mark_as_read(db: Session, user_id: uuid.UUID, notification_id: uuid.UUID) -> NotificationEvent:
        """
        Marks a specific notification as read.
        """
        notification = db.query(NotificationEvent).filter(
            NotificationEvent.notification_id == notification_id,
            NotificationEvent.user_id == user_id,
        ).first()

        if not notification:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="NOTIFICATION_NOT_FOUND"
            )

        notification.read = True
        db.commit()
        db.refresh(notification)
        return notification

    @staticmethod
    def mark_all_as_read(db: Session, user_id: uuid.UUID) -> int:
        """
        Marks all notifications as read for the user.
        """
        count = db.query(NotificationEvent).filter(
            NotificationEvent.user_id == user_id,
            NotificationEvent.read == False,
        ).update({"read": True})

        db.commit()
        return count

    @staticmethod
    def get_delivery_logs(
        db: Session,
        notification_id: uuid.UUID,
        current_user: User,
    ) -> List[DeliveryLog]:
        """
        Returns delivery logs for a given notification.
        """
        notification = db.query(NotificationEvent).filter(
            NotificationEvent.notification_id == notification_id
        ).first()

        if not notification:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="NOTIFICATION_NOT_FOUND"
            )

        if notification.user_id != current_user.user_id and current_user.role not in ['admin', 'super_admin']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="FORBIDDEN: You do not own this notification"
            )

        return db.query(DeliveryLog).filter(
            DeliveryLog.notification_id == notification_id
        ).order_by(DeliveryLog.attempted_at.asc()).all()

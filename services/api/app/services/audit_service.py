"""
Audit Service — append-only audit logging for all admin actions.

Every admin action (suspend, reinstate, verify, override, settings change, etc.)
must produce an audit_log_entries row. This service is the single entry point for
creating those rows, enforcing append-only semantics (INSERT only, never UPDATE/DELETE).

Ref: BRD FR-29, TRD Section 7.4, API Collection §3.10 (GET /super-admin/audit-logs)
"""

import uuid
from datetime import datetime, timezone
from typing import Optional, List

from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.audit import AuditLogEntry


class AuditService:
    """Append-only audit log service used by all three admin tiers."""

    @staticmethod
    def log_action(
        db: Session,
        *,
        actor_id: uuid.UUID,
        actor_role: str,
        action_type: str,
        target_entity_type: str,
        target_entity_id: uuid.UUID,
        justification: Optional[str] = None,
    ) -> AuditLogEntry:
        """
        Creates an immutable audit log entry.

        Args:
            db: Database session.
            actor_id: UUID of the user performing the action.
            actor_role: Role of the actor (e.g., 'user_admin', 'admin', 'super_admin').
            action_type: What was done (e.g., 'SUSPEND_ACCOUNT', 'VERIFY_LICENSE').
            target_entity_type: Type of entity acted upon (e.g., 'user', 'order', 'setting').
            target_entity_id: UUID of the target entity.
            justification: Optional reason/justification text (mandatory for some actions).

        Returns:
            The created AuditLogEntry with its audit_log_id.
        """
        entry = AuditLogEntry(
            audit_log_id=uuid.uuid4(),
            actor_id=actor_id,
            actor_role=actor_role,
            action_type=action_type,
            target_entity_type=target_entity_type,
            target_entity_id=target_entity_id,
            justification=justification,
            timestamp=datetime.now(timezone.utc),
        )
        db.add(entry)
        db.flush()  # flush to populate audit_log_id before returning
        return entry

    @staticmethod
    def query_audit_logs(
        db: Session,
        *,
        actor_id: Optional[uuid.UUID] = None,
        actor_role: Optional[str] = None,
        action_type: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        limit: int = 50,
        cursor: Optional[str] = None,
    ) -> tuple[List[AuditLogEntry], Optional[str]]:
        """
        Queries the append-only audit log with optional filters and cursor-based pagination.
        Used by Super Admin audit log query (BRD FR-29) and doctor audit log (BRD FR-11).

        Returns:
            Tuple of (list of entries, next_cursor or None).
        """
        query = db.query(AuditLogEntry)

        if actor_id:
            query = query.filter(AuditLogEntry.actor_id == actor_id)
        if actor_role:
            query = query.filter(AuditLogEntry.actor_role == actor_role)
        if action_type:
            query = query.filter(AuditLogEntry.action_type == action_type)
        if date_from:
            query = query.filter(AuditLogEntry.timestamp >= date_from)
        if date_to:
            query = query.filter(AuditLogEntry.timestamp <= date_to)

        # Cursor-based pagination: cursor is the audit_log_id of the last item
        if cursor:
            try:
                cursor_uuid = uuid.UUID(cursor)
                cursor_entry = db.query(AuditLogEntry).filter(
                    AuditLogEntry.audit_log_id == cursor_uuid
                ).first()
                if cursor_entry:
                    query = query.filter(
                        AuditLogEntry.timestamp < cursor_entry.timestamp
                    )
            except (ValueError, TypeError):
                pass  # Invalid cursor, ignore

        query = query.order_by(desc(AuditLogEntry.timestamp))
        entries = query.limit(limit + 1).all()

        next_cursor = None
        if len(entries) > limit:
            entries = entries[:limit]
            next_cursor = str(entries[-1].audit_log_id)

        return entries, next_cursor

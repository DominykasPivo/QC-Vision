from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import desc
from sqlalchemy.orm import Session

from .models import AuditLog

logger = logging.getLogger("backend_audit_service")


def log_audit_event(
    db: Session,
    audit_log_create: Any,
) -> None:
    """
    Log an audit event from middleware.

    Extracts basic fields from AuditLogCreate and logs them.
    Designed to never break the request flow if logging fails.
    """
    try:
        log_action(
            db,
            action=audit_log_create.action,
            entity_type=audit_log_create.entity_type,
            entity_id=audit_log_create.entity_id,
            username=audit_log_create.actor_user_id or "system",
            meta={
                "method": getattr(audit_log_create, "method", None),
                "path": getattr(audit_log_create, "path", None),
                "status_code": getattr(audit_log_create, "status_code", None),
                "ip_address": getattr(audit_log_create, "ip_address", None),
                "user_agent": getattr(audit_log_create, "user_agent", None),
            },
        )
    except Exception:
        logger.exception("Failed to log audit event")


def log_action(
    db: Session,
    *,
    action: str,
    entity_type: str,
    entity_id: int,
    username: str,
    meta: Optional[Dict[str, Any]] = None,
) -> None:
    """
    Write an audit log entry.

    Designed to NEVER break the main request flow if logging fails.
    """
    try:
        entry = AuditLog(
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            username=username,
            meta=meta or {},
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)
    except Exception:
        db.rollback()
        logger.exception("Failed to write audit log entry")


def get_log_by_id(db: Session, log_id: int) -> Optional[AuditLog]:
    return db.query(AuditLog).filter(AuditLog.id == log_id).first()


def list_logs(
    db: Session,
    *,
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[int] = None,
    username: Optional[str] = None,
    created_from: Optional[datetime] = None,
    created_to: Optional[datetime] = None,
    limit: int = 50,
    offset: int = 0,
) -> Tuple[List[AuditLog], int]:
    """
    Returns (items, total_count) with filters.
    """
    q = db.query(AuditLog)

    if action:
        q = q.filter(AuditLog.action == action)
    if entity_type:
        q = q.filter(AuditLog.entity_type == entity_type)
    if entity_id is not None:
        q = q.filter(AuditLog.entity_id == entity_id)
    if username:
        q = q.filter(AuditLog.username == username)
    if created_from:
        q = q.filter(AuditLog.created_at >= created_from)
    if created_to:
        q = q.filter(AuditLog.created_at <= created_to)

    total = q.count()

    items = q.order_by(desc(AuditLog.created_at)).offset(offset).limit(limit).all()

    return items, total

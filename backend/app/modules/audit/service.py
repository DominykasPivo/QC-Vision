from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import desc, or_
from sqlalchemy.orm import Session

from .models import AuditLog

logger = logging.getLogger("backend_audit_service")

USER_ACTION_WHITELIST = {
    "CREATE",
    "UPDATE",
    "DELETE",
    "UPLOAD",
    "STATUS_CHANGE",
    "ASSIGN",
    "UNASSIGN",
    "ADD_PHOTO",
    "REMOVE_PHOTO",
    "ADD_DEFECT",
    "REMOVE_DEFECT",
}

# Actions to exclude as "system noise"
# In your middleware, GETs map to READ; keeping this here makes it consistent everywhere.
EXCLUDED_ACTIONS = {"READ"}


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


def list_test_activity_history(
    db: Session,
    *,
    test_id: int,
    user_actions_only: bool = True,
    limit: int = 200,
    offset: int = 0,
) -> Tuple[List[AuditLog], int]:
    """
    Returns (items, total_count) for a specific Test's activity history.

    Includes:
      - Logs directly on the Test (entity_type="Test", entity_id=test_id)
      - Logs on related entities (e.g., Photo/Defect) that stored test_id in meta["test_id"]

    NOTE: The meta["test_id"] JSON query works best on PostgreSQL.
    """
    q = db.query(AuditLog)

    # Direct logs on the Test entity
    direct = (AuditLog.entity_type == "Test") & (AuditLog.entity_id == test_id)

    # Related logs where test_id is stored in JSON meta (e.g., uploads/photos/defects tied to a test)
    related = AuditLog.meta["test_id"].as_integer() == test_id

    q = q.filter(or_(direct, related))

    if user_actions_only:
        q = q.filter(AuditLog.action.in_(USER_ACTION_WHITELIST))
        q = q.filter(~AuditLog.action.in_(EXCLUDED_ACTIONS))

    total = q.count()
    items = q.order_by(desc(AuditLog.created_at)).offset(offset).limit(limit).all()
    return items, total

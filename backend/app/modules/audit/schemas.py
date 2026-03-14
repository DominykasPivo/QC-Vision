from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class AuditLogCreate(BaseModel):
    """Schema for creating an audit log entry."""

    action: str
    entity_type: str
    entity_id: int
    test_id: Optional[int] = None
    attribute: Optional[str] = None
    old_value: Any = None
    new_value: Any = None
    username: str = "system"
    meta: Dict[str, Any] = Field(default_factory=dict)
    actor_user_id: Optional[str] = None
    success: Optional[bool] = None
    status_code: Optional[int] = None
    method: Optional[str] = None
    path: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    message: Optional[str] = None
    after_data: Optional[Dict[str, Any]] = None
    error_data: Optional[Dict[str, Any]] = None


class AuditLogOut(BaseModel):
    id: int
    action: str
    entity_type: str
    entity_id: int
    test_id: Optional[int] = None
    attribute: Optional[str] = None
    old_value: Any = None
    new_value: Any = None
    meta: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime
    username: str

    model_config = ConfigDict(from_attributes=True)


class AuditLogListOut(BaseModel):
    items: List[AuditLogOut]
    total: int
    limit: int
    offset: int

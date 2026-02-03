from datetime import datetime
from typing import Any, Dict, Optional, List
from pydantic import BaseModel, Field


class AuditLogOut(BaseModel):
    id: int
    action: str
    entity_type: str
    entity_id: int
    meta: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    username: str

    class Config:
        from_attributes = True
       


class AuditLogListOut(BaseModel):
    items: List[AuditLogOut]
    total: int
    limit: int
    offset: int

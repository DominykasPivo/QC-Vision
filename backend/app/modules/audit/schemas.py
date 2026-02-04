from datetime import datetime
from typing import Any, Dict, Optional, List
from pydantic import BaseModel, Field, ConfigDict


class AuditLogOut(BaseModel):
    id: int
    action: str
    entity_type: str
    entity_id: int
    meta: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    username: str

    model_config = ConfigDict(from_attributes=True)
       


class AuditLogListOut(BaseModel):
    items: List[AuditLogOut]
    total: int
    limit: int
    offset: int

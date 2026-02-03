from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class CategoryResponse(BaseModel):
    id: int
    name: str
    is_active: bool

    class Config:
        from_attributes = True


class AnnotationCreate(BaseModel):
    category_id: int
    geometry: Dict[str, Any]


class AnnotationResponse(BaseModel):
    id: int
    defect_id: int
    category_id: int
    geometry: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True


class DefectCreate(BaseModel):
    category_id: int
    description: Optional[str] = None
    severity: str = Field(default='low')
    annotations: List[AnnotationCreate] = Field(default_factory=list)


class DefectUpdate(BaseModel):
    category_id: Optional[int] = None
    description: Optional[str] = None
    severity: Optional[str] = None


class DefectResponse(BaseModel):
    id: int
    photo_id: int
    description: Optional[str]
    severity: str
    created_at: datetime
    annotations: List[AnnotationResponse] = []

    class Config:
        from_attributes = True

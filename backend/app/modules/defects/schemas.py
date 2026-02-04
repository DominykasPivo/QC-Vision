from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class CategoryResponse(BaseModel):
    """Defect category response schema."""
    id: int
    name: str
    is_active: bool

    class Config:
        from_attributes = True


class AnnotationCreate(BaseModel):
    """Schema for creating a defect annotation with geometric data."""
    category_id: int
    geometry: Dict[str, Any]


class AnnotationResponse(BaseModel):
    """Defect annotation response schema with geometric marking data."""
    id: int
    defect_id: int
    category_id: int
    geometry: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True


class DefectCreate(BaseModel):
    """Schema for creating a new defect."""
    category_id: int
    description: Optional[str] = None
    severity: str = Field(default='low')
    annotations: List[AnnotationCreate] = Field(default_factory=list)


class DefectUpdate(BaseModel):
    """Schema for updating an existing defect."""
    category_id: Optional[int] = None
    description: Optional[str] = None
    severity: Optional[str] = None


class DefectResponse(BaseModel):
    """Defect response schema with all annotations."""
    id: int
    photo_id: int
    description: Optional[str]
    severity: str
    created_at: datetime
    annotations: List[AnnotationResponse] = []

    class Config:
        from_attributes = True

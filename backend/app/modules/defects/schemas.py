from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime


class CategoryResponse(BaseModel):
    """Defect category response schema."""
    id: int
    name: str
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class AnnotationCreate(BaseModel):
    """Schema for creating a defect annotation with geometric data."""
    category_id: int
    geometry: Dict[str, Any]
    color: Optional[str] = None


class AnnotationUpdate(BaseModel):
    """Schema for updating a defect annotation."""
    category_id: Optional[int] = None
    geometry: Optional[Dict[str, Any]] = None
    color: Optional[str] = None


class AnnotationResponse(BaseModel):
    """Defect annotation response schema with geometric marking data."""
    id: int
    defect_id: int
    category_id: int
    geometry: Dict[str, Any]
    color: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


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
    color: Optional[str] = None
    annotations: Optional[List[AnnotationCreate]] = None


class DefectResponse(BaseModel):
    """Defect response schema with all annotations."""
    id: int
    photo_id: int
    description: Optional[str]
    severity: str
    created_at: datetime
    annotations: List[AnnotationResponse] = []

    model_config = ConfigDict(from_attributes=True)

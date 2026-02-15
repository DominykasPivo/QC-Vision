"""Photo request/response schemas."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class PhotoCreate(BaseModel):
    """Schema for photo upload metadata."""

    test_id: int = Field(..., description="Quality test ID this photo belongs to")
    file_name: str = Field(..., description="Original filename")


class PhotoResponse(BaseModel):
    """Schema for photo retrieval."""

    id: int
    test_id: int
    file_path: str
    time_stamp: datetime
    analysis_results: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class PhotoListResponse(BaseModel):
    """Schema for paginated photo listing."""

    total: int
    photos: list[PhotoResponse]


class PhotoUrlResponse(BaseModel):
    """Schema for presigned URL response (MinIO direct access)."""

    url: str
    expires_in: int


class PhotoUploadResponse(BaseModel):
    """Extended response after photo upload with access URL."""

    photo: PhotoResponse
    url: str

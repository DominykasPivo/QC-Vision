"""Photo request/response schemas."""

from datetime import datetime
from typing import List, Optional

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


class GalleryPhotoResponse(BaseModel):
    """Schema for a single gallery photo with aggregated defect info."""

    id: int
    test_id: int
    file_path: str
    time_stamp: datetime
    test_type: str
    test_status: str
    defect_count: int
    highest_severity: Optional[str] = None
    category_ids: List[int] = []

    model_config = ConfigDict(from_attributes=True)


class GalleryResponse(BaseModel):
    """Paginated gallery response."""

    items: List[GalleryPhotoResponse]
    total: int
    page: int
    page_size: int

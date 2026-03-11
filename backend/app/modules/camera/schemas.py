"""
Camera request/response schemas
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class CameraCapabilities(BaseModel):
    """Camera hardware capabilities"""

    zoom: bool = Field(default=False, description="Supports zoom control")
    focus: bool = Field(default=False, description="Supports manual focus")
    flash: bool = Field(default=False, description="Has flash/light")
    resolution: List[str] = Field(
        default_factory=lambda: ["1920x1080"], description="Supported resolutions"
    )


class CameraDeviceCreate(BaseModel):
    """Schema for registering a new camera device"""

    name: str = Field(..., min_length=1, max_length=255, description="Camera name")
    type: str = Field(
        ...,
        pattern="^(browser|droidcam|wifi|rtsp|onvif)$",
        description="Camera type",
    )
    capabilities: Optional[CameraCapabilities] = Field(
        None, description="Camera capabilities"
    )
    connection_info: Optional[Dict[str, Any]] = Field(
        None, description="Connection details (IP, port, credentials)"
    )


class CameraDeviceResponse(BaseModel):
    """Schema for camera device retrieval"""

    id: int
    name: str
    type: str
    status: str
    capabilities: Optional[str] = None
    connection_info: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    last_seen: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class CameraListResponse(BaseModel):
    """Schema for paginated camera listing"""

    cameras: List[CameraDeviceResponse]
    total: int


class CameraStatusUpdate(BaseModel):
    """Schema for updating camera status"""

    status: str = Field(..., pattern="^(online|offline|error)$")


class CaptureRequest(BaseModel):
    """Schema for photo capture request"""

    test_id: int = Field(..., description="Quality test ID")
    camera_id: Optional[int] = Field(None, description="Specific camera to use")
    settings: Optional[Dict[str, Any]] = Field(
        None, description="Capture settings (zoom, focus, etc.)"
    )


class CaptureResponse(BaseModel):
    """Schema for capture result"""

    photo_id: int
    camera_id: Optional[int] = None
    captured_at: datetime
    file_path: str

    model_config = ConfigDict(from_attributes=True)

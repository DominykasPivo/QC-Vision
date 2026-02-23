from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class TestCreate(BaseModel):
    """Schema for creating a new quality test."""

    gyra_id: str = Field(..., description="Gyra ID for the test")
    product_name: str = Field(..., description="Product name for the test")
    test_type: str = Field(..., description="Type of the test")
    requester: str = Field(..., description="Requester of the test")
    assigned_to: Optional[str] = Field(None, description="Person assigned to the test")
    description: Optional[str] = Field(None, description="Description of the test")
    status: Optional[str] = Field("pending", description="Status of the test")
    deadline_at: Optional[datetime] = Field(None, description="Deadline for the test")


class TestResponse(BaseModel):
    """Schema for test retrieval."""

    id: int
    gyra_id: str
    product_name: str
    test_type: str
    requester: str
    assigned_to: Optional[str] = None
    description: Optional[str] = None
    status: str
    deadline_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TestListResponse(BaseModel):
    """Paginated response for test listing."""

    items: List[TestResponse]
    total: int
    limit: int
    offset: int

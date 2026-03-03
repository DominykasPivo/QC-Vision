from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class ColorCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    hex_value: str = Field(..., pattern=r"^#[0-9A-Fa-f]{6}$")


class ColorResponse(BaseModel):
    id: int
    name: str
    hex_value: str
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class TestCreate(BaseModel):
    """Schema for creating a new quality test."""

    jira_id: str = Field(..., description="Jira ID for the test")
    product_name: str = Field(..., description="Product name for the test")
    test_type: str = Field(..., description="Type of the test")
    requester: str = Field(..., description="Requester of the test")
    assigned_to: Optional[str] = Field(None, description="Person assigned to the test")
    description: Optional[str] = Field(None, description="Description of the test")
    color_ids: List[int] = Field(
        default_factory=list, description="IDs of the product colors"
    )
    status: Optional[str] = Field("pending", description="Status of the test")
    deadline_at: Optional[datetime] = Field(None, description="Deadline for the test")


class TestResponse(BaseModel):
    """Schema for test retrieval."""

    id: int
    jira_id: str
    product_name: str
    test_type: str
    requester: str
    assigned_to: Optional[str] = None
    description: Optional[str] = None
    colors: List[ColorResponse] = Field(default_factory=list)
    status: str
    deadline_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    review_status: str
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    review_comment: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class TestListResponse(BaseModel):
    """Paginated response for test listing."""

    items: List[TestResponse]
    total: int
    limit: int
    offset: int


class TestReviewRequest(BaseModel):
    decision: Literal["approved", "rejected"]
    comment: Optional[str] = None

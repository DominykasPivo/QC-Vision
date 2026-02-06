from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional


class TestCreate(BaseModel):
    """Schema for creating a new quality test."""
    product_id: int = Field(..., description="Product ID for the test")
    test_type: str = Field(..., description="Type of the test")
    requester: str = Field(..., description="Requester of the test")
    assigned_to: Optional[str] = Field(None, description="Person assigned to the test")
    status: Optional[str] = Field("pending", description="Status of the test")
    deadline_at: Optional[datetime] = Field(None, description="Deadline for the test")

class TestResponse(BaseModel):
    """Schema for test retrieval."""
    id: int
    product_id: int
    test_type: str
    requester: str
    assigned_to: Optional[str] = None
    status: str
    deadline_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
    



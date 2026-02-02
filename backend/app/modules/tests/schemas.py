from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional


class TestCreate(BaseModel):
    """Schema for test creation"""
    productId: int = Field(..., description="Product ID for the test")
    testType: str = Field(..., description="Type of the test")
    requester: str = Field(..., description="Requester of the test")
    assignedTo: Optional[str] = Field(None, description="Person assigned to the test")
    status: Optional[str] = Field("pending", description="Status of the test")
    deadlineAt: Optional[datetime] = Field(None, description="Deadline for the test")

class TestResponse(BaseModel):
    """Schema for test retrieval"""
    id: int
    productId: int = Field(alias="product_id")
    testType: str = Field(alias="test_type")
    requester: str
    assignedTo: Optional[str] = Field(None, alias="assigned_to")
    status: str
    deadlineAt: Optional[datetime] = Field(None, alias="deadline_at")
    createdAt: datetime = Field(alias="created_at")
    updatedAt: datetime = Field(alias="updated_at")
    
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    



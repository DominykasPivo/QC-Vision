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
    productId: int
    testType: str
    requester: str
    assignedTo: Optional[str] = None
    status: str
    deadlineAt: Optional[datetime] = None
    createdAt: datetime
    updatedAt: datetime
    
    model_config = ConfigDict(from_attributes=True)
    



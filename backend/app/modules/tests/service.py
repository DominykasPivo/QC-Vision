import sys
import logging
import os
from typing import List, Optional
from datetime import datetime
import httpx

from .schemas import TestCreate, TestResponse
from sqlalchemy.orm import Session  
from .models import Tests

""""
1. User fills form in CreateTest.tsx
2. Frontend makes HTTP POST to → http://backend:8000/api/v1/tests
3. Backend (FastAPI) receives request


https://community.nocodb.com/t/docker-compose-postgres-nocodb/1697/4
"""
logger = logging.getLogger("backend_tests_service")


class TestsService:
    """Service for managing tests"""
    
    async def create_test(self, db: Session, test_data: TestCreate) -> TestResponse:
        test = Tests(
            product_id=test_data.productId,
            test_type=test_data.testType,
            requester=test_data.requester,
            assigned_to=test_data.assignedTo,
            status=test_data.status,
            deadline_at=test_data.deadlineAt,
        )
        db.add(test)
        db.commit()
        db.refresh(test)
        return test
    
    async def get_test(self, db: Session, test_id: int) -> Optional[Tests]:
        """Get a test by ID"""
        return db.query(Tests).filter(Tests.id == test_id).first()
    
    async def get_all_tests(self, db: Session, skip: int = 0, limit: int = 100) -> List[Tests]:
        """Get all tests with pagination"""
        return db.query(Tests).offset(skip).limit(limit).all()
    
    async def update_test(self, db: Session, test_id: int, test_data: dict) -> Tests:
        """Update a test"""
        test = db.query(Tests).filter(Tests.id == test_id).first()
        if not test:
            raise ValueError("Test not found")
        
        for key, value in test_data.items():
            if hasattr(test, key):
                setattr(test, key, value)
        
        db.commit()
        db.refresh(test)
        return test
    
    async def delete_test(self, db: Session, test_id: int):
        """Delete a test"""
        test = db.query(Tests).filter(Tests.id == test_id).first()
        if not test:
            raise ValueError("Test not found")
        
        db.delete(test)
        db.commit()


tests_service = TestsService()
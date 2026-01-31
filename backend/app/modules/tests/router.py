from fastapi import APIRouter, HTTPException, Depends, status
from typing import List
import logging

from .schemas import TestCreate, TestResponse
from .service import tests_service
from sqlalchemy.orm import Session
from app.database import get_db

logger = logging.getLogger("backend_tests_router")

router = APIRouter(prefix="", tags=["tests"])


@router.post("/", response_model=TestResponse, status_code=status.HTTP_201_CREATED)
async def create_test(test: TestCreate, db: Session = Depends(get_db)):
    """Create a new test"""
    try:
        result = await tests_service.create_test(db, test)
        logger.info(f"Created test: {result}")
        return result
    except Exception as e:
        logger.error(f"Error creating test: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{test_id}", response_model=TestResponse)
async def get_test(test_id: int, db: Session = Depends(get_db)):
    """Get a specific test by ID"""
    test = await tests_service.get_test(db, test_id)
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    return test


@router.get("/", response_model=List[TestResponse])
async def list_tests(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """List all tests with pagination"""
    return await tests_service.get_all_tests(db, skip=skip, limit=limit)


@router.patch("/{test_id}", response_model=TestResponse)
async def update_test(test_id: int, test_data: dict, db: Session = Depends(get_db)):
    """Update a test"""
    try:
        return await tests_service.update_test(db, test_id, test_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{test_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_test(test_id: int, db: Session = Depends(get_db)):
    """Delete a test"""
    try:
        await tests_service.delete_test(db, test_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

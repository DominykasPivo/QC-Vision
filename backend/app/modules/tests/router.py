from fastapi import APIRouter, HTTPException, Depends, status, UploadFile, File, Form
from typing import List
import logging
import json

from .schemas import TestCreate, TestResponse
from .service import tests_service
from sqlalchemy.orm import Session
from app.database import get_db
from app.modules.photos.service import photo_service
from app.modules.photos.schemas import PhotoResponse

logger = logging.getLogger("backend_tests_router")

router = APIRouter(prefix="", tags=["tests"])


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_test(
    productId: int = Form(...),
    testType: str = Form(...),
    requester: str = Form(...),
    assignedTo: str = Form(None),
    status_field: str = Form("pending", alias="status"),
    deadlineAt: str = Form(None),
    photos: List[UploadFile] = File(default=[]),
    db: Session = Depends(get_db)
):
    try:
        # 1. Parse deadline if provided
        from datetime import datetime
        deadline = None
        if deadlineAt:
            try:
                deadline = datetime.fromisoformat(deadlineAt.replace('Z', '+00:00'))
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid deadline format. Use ISO 8601 format.")
        
        # 2. Create test data
        test_data = TestCreate(
            productId=productId,
            testType=testType,
            requester=requester,
            assignedTo=assignedTo,
            status=status_field,
            deadlineAt=deadline
        )
        
        # 3. Create test FIRST
        test = await tests_service.create_test(db, test_data)
        logger.info(f"Created test with ID: {test.id}")
        
        # 4. Upload photos with the test_id (if any provided)
        uploaded_photos = []
        failed_photos = []
        
        if photos:
            for photo_file in photos:
                try:
                    # Validate content type
                    if not photo_file.content_type or not photo_file.content_type.startswith('image/'):
                        failed_photos.append({"filename": photo_file.filename, "error": "Not an image file"})
                        continue
                    
                    # Upload photo
                    photo = await photo_service.upload_photo(
                        db=db,
                        file=photo_file.file,
                        filename=photo_file.filename,
                        test_id=test.id
                    )
                    uploaded_photos.append(PhotoResponse.model_validate(photo))
                    logger.info(f"Uploaded photo {photo_file.filename} for test {test.id}")
                    
                except Exception as photo_error:
                    logger.error(f"Failed to upload {photo_file.filename}: {str(photo_error)}")
                    failed_photos.append({"filename": photo_file.filename, "error": str(photo_error)})
        
        # 5. Return response
        return {
            "test": TestResponse.model_validate(test),
            "photos": uploaded_photos,
            "failed_photos": failed_photos,
            "message": f"Test created successfully" + (f" with {len(uploaded_photos)} photo(s)" if photos else "") + (f". {len(failed_photos)} failed" if failed_photos else "")
        }
        
    except HTTPException:
        raise
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
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{test_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_test(test_id: int, db: Session = Depends(get_db)):
    """Delete a test"""
    try:
        await tests_service.delete_test(db, test_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

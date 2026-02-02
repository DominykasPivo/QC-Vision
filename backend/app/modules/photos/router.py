from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import logging
import traceback

from .service import photo_service
from .schemas import PhotoResponse, PhotoUrlResponse
from app.database import get_db
from .models import Photo
from .storage import photo_storage

logger = logging.getLogger("backend_photos_router")


"""
https://medium.com/@mlopsengineer/routers-in-fastapi-tutorial-2-adf3e505fdca
"""

router = APIRouter(prefix="", tags=["photos"])

@router.get("/test/{test_id}", response_model=List[PhotoResponse])
async def get_photos_for_test(test_id: int, db: Session = Depends(get_db)):
    """
    Get all photos for a specific test.
    
    - **test_id**: Quality test ID
    """
    photos = db.query(Photo).filter(Photo.test_id == test_id).all()
    return photos


@router.get("/{photo_id}/url", response_model=PhotoUrlResponse)
async def get_photo_url(photo_id: int, db: Session = Depends(get_db)):
    """
    Get a presigned URL for a photo.
    
    - **photo_id**: Photo ID
    """
    photo = db.query(Photo).filter(Photo.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    url = photo_storage.generate_presigned_url(photo.file_path, expiration=3600)
    return PhotoUrlResponse(url=url, expires_in=3600)


@router.post("/upload", response_model=PhotoResponse, status_code=201)
async def upload_photo(
    test_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload a photo for a quality test.
    
    - **test_id**: Quality test ID this photo belongs to
    - **file**: Image file (JPEG, PNG, WEBP)
    """
    # 1. Validate content type
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    try:
        # 2. Call service with correct parameter order
        photo = await photo_service.upload_photo(
            db=db,
            file=file.file,           # ← file.file is the actual BinaryIO
            filename=file.filename,
            test_id=test_id
        )
        return photo
    
    except ValueError as e:
        # Validation errors (bad image, wrong format, etc.)
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    
    except Exception as e:
        # Server errors (MinIO down, DB error, etc.)
        logger.error(f"Upload failed with exception: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.delete("/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_photo(photo_id: int, db: Session = Depends(get_db)):
    """
    Delete a photo by ID.
    
    - **photo_id**: Photo ID to delete
    """
    try:
        # 1. Get photo from database
        photo = db.query(Photo).filter(Photo.id == photo_id).first()
        if not photo:
            raise HTTPException(status_code=404, detail="Photo not found")
        
        # 2. Delete from MinIO storage
        try:
            await photo_storage.delete_photo(photo.file_path)
            logger.info(f"Deleted photo from MinIO: {photo.file_path}")
        except Exception as e:
            logger.error(f"Failed to delete photo from MinIO: {photo.file_path}, Error: {str(e)}")
            # Continue to delete from DB even if MinIO deletion fails
        
        # 3. Delete from database
        db.delete(photo)
        db.commit()
        
        logger.info(f"Deleted photo {photo_id}")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete photo: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to delete photo: {str(e)}")
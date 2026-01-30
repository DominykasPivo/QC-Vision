from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
import logging
import traceback

from .service import photo_service
from .schemas import PhotoResponse, PhotoUrlResponse
from app.database import get_db

logger = logging.getLogger("backend_photos_router")


"""
https://medium.com/@mlopsengineer/routers-in-fastapi-tutorial-2-adf3e505fdca
"""

router = APIRouter(prefix="", tags=["photos"])

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
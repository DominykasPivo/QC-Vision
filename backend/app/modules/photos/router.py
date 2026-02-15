import io
import logging
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.modules.audit.service import log_action

from .models import Photo
from .schemas import PhotoResponse, PhotoUrlResponse
from .service import photo_service
from .storage import photo_storage

logger = logging.getLogger("backend_photos_router")

router = APIRouter(prefix="", tags=["photos"])


@router.get("/test/{test_id}", response_model=List[PhotoResponse])
async def get_photos_for_test(test_id: int, db: Session = Depends(get_db)):
    """Get all photos for a specific test."""
    photos = db.query(Photo).filter(Photo.test_id == test_id).all()
    return photos


@router.get("/{photo_id}/url", response_model=PhotoUrlResponse)
async def get_photo_url(photo_id: int, db: Session = Depends(get_db)):
    """Get a presigned URL for a photo."""
    photo = db.query(Photo).filter(Photo.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")

    url = photo_storage.generate_presigned_url(photo.file_path, expiration=3600)
    return PhotoUrlResponse(url=url, expires_in=3600)


@router.get("/{photo_id}/image")
async def get_photo_image(photo_id: int, db: Session = Depends(get_db)):
    """Get photo image data directly (proxy through backend).
    Works on any device without exposing MinIO URLs.
    """
    photo = db.query(Photo).filter(Photo.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")

    try:
        image_data = await photo_storage.get_photo(photo.file_path)

        content_type = "image/jpeg"
        if photo.file_path.lower().endswith(".png"):
            content_type = "image/png"
        elif photo.file_path.lower().endswith(".webp"):
            content_type = "image/webp"

        return StreamingResponse(
            io.BytesIO(image_data),
            media_type=content_type,
            headers={
                "Cache-Control": "public, max-age=3600",
                "Content-Disposition": f'inline; filename="{photo.file_path.split("/")[-1]}"',
            },
        )
    except Exception as e:
        logger.error(f"Failed to retrieve image for photo {photo_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve image")


@router.post("/upload", response_model=PhotoResponse, status_code=201)
async def upload_photo(
    test_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)
):
    """
    Upload a photo for a quality test.

    Returns photo details including ID and file path.
    """
    username = "system"

    # 1. Validate content type
    if not file.content_type or not file.content_type.startswith("image/"):
        log_action(
            db,
            action="UPLOAD_FAILED",
            entity_type="Photo",
            entity_id=0,
            username=username,
            meta={
                "reason": "invalid_content_type",
                "content_type": file.content_type,
                "filename": file.filename,
                "test_id": test_id,
            },
        )
        raise HTTPException(status_code=400, detail="File must be an image")

    try:
        # 2. Call service with correct parameter order
        photo = await photo_service.upload_photo(
            db=db,
            file=file.file,  # ← file.file is the actual BinaryIO
            filename=file.filename,
            test_id=test_id,
        )

        log_action(
            db,
            action="UPLOAD",
            entity_type="Photo",
            entity_id=photo.id,
            username=username,
            meta={
                "filename": file.filename,
                "content_type": file.content_type,
                "test_id": test_id,
                "file_path": getattr(photo, "file_path", None),
            },
        )

        return photo

    except ValueError as e:
        # Validation errors (bad image, wrong format, etc.)
        logger.error(f"Validation error: {str(e)}")

        log_action(
            db,
            action="UPLOAD_FAILED",
            entity_type="Photo",
            entity_id=0,
            username=username,
            meta={
                "reason": "validation_error",
                "error": str(e),
                "filename": file.filename,
                "content_type": file.content_type,
                "test_id": test_id,
            },
        )

        raise HTTPException(status_code=400, detail=str(e))

    except Exception as e:
        # Server errors (MinIO down, DB error, etc.)
        logger.error(f"Upload failed with exception: {str(e)}")

        log_action(
            db,
            action="UPLOAD_FAILED",
            entity_type="Photo",
            entity_id=0,
            username=username,
            meta={
                "reason": "server_error",
                "error": str(e),
                "filename": file.filename,
                "content_type": file.content_type,
                "test_id": test_id,
            },
        )

        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.delete("/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_photo(photo_id: int, db: Session = Depends(get_db)):
    """
    Delete a photo by ID.

    - **photo_id**: Photo ID to delete
    """
    username = "system"

    try:
        # 1. Get photo from database
        photo = db.query(Photo).filter(Photo.id == photo_id).first()
        if not photo:
            log_action(
                db,
                action="DELETE_FAILED",
                entity_type="Photo",
                entity_id=photo_id,
                username=username,
                meta={"reason": "not_found"},
            )
            raise HTTPException(status_code=404, detail="Photo not found")

        # Keep info for audit meta before deletion
        photo_path = photo.file_path
        test_id = getattr(photo, "test_id", None)

        # 2. Delete from MinIO storage
        minio_deleted = False
        try:
            await photo_storage.delete_photo(photo.file_path)
            minio_deleted = True
            logger.info(f"Deleted photo from MinIO: {photo.file_path}")
        except Exception as e:
            logger.error(
                f"Failed to delete photo from MinIO: {photo.file_path}, Error: {str(e)}"
            )
            # Continue to delete from DB even if MinIO deletion fails

        # 3. Delete from database
        db.delete(photo)
        db.commit()

        log_action(
            db,
            action="DELETE",
            entity_type="Photo",
            entity_id=photo_id,
            username=username,
            meta={
                "file_path": photo_path,
                "test_id": test_id,
                "minio_deleted": minio_deleted,
            },
        )

        logger.info(f"Deleted photo {photo_id}")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete photo: {str(e)}")

        log_action(
            db,
            action="DELETE_FAILED",
            entity_type="Photo",
            entity_id=photo_id,
            username=username,
            meta={
                "reason": "server_error",
                "error": str(e),
            },
        )

        raise HTTPException(status_code=500, detail=f"Failed to delete photo: {str(e)}")

import io
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.modules.audit.service import log_action

from .models import Photo
from .schemas import GalleryPhotoResponse, GalleryResponse, PhotoResponse, PhotoUpdate
from .service import photo_service
from .storage import photo_storage 

logger = logging.getLogger("backend_photos_router")

router = APIRouter(prefix="", tags=["photos"])


@router.get("/test/{test_id}", response_model=List[PhotoResponse])
async def get_photos_for_test(test_id: int, db: Session = Depends(get_db)):
    photos = db.query(Photo).filter(Photo.test_id == test_id).all()
    return photos


@router.get("/gallery", response_model=GalleryResponse)
async def get_gallery(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    severity: Optional[str] = Query(default=None),
    category_id: Optional[int] = Query(default=None),
    test_type: Optional[str] = Query(default=None),
    test_status: Optional[str] = Query(default=None),
    has_defects: Optional[bool] = Query(default=None),
    verification_status: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
):
    """Get paginated gallery photos with aggregated defect summaries."""
    items, total = photo_service.get_gallery_photos(
        db,
        page=page,
        page_size=page_size,
        severity=severity,
        category_id=category_id,
        test_type=test_type,
        test_status=test_status,
        has_defects=has_defects,
        verification_status=verification_status,
    )
    return GalleryResponse(
        items=[GalleryPhotoResponse(**item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{photo_id}/image")
async def get_photo_image(photo_id: int, db: Session = Depends(get_db)):
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


@router.get("/{photo_id}", response_model=PhotoResponse)
async def get_photo(photo_id: int, db: Session = Depends(get_db)):
    """Get a single photo by ID."""
    photo = db.query(Photo).filter(Photo.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    return photo


@router.post("/upload", response_model=PhotoResponse, status_code=201)
async def upload_photo(
    test_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)
):
    username = "system"

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
        photo = await photo_service.upload_photo(
            db=db,
            file=file.file,
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


@router.patch("/{photo_id}/verification", response_model=PhotoResponse)
async def update_verification_status(
    photo_id: int,
    payload: dict,
    db: Session = Depends(get_db),
):
    """Update the verification status of a photo (pending, approved, rejected)."""
    verification_status = payload.get("verification_status")
    if not verification_status:
        raise HTTPException(status_code=400, detail="verification_status is required")

    try:
        photo = photo_service.update_verification_status(
            db, photo_id, verification_status
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")

    log_action(
        db,
        action="UPDATE",
        entity_type="Photo",
        entity_id=photo_id,
        username="system",
        meta={"verification_status": verification_status},
    )

    return photo


@router.patch("/{photo_id}", response_model=PhotoResponse)
async def update_photo(
    photo_id: int,
    update_data: PhotoUpdate,
    db: Session = Depends(get_db),
):
    """Update photo metadata (e.g., description)."""
    photo = db.query(Photo).filter(Photo.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")

    # Update only the fields that are provided
    if update_data.description is not None:
        photo.description = update_data.description

    db.commit()
    db.refresh(photo)

    log_action(
        db,
        action="UPDATE",
        entity_type="Photo",
        entity_id=photo_id,
        username="system",
        meta={"description": update_data.description},
    )

    return photo


@router.delete("/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_photo(photo_id: int, db: Session = Depends(get_db)):
    username = "system"

    try:
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

        photo_path = photo.file_path
        test_id = getattr(photo, "test_id", None)

        minio_deleted = False
        try:
            await photo_storage.delete_photo(photo.file_path)
            minio_deleted = True
        except Exception as e:
            logger.error(f"Failed to delete MinIO object {photo.file_path}: {e}")

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
        return

    except HTTPException:
        raise
    except Exception as e:
        log_action(
            db,
            action="DELETE_FAILED",
            entity_type="Photo",
            entity_id=photo_id,
            username=username,
            meta={"reason": "server_error", "error": str(e)},
        )
        raise HTTPException(status_code=500, detail=f"Failed to delete photo: {str(e)}")

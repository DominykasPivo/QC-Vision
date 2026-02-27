import logging
from typing import Any, Optional, cast

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.modules.audit.service import log_action

from .models import Photo
from .schemas import PhotoResponse
from .service import photo_service

logger = logging.getLogger("backend_photos_router")

# Tests call: /api/v1/photos/...
router = APIRouter(prefix="/photos", tags=["photos"])

# IMPORTANT FOR TESTS:
photo_storage = photo_service.storage


@router.post(
    "/upload", response_model=PhotoResponse, status_code=status.HTTP_201_CREATED
)
async def upload_photo(
    test_id: int = Query(..., ge=1),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    username = "system"

    try:
        photo_service.storage = photo_storage

        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="Not an image file")

        filename_str = cast(str, file.filename)

        photo = await photo_service.upload_photo(
            db=db,
            file=file.file,
            filename=filename_str,
            test_id=test_id,
        )

        log_action(
            db,
            action="UPLOAD",
            entity_type="Photo",
            entity_id=cast(int, getattr(photo, "id")),
            username=username,
            meta={
                "filename": filename_str,
                "content_type": file.content_type,
                "test_id": test_id,
                "file_path": getattr(photo, "file_path", None),
                "source": "photos.upload_photo",
            },
        )

        return PhotoResponse.model_validate(photo)

    except HTTPException:
        raise

    # ✅ TESTS EXPECT 400 for empty/corrupt images -> service raises ValueError
    except ValueError as e:
        log_action(
            db,
            action="UPLOAD_FAILED",
            entity_type="Photo",
            entity_id=0,
            username=username,
            meta={
                "reason": "invalid_input",
                "error": str(e),
                "filename": getattr(file, "filename", None),
                "content_type": getattr(file, "content_type", None),
                "test_id": test_id,
                "source": "photos.upload_photo",
            },
        )
        raise HTTPException(status_code=400, detail=str(e))

    except Exception as e:
        logger.error(f"Upload photo failed: {str(e)}", exc_info=True)
        log_action(
            db,
            action="UPLOAD_FAILED",
            entity_type="Photo",
            entity_id=0,
            username=username,
            meta={
                "reason": "server_error",
                "error": str(e),
                "filename": getattr(file, "filename", None),
                "content_type": getattr(file, "content_type", None),
                "test_id": test_id,
                "source": "photos.upload_photo",
            },
        )
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/test/{test_id}")
async def list_photos_for_test(test_id: int, db: Session = Depends(get_db)):
    photo_service.storage = photo_storage
    photos = (
        db.query(Photo).filter(Photo.test_id == test_id).order_by(Photo.id.asc()).all()
    )
    return [PhotoResponse.model_validate(p) for p in photos]


@router.get("/{photo_id}/image")
async def get_photo_image(photo_id: int, db: Session = Depends(get_db)):
    photo_service.storage = photo_storage

    photo = await photo_service.get_photo(db, photo_id)
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")

    file_path = getattr(photo, "file_path", None)
    if not file_path:
        raise HTTPException(status_code=404, detail="Photo file not found")

    data = await cast(Any, photo_service.storage).get_photo(file_path)
    return Response(content=data, media_type="image/jpeg")


@router.delete("/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_photo(photo_id: int, db: Session = Depends(get_db)):
    username = "system"
    photo_service.storage = photo_storage

    photo = await photo_service.get_photo(db, photo_id)
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")

    file_path = getattr(photo, "file_path", None)
    if file_path:
        try:
            await cast(Any, photo_service.storage).delete_photo(file_path)
        except Exception:
            pass

    await photo_service.delete_photo(db, photo_id)

    log_action(
        db,
        action="DELETE",
        entity_type="Photo",
        entity_id=photo_id,
        username=username,
        meta={"source": "photos.delete_photo"},
    )
    return


@router.get("/gallery")
async def gallery(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    severity: Optional[str] = Query(None),
    category_id: Optional[int] = Query(None),
    test_type: Optional[str] = Query(None),
    test_status: Optional[str] = Query(None),
    has_defects: Optional[bool] = Query(None),
    verification_status: Optional[str] = Query(None),
):
    items, total = photo_service.get_gallery_photos(
        db=db,
        page=page,
        page_size=page_size,
        severity=severity,
        category_id=category_id,
        test_type=test_type,
        test_status=test_status,
        has_defects=has_defects,
        verification_status=verification_status,
    )
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.patch("/{photo_id}/verification", response_model=PhotoResponse)
async def update_verification_status(
    photo_id: int, payload: dict, db: Session = Depends(get_db)
):
    username = "system"
    photo_service.storage = photo_storage

    verification_status = payload.get("verification_status")
    if not isinstance(verification_status, str):
        raise HTTPException(status_code=400, detail="verification_status is required")

    try:
        updated = photo_service.update_verification_status(
            db=db, photo_id=photo_id, verification_status=verification_status
        )
        if not updated:
            raise HTTPException(status_code=404, detail="Photo not found")

        log_action(
            db,
            action="VERIFY",
            entity_type="Photo",
            entity_id=photo_id,
            username=username,
            meta={
                "verification_status": verification_status,
                "source": "photos.update_verification_status",
            },
        )

        return PhotoResponse.model_validate(updated)

    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Verification update failed: {str(e)}", exc_info=True)
        log_action(
            db,
            action="VERIFY_FAILED",
            entity_type="Photo",
            entity_id=photo_id,
            username=username,
            meta={
                "reason": "server_error",
                "error": str(e),
                "source": "photos.update_verification_status",
            },
        )
        raise HTTPException(status_code=500, detail=str(e))


__all__ = ["router", "photo_storage"]

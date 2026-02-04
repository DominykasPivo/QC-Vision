from fastapi import APIRouter, HTTPException, Depends, status, UploadFile, File, Form
from typing import List, Optional
from datetime import datetime
import logging

from .schemas import TestCreate, TestResponse
from .service import tests_service
from sqlalchemy.orm import Session
from app.database import get_db
from app.modules.photos.service import photo_service
from app.modules.photos.schemas import PhotoResponse
from app.modules.audit.service import log_action

logger = logging.getLogger("backend_tests_router")

router = APIRouter(prefix="", tags=["tests"])


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_test(
    productId: int = Form(...),
    testType: str = Form(...),
    requester: str = Form(...),
    assignedTo: Optional[str] = Form(None),
    status_field: str = Form("pending", alias="status"),
    deadlineAt: str = Form(None),
    photos: List[UploadFile] = File(default=[]),
    db: Session = Depends(get_db),
):
    """Create a new quality control test with optional photo uploads."""
    username = "system"

    try:
        deadline = None
        if deadlineAt:
            try:
                deadline = datetime.fromisoformat(deadlineAt.replace("Z", "+00:00"))
            except ValueError:
                log_action(
                    db,
                    action="CREATE_FAILED",
                    entity_type="Test",
                    entity_id=0,
                    username=username,
                    meta={
                        "reason": "invalid_deadline_format",
                        "deadlineAt": deadlineAt,
                        "productId": productId,
                        "testType": testType,
                        "requester": requester,
                    },
                )
                raise HTTPException(
                    status_code=400,
                    detail="Invalid deadline format. Use ISO 8601 format.",
                )

        test_data = TestCreate(
            product_id=productId,
            test_type=testType,
            requester=requester,
            assigned_to=assignedTo,
            status=status_field,
            deadline_at=deadline,
        )

        test = await tests_service.create_test(db, test_data)
        logger.info(f"Created test with ID: {test.id}")

        log_action(
            db,
            action="CREATE",
            entity_type="Test",
            entity_id=test.id,
            username=username,
            meta={
                "productId": productId,
                "testType": testType,
                "requester": requester,
                "assignedTo": assignedTo,
                "status": status_field,
                "deadlineAt": deadlineAt,
                "photo_count": len(photos) if photos else 0,
            },
        )

        uploaded_photos = []
        failed_photos = []

        if photos:
            for photo_file in photos:
                try:
                    if not photo_file.content_type or not photo_file.content_type.startswith(
                        "image/"
                    ):
                        failed_photos.append(
                            {"filename": photo_file.filename, "error": "Not an image file"}
                        )

                        log_action(
                            db,
                            action="UPLOAD_FAILED",
                            entity_type="Photo",
                            entity_id=0,
                            username=username,
                            meta={
                                "reason": "invalid_content_type",
                                "filename": photo_file.filename,
                                "content_type": photo_file.content_type,
                                "test_id": test.id,
                            },
                        )
                        continue

                    photo = await photo_service.upload_photo(
                        db=db,
                        file=photo_file.file,
                        filename=photo_file.filename,
                        test_id=test.id,
                    )
                    uploaded_photos.append(PhotoResponse.model_validate(photo))
                    logger.info(
                        f"Uploaded photo {photo_file.filename} for test {test.id}"
                    )

                    log_action(
                        db,
                        action="UPLOAD",
                        entity_type="Photo",
                        entity_id=photo.id,
                        username=username,
                        meta={
                            "filename": photo_file.filename,
                            "content_type": photo_file.content_type,
                            "test_id": test.id,
                            "file_path": getattr(photo, "file_path", None),
                            "source": "tests.create_test",
                        },
                    )

                except Exception as photo_error:
                    logger.error(
                        f"Failed to upload {photo_file.filename}: {str(photo_error)}"
                    )
                    failed_photos.append(
                        {"filename": photo_file.filename, "error": str(photo_error)}
                    )

                    log_action(
                        db,
                        action="UPLOAD_FAILED",
                        entity_type="Photo",
                        entity_id=0,
                        username=username,
                        meta={
                            "reason": "server_error",
                            "filename": photo_file.filename,
                            "test_id": test.id,
                            "error": str(photo_error),
                            "source": "tests.create_test",
                        },
                    )

        return {
            "test": TestResponse.model_validate(test),
            "photos": uploaded_photos,
            "failed_photos": failed_photos,
            "message": "Test created successfully"
            + (f" with {len(uploaded_photos)} photo(s)" if photos else "")
            + (f". {len(failed_photos)} failed" if failed_photos else ""),
        }

    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"Error creating test: {str(e)}", exc_info=True)

        log_action(
            db,
            action="CREATE_FAILED",
            entity_type="Test",
            entity_id=0,
            username=username,
            meta={
                "reason": "server_error",
                "error": str(e),
                "productId": productId,
                "testType": testType,
                "requester": requester,
            },
        )

        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{test_id}", response_model=TestResponse)
async def get_test(test_id: int, db: Session = Depends(get_db)):
    """Retrieve a specific quality test by ID."""

    test = await tests_service.get_test(db, test_id)
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    return test


@router.get("/", response_model=List[TestResponse])
async def list_tests(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """List all quality tests with pagination."""
    return await tests_service.get_all_tests(db, skip=skip, limit=limit)


@router.patch("/{test_id}", response_model=TestResponse)
async def update_test(test_id: int, test_data: dict, db: Session = Depends(get_db)):
    """Update an existing quality test (partial update)."""
    username = "system"

    try:
        updated = await tests_service.update_test(db, test_id, test_data)

        log_action(
            db,
            action="UPDATE",
            entity_type="Test",
            entity_id=test_id,
            username=username,
            meta={"updated_fields": list(test_data.keys())},
        )

        return updated

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    except Exception as e:
        log_action(
            db,
            action="UPDATE_FAILED",
            entity_type="Test",
            entity_id=test_id,
            username=username,
            meta={
                "reason": "server_error",
                "error": str(e),
            },
        )
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{test_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_test(test_id: int, db: Session = Depends(get_db)):
    """
    Delete a quality test and all associated photos.
    
    - **test_id**: Test ID to delete
    """
    username = "system"

    try:
        await tests_service.delete_test(db, test_id)

        log_action(
            db,
            action="DELETE",
            entity_type="Test",
            entity_id=test_id,
            username=username,
            meta={},
        )

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    except Exception as e:
        log_action(
            db,
            action="DELETE_FAILED",
            entity_type="Test",
            entity_id=test_id,
            username=username,
            meta={
                "reason": "server_error",
                "error": str(e),
            },
        )
        raise HTTPException(status_code=500, detail=str(e))

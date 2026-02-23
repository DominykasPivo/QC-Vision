import logging
from datetime import datetime
from typing import List, Optional

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from sqlalchemy.orm import Session

from app.database import get_db
from app.modules.audit.service import log_action
from app.modules.photos.schemas import PhotoResponse
from app.modules.photos.service import photo_service

from .schemas import TestCreate, TestListResponse, TestResponse
from .service import tests_service

logger = logging.getLogger("backend_tests_router")

router = APIRouter(prefix="", tags=["tests"])


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_test(
    productId: int = Form(...),
    testType: str = Form(...),
    requester: str = Form(...),
    assignedTo: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
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
            description=description,
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
                "description": description,
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
                    if (
                        not photo_file.content_type
                        or not photo_file.content_type.startswith("image/")
                    ):
                        failed_photos.append(
                            {
                                "filename": photo_file.filename,
                                "error": "Not an image file",
                            }
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
                                "test_id": test.id,  # already correct ✅
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
                            "test_id": test.id,  # ✅ CHANGED: keep test_id to group under test
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
                            "test_id": test.id,  # ✅ keep test_id
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


@router.get("/", response_model=TestListResponse)
async def list_tests(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    search: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
):
    """List quality tests with pagination, optional status filter and search."""
    items, total = await tests_service.get_tests_paginated(
        db, offset=offset, limit=limit, status=status_filter, search=search
    )
    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.patch("/{test_id}", response_model=TestResponse)
async def update_test(test_id: int, test_data: dict, db: Session = Depends(get_db)):
    """Update an existing quality test (partial update)."""
    username = "system"

    try:
        # ✅ CHANGED: fetch current state BEFORE update so we can log meaningful transitions
        current = await tests_service.get_test(db, test_id)  # ✅ CHANGED
        if not current:
            raise HTTPException(status_code=404, detail="Test not found")  # ✅ CHANGED

        before_status = getattr(current, "status", None)  # ✅ CHANGED
        before_assigned_to = getattr(current, "assigned_to", None)  # ✅ CHANGED
        before_test_type = getattr(current, "test_type", None)  # ✅ CHANGED

        updated = await tests_service.update_test(db, test_id, test_data)

        # ✅ CHANGED: log special user-visible actions first (status/assign/type)
        after_status = getattr(updated, "status", None)  # ✅ CHANGED
        after_assigned_to = getattr(updated, "assigned_to", None)  # ✅ CHANGED
        after_test_type = getattr(updated, "test_type", None)  # ✅ CHANGED

        # STATUS_CHANGE
        if "status" in test_data and before_status != after_status:  # ✅ CHANGED
            log_action(
                db,
                action="STATUS_CHANGE",  # ✅ CHANGED
                entity_type="Test",
                entity_id=test_id,
                username=username,
                meta={"from": before_status, "to": after_status},  # ✅ CHANGED
            )

        # ASSIGN / UNASSIGN
        if "assigned_to" in test_data and before_assigned_to != after_assigned_to:  # ✅ CHANGED
            if after_assigned_to and not before_assigned_to:
                action = "ASSIGN"  # ✅ CHANGED
            elif not after_assigned_to and before_assigned_to:
                action = "UNASSIGN"  # ✅ CHANGED
            else:
                action = "ASSIGN"  # reassigned still counts as assign (simple) ✅ CHANGED

            log_action(
                db,
                action=action,  # ✅ CHANGED
                entity_type="Test",
                entity_id=test_id,
                username=username,
                meta={"from": before_assigned_to, "to": after_assigned_to},  # ✅ CHANGED
            )

        # TEST_TYPE_CHANGE
        if "test_type" in test_data and before_test_type != after_test_type:  # ✅ CHANGED
            log_action(
                db,
                action="TEST_TYPE_CHANGE",  # ✅ CHANGED
                entity_type="Test",
                entity_id=test_id,
                username=username,
                meta={"from": before_test_type, "to": after_test_type},  # ✅ CHANGED
            )

        # ✅ CHANGED: keep the generic UPDATE log too (covers description/deadline/etc.)
        log_action(
            db,
            action="UPDATE",
            entity_type="Test",
            entity_id=test_id,
            username=username,
            meta={"updated_fields": list(test_data.keys())},
        )

        return updated

    except HTTPException:
        raise  # ✅ CHANGED: preserve status code for 404

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
    """Delete a quality test and all associated photos."""
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
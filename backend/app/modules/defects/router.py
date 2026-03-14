import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.modules.audit.service import log_action, log_changes
from app.modules.photos.models import Photo
from app.security import get_actor, require_reviewer

from .schemas import (
    AnnotationCreate,
    AnnotationResponse,
    AnnotationUpdate,
    CategoryResponse,
    DefectCreate,
    DefectResponse,
    DefectReviewRequest,
    DefectUpdate,
)
from .service import defects_service

logger = logging.getLogger("backend_defects_router")

# ✅ Correct prefix so tests hit /api/v1/defects/...
router = APIRouter(prefix="/defects", tags=["defects"])


def _serialize_defect(defect) -> dict:
    return DefectResponse.model_validate(defect).model_dump(mode="json")


def _defect_field_values(defect, payload_data: dict) -> dict:
    values: dict = {}
    for field in payload_data.keys():
        if field == "category_id":
            annotations = getattr(defect, "annotations", []) or []
            values[field] = annotations[0].category_id if annotations else None
        elif field == "color":
            annotations = getattr(defect, "annotations", []) or []
            values[field] = annotations[0].color if annotations else None
        elif field == "annotations":
            annotations = getattr(defect, "annotations", []) or []
            values[field] = [
                {
                    "category_id": annotation.category_id,
                    "geometry": annotation.geometry,
                    "color": annotation.color,
                }
                for annotation in annotations
            ]
        else:
            values[field] = getattr(defect, field, None)
    return values


@router.get("/categories", response_model=List[CategoryResponse])
async def list_defect_categories(db: Session = Depends(get_db)):
    """Get all available defect categories."""
    return await defects_service.list_categories(db)


@router.post(
    "/photo/{photo_id}",
    response_model=DefectResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_defect(
    photo_id: int,
    payload: DefectCreate,
    db: Session = Depends(get_db),
    actor=Depends(get_actor),
):
    """Create a new defect for a specific photo."""
    try:
        defect = await defects_service.create_defect_for_photo(db, photo_id, payload)
        logger.info(f"Created defect {defect.id} for photo {photo_id}")
        photo = db.query(Photo).filter(Photo.id == photo_id).first()
        test_id = getattr(photo, "test_id", None) if photo else None
        log_action(
            db,
            action="CREATE",
            entity_type="Defect",
            entity_id=defect.id,
            test_id=test_id,
            new_value=_serialize_defect(defect),
            username=actor["username"],
            meta={
                "photo_id": photo_id,
            },
        )
        return defect
    except Exception as e:
        logger.error(f"Failed to create defect for photo {photo_id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/photo/{photo_id}", response_model=List[DefectResponse])
async def list_defects(photo_id: int, db: Session = Depends(get_db)):
    """Get all defects for a specific photo."""
    return await defects_service.list_defects_for_photo(db, photo_id)


@router.post("/{defect_id}/review", response_model=DefectResponse)
async def review_defect(
    defect_id: int,
    payload: DefectReviewRequest,
    db: Session = Depends(get_db),
    actor=Depends(require_reviewer),
):
    try:
        updated = await defects_service.review_defect(
            db=db,
            defect_id=defect_id,
            decision=payload.decision,
            reviewer=actor["username"],
            comment=payload.comment,
        )

        log_action(
            db,
            action="REVIEW",
            entity_type="Defect",
            entity_id=defect_id,
            username=actor["username"],
            meta={"decision": payload.decision, "comment": payload.comment},
        )
        return updated

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{defect_id}", response_model=DefectResponse)
async def get_defect(defect_id: int, db: Session = Depends(get_db)):
    """Get a specific defect by ID."""
    defect = await defects_service.get_defect(db, defect_id)
    if not defect:
        raise HTTPException(status_code=404, detail="Defect not found")
    return defect


@router.post(
    "/{defect_id}/annotations",
    response_model=AnnotationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_annotation(
    defect_id: int, ann: AnnotationCreate, db: Session = Depends(get_db)
):
    """Add an annotation to an existing defect."""
    defect = await defects_service.get_defect(db, defect_id)
    if not defect:
        raise HTTPException(status_code=404, detail="Defect not found")

    return await defects_service.add_annotation(db, defect_id, ann)


@router.put("/{defect_id}", response_model=DefectResponse)
async def update_defect(
    defect_id: int,
    payload: DefectUpdate,
    db: Session = Depends(get_db),
    actor=Depends(get_actor),
):
    """Update an existing defect."""
    current = await defects_service.get_defect(db, defect_id)
    if not current:
        raise HTTPException(status_code=404, detail="Defect not found")

    payload_data = payload.model_dump(exclude_unset=True)
    before_values = _defect_field_values(current, payload_data)
    defect = await defects_service.update_defect(db, defect_id, payload)
    if not defect:
        raise HTTPException(status_code=404, detail="Defect not found")
    photo = db.query(Photo).filter(Photo.id == defect.photo_id).first()
    test_id = getattr(photo, "test_id", None) if photo else None
    log_changes(
        db,
        entity_type="Defect",
        entity_id=defect_id,
        test_id=test_id,
        username=actor["username"],
        before=before_values,
        after=_defect_field_values(defect, payload_data),
        meta={"photo_id": defect.photo_id},
    )
    logger.info(f"Updated defect {defect_id}")
    return defect


@router.delete("/{defect_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_defect(
    defect_id: int,
    db: Session = Depends(get_db),
    actor=Depends(get_actor),
):
    """Delete a defect and all its annotations."""
    defect = await defects_service.get_defect(db, defect_id)
    if not defect:
        raise HTTPException(status_code=404, detail="Defect not found")

    photo = db.query(Photo).filter(Photo.id == defect.photo_id).first()
    test_id = getattr(photo, "test_id", None) if photo else None
    deleted_value = _serialize_defect(defect)

    success = await defects_service.delete_defect(db, defect_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete defect")
    logger.info(f"Deleted defect {defect_id}")
    log_action(
        db,
        action="DELETE",
        entity_type="Defect",
        entity_id=defect_id,
        test_id=test_id,
        old_value=deleted_value,
        username=actor["username"],
        meta={
            "photo_id": defect.photo_id,
        },
    )


@router.put("/annotations/{annotation_id}", response_model=AnnotationResponse)
async def update_annotation(
    annotation_id: int, payload: AnnotationUpdate, db: Session = Depends(get_db)
):
    """Update an annotation's geometry (to move it), category, or color."""
    annotation = await defects_service.update_annotation(db, annotation_id, payload)
    if not annotation:
        raise HTTPException(status_code=404, detail="Annotation not found")
    logger.info(f"Updated annotation {annotation_id}")
    return annotation


@router.delete("/annotations/{annotation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_annotation(annotation_id: int, db: Session = Depends(get_db)):
    """Remove a specific annotation from its defect."""
    success = await defects_service.delete_annotation(db, annotation_id)
    if not success:
        raise HTTPException(status_code=404, detail="Annotation not found")
    logger.info(f"Deleted annotation {annotation_id}")

import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.modules.audit.service import log_action
from app.security import require_reviewer

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

router = APIRouter(prefix="", tags=["defects"])


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
    photo_id: int, payload: DefectCreate, db: Session = Depends(get_db)
):
    """Create a new defect for a specific photo."""
    try:
        defect = await defects_service.create_defect_for_photo(db, photo_id, payload)
        logger.info(f"Created defect {defect.id} for photo {photo_id}")
        return defect
    except Exception as e:
        logger.error(f"Failed to create defect for photo {photo_id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/photo/{photo_id}", response_model=List[DefectResponse])
async def list_defects(photo_id: int, db: Session = Depends(get_db)):
    """Get all defects for a specific photo."""
    return await defects_service.list_defects_for_photo(db, photo_id)


@router.post(
    "/{defect_id}/review", response_model=DefectResponse
)  # use your actual response model name
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
    defect_id: int, payload: DefectUpdate, db: Session = Depends(get_db)
):
    """Update an existing defect."""
    defect = await defects_service.update_defect(db, defect_id, payload)
    if not defect:
        raise HTTPException(status_code=404, detail="Defect not found")
    logger.info(f"Updated defect {defect_id}")
    return defect


@router.delete("/{defect_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_defect(defect_id: int, db: Session = Depends(get_db)):
    """Delete a defect and all its annotations."""
    success = await defects_service.delete_defect(db, defect_id)
    if not success:
        raise HTTPException(status_code=404, detail="Defect not found")
    logger.info(f"Deleted defect {defect_id}")


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

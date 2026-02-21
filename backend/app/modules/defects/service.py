from datetime import datetime
from typing import List, Optional

from sqlalchemy.orm import Session, joinedload

from .models import Defect, DefectAnnotation, DefectCategory
from .schemas import AnnotationCreate, DefectCreate, DefectUpdate


class DefectsService:
    """
    Service layer for defect management operations.

    Handles creation, retrieval, updating, and deletion of defects
    and their associated annotations.
    """

    async def list_categories(self, db: Session) -> List[DefectCategory]:
        """Get all defect categories ordered by name."""
        return db.query(DefectCategory).order_by(DefectCategory.name.asc()).all()

    async def create_defect_for_photo(
        self, db: Session, photo_id: int, payload: DefectCreate
    ) -> Defect:
        """Create a defect with annotations for a photo."""
        defect = Defect(
            photo_id=photo_id,
            description=payload.description,
            severity=payload.severity,
        )
        db.add(defect)
        db.flush()  # get defect.id

        # create annotations from payload
        for ann in payload.annotations:
            db.add(
                DefectAnnotation(
                    defect_id=defect.id,
                    category_id=ann.category_id,
                    geometry=ann.geometry,
                    color=ann.color,
                )
            )

        db.commit()
        db.refresh(defect)
        return defect

    async def list_defects_for_photo(self, db: Session, photo_id: int) -> List[Defect]:
        """Get all defects for a photo with annotations, ordered by creation date (newest first)."""
        return (
            db.query(Defect)
            .options(joinedload(Defect.annotations))
            .filter(Defect.photo_id == photo_id)
            .order_by(Defect.created_at.desc())
            .all()
        )

    async def get_defect(self, db: Session, defect_id: int) -> Optional[Defect]:
        """Get a single defect by ID."""
        return db.query(Defect).filter(Defect.id == defect_id).first()

    async def add_annotation(
        self, db: Session, defect_id: int, ann: AnnotationCreate
    ) -> DefectAnnotation:
        """Add an annotation to an existing defect."""
        row = DefectAnnotation(
            defect_id=defect_id,
            category_id=ann.category_id,
            geometry=ann.geometry,
            color=ann.color,
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        return row

    async def update_defect(self, db, defect_id: int, payload: DefectUpdate):
        defect = (
            db.query(Defect)
            .options()  # keep your existing options(...) args if you have them
            .filter(Defect.id == defect_id)
            .first()
        )
        if defect is None:
            return None

        update_data = payload.model_dump(exclude_unset=True)

        # handle category_id side-effect separately if needed
        category_id = update_data.pop("category_id", None)

        # apply normal fields like severity/description/etc.
        for field, value in update_data.items():
            setattr(defect, field, value)

        if category_id is not None:
            annotation = (
                db.query(DefectAnnotation)
                .filter(DefectAnnotation.defect_id == defect_id)
                .first()
            )
            if annotation is not None:
                annotation.category_id = category_id
            else:
                db.add(
                    DefectAnnotation(
                        defect_id=defect_id,
                        category_id=category_id,
                        geometry={},
                    )
                )

        db.commit()
        return defect

    async def delete_defect(self, db: Session, defect_id: int) -> bool:
        """Delete a defect and all its annotations. Returns True if deleted, False if not found."""
        defect = db.query(Defect).filter(Defect.id == defect_id).first()
        if not defect:
            return False

        db.delete(defect)
        db.commit()
        return True

    async def update_annotation(
        self, db: Session, annotation_id: int, payload
    ) -> Optional[DefectAnnotation]:
        """Update an annotation's geometry, category, or color."""
        annotation = (
            db.query(DefectAnnotation)
            .filter(DefectAnnotation.id == annotation_id)
            .first()
        )
        if not annotation:
            return None

        update_data = payload.model_dump(exclude_unset=True)

        if "geometry" in update_data:
            annotation.geometry = payload.geometry
        if "category_id" in update_data:
            annotation.category_id = payload.category_id
        if "color" in update_data:
            annotation.color = payload.color

        db.commit()
        db.refresh(annotation)
        return annotation

    async def delete_annotation(self, db: Session, annotation_id: int) -> bool:
        """Delete a specific annotation. Returns True if deleted, False if not found."""
        annotation = (
            db.query(DefectAnnotation)
            .filter(DefectAnnotation.id == annotation_id)
            .first()
        )
        if not annotation:
            return False

        db.delete(annotation)
        db.commit()
        return True

    async def review_defect(
        self,
        db: Session,
        defect_id: int,
        decision: str,
        reviewer: str,
        comment: Optional[str] = None,
    ):
        defect = db.query(Defect).filter(Defect.id == defect_id).first()
        if not defect:
            raise ValueError("Defect not found")

        if defect.review_status in ("approved", "rejected"):
            raise ValueError("Defect already reviewed")

        defect.review_status = decision
        defect.reviewed_by = reviewer
        defect.reviewed_at = datetime.utcnow()
        defect.review_comment = comment

        db.commit()
        db.refresh(defect)
        return defect


defects_service = DefectsService()

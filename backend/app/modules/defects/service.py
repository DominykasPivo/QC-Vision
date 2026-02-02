from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List, Optional

from .models import Defect, DefectAnnotation, DefectCategory
from .schemas import DefectCreate, AnnotationCreate


class DefectsService:
    async def list_categories(self, db: Session) -> List[DefectCategory]:
        return db.query(DefectCategory).order_by(DefectCategory.name.asc()).all()

    async def create_defect_for_photo(self, db: Session, photo_id: int, payload: DefectCreate) -> Defect:
        defect = Defect(
            photo_id=photo_id,
            description=payload.description,
            severity=payload.severity,
        )
        db.add(defect)
        db.flush()  # get defect.id

        # create annotations (optional)
        for ann in payload.annotations:
            db.add(DefectAnnotation(
                defect_id=defect.id,
                category_id=ann.category_id,
                geometry=ann.geometry
            ))

        db.commit()
        db.refresh(defect)
        return defect

    async def list_defects_for_photo(self, db: Session, photo_id: int) -> List[Defect]:
        return db.query(Defect).filter(Defect.photo_id == photo_id).order_by(Defect.created_at.desc()).all()

    async def get_defect(self, db: Session, defect_id: int) -> Optional[Defect]:
        return db.query(Defect).filter(Defect.id == defect_id).first()

    async def add_annotation(self, db: Session, defect_id: int, ann: AnnotationCreate) -> DefectAnnotation:
        row = DefectAnnotation(
            defect_id=defect_id,
            category_id=ann.category_id,
            geometry=ann.geometry
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        return row


defects_service = DefectsService()

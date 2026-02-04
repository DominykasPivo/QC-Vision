from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select
from typing import List, Optional

from .models import Defect, DefectAnnotation, DefectCategory
from .schemas import DefectCreate, DefectUpdate, AnnotationCreate


class DefectsService:
    """
    Service layer for defect management operations.
    
    Handles creation, retrieval, updating, and deletion of defects
    and their associated annotations.
    """
    
    async def list_categories(self, db: Session) -> List[DefectCategory]:
        """Get all defect categories ordered by name."""
        return db.query(DefectCategory).order_by(DefectCategory.name.asc()).all()

    async def create_defect_for_photo(self, db: Session, photo_id: int, payload: DefectCreate) -> Defect:
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
            db.add(DefectAnnotation(
                defect_id=defect.id,
                category_id=ann.category_id,
                geometry=ann.geometry
            ))

        db.commit()
        db.refresh(defect)
        return defect

    async def list_defects_for_photo(self, db: Session, photo_id: int) -> List[Defect]:
        """Get all defects for a photo with annotations, ordered by creation date (newest first)."""
        return db.query(Defect).options(joinedload(Defect.annotations)).filter(Defect.photo_id == photo_id).order_by(Defect.created_at.desc()).all()

    async def get_defect(self, db: Session, defect_id: int) -> Optional[Defect]:
        """Get a single defect by ID."""
        return db.query(Defect).filter(Defect.id == defect_id).first()

    async def add_annotation(self, db: Session, defect_id: int, ann: AnnotationCreate) -> DefectAnnotation:
        """Add an annotation to an existing defect."""
        row = DefectAnnotation(
            defect_id=defect_id,
            category_id=ann.category_id,
            geometry=ann.geometry
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        return row

    async def update_defect(self, db: Session, defect_id: int, payload: DefectUpdate) -> Optional[Defect]:
        """
        Update a defect's properties.
        
        Supports partial updates. Only updates fields that are explicitly provided.
        Can update defect description, severity, and category (via first annotation).
        """
        defect = db.query(Defect).filter(Defect.id == defect_id).first()
        if not defect:
            return None
        
        update_data = payload.model_dump(exclude_unset=True)
        
        if 'description' in update_data:
            defect.description = payload.description
        if 'severity' in update_data:
            defect.severity = payload.severity
        
        if 'category_id' in update_data and payload.category_id is not None:
            first_annotation = db.query(DefectAnnotation).filter(
                DefectAnnotation.defect_id == defect_id
            ).first()
            
            if first_annotation:
                first_annotation.category_id = payload.category_id
            else:
                db.add(DefectAnnotation(
                    defect_id=defect_id,
                    category_id=payload.category_id,
                    geometry={}
                ))
        
        db.commit()
        db.refresh(defect)
        return defect

    async def delete_defect(self, db: Session, defect_id: int) -> bool:
        """Delete a defect and all its annotations. Returns True if deleted, False if not found."""
        defect = db.query(Defect).filter(Defect.id == defect_id).first()
        if not defect:
            return False
        
        db.delete(defect)
        db.commit()
        return True     

defects_service = DefectsService()

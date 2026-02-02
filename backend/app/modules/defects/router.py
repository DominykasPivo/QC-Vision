from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from .service import defects_service
from .schemas import (
    CategoryResponse,
    DefectCreate,
    DefectResponse,
    AnnotationCreate,
    AnnotationResponse,
)

router = APIRouter(prefix="", tags=["defects"])


@router.get("/defect-categories", response_model=List[CategoryResponse])
async def list_defect_categories(db: Session = Depends(get_db)):
    return await defects_service.list_categories(db)


@router.post("/photos/{photo_id}/defects", response_model=DefectResponse, status_code=status.HTTP_201_CREATED)
async def create_defect(photo_id: int, payload: DefectCreate, db: Session = Depends(get_db)):
    try:
        defect = await defects_service.create_defect_for_photo(db, photo_id, payload)
        return defect
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/photos/{photo_id}/defects", response_model=List[DefectResponse])
async def list_defects(photo_id: int, db: Session = Depends(get_db)):
    return await defects_service.list_defects_for_photo(db, photo_id)


@router.get("/defects/{defect_id}", response_model=DefectResponse)
async def get_defect(defect_id: int, db: Session = Depends(get_db)):
    defect = await defects_service.get_defect(db, defect_id)
    if not defect:
        raise HTTPException(status_code=404, detail="Defect not found")
    return defect


@router.post("/defects/{defect_id}/annotations", response_model=AnnotationResponse, status_code=status.HTTP_201_CREATED)
async def add_annotation(defect_id: int, ann: AnnotationCreate, db: Session = Depends(get_db)):
    # ensure defect exists
    defect = await defects_service.get_defect(db, defect_id)
    if not defect:
        raise HTTPException(status_code=404, detail="Defect not found")

    return await defects_service.add_annotation(db, defect_id, ann)

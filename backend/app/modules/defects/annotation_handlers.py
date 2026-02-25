"""
Annotation handling utilities for defect updates.

Handles the complex logic of updating, adding, and modifying
annotations when a defect is updated.
"""

from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from .models import Defect, DefectAnnotation


def extract_annotation_fields(update_data: Dict[str, Any]) -> tuple:
    """
    Extract annotation-related fields from update payload.
    Returns:
        tuple: (category_id, color, new_annotations)
    """
    category_id = update_data.pop("category_id", None)
    color = update_data.pop("color", None)
    new_annotations = update_data.pop("annotations", None)
    return category_id, color, new_annotations


def update_existing_annotation_colors(defect: Defect, color: str) -> None:
    """Update color on all existing annotations of a defect."""
    if color is not None:
        for ann in defect.annotations:
            ann.color = color


def add_new_annotations(
    db: Session,
    defect_id: int,
    new_annotations: List[Dict[str, Any]],
    default_color: Optional[str] = None
) -> None:
    """
    Add new annotations to an existing defect.
    """
    if new_annotations is not None:
        for ann_data in new_annotations:
            db.add(
                DefectAnnotation(
                    defect_id=defect_id,
                    category_id=ann_data["category_id"],
                    geometry=ann_data["geometry"],
                    color=ann_data.get("color") or default_color,
                )
            )


def update_category_on_first_annotation(
    db: Session,
    defect_id: int,
    category_id: int,
    color: Optional[str] = None
) -> None:
    """
    Update category on the first annotation of a defect.
    Creates a new annotation if none exists.
    """
    annotation = (
        db.query(DefectAnnotation)
        .filter(DefectAnnotation.defect_id == defect_id)
        .first()
    )
    
    if annotation is not None:
        annotation.category_id = category_id
        if color is not None:
            annotation.color = color
    else:
        # Create new annotation if none exists
        db.add(
            DefectAnnotation(
                defect_id=defect_id,
                category_id=category_id,
                geometry={},
                color=color,
            )
        )


def handle_annotation_updates(
    db: Session,
    defect: Defect,
    defect_id: int,
    category_id: Optional[int],
    color: Optional[str],
    new_annotations: Optional[List[Dict[str, Any]]]
) -> None:
    """
    Orchestrate all annotation updates for a defect.
    Handles three scenarios:
    1. Update color on all existing annotations
    2. Add completely new annotations
    3. Update category on first annotation when only category_id is provided
    """
    # Update color on all existing annotations
    update_existing_annotation_colors(defect, color)
    
    # Add new annotations to existing ones
    if new_annotations is not None:
        add_new_annotations(db, defect_id, new_annotations, color)
    elif category_id is not None:
        # Update category on first annotation if only category_id was sent
        update_category_on_first_annotation(db, defect_id, category_id, color)

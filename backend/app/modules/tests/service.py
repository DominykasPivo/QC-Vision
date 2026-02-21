import logging
from datetime import datetime
from typing import List, Optional, Tuple

from fastapi import HTTPException
from sqlalchemy import String as SAString
from sqlalchemy import cast, or_
from sqlalchemy.orm import Session

from app.modules.photos.models import Photo
from app.modules.photos.storage import photo_storage

from .models import Tests
from .schemas import TestCreate, TestResponse

logger = logging.getLogger("backend_tests_service")


class TestsService:
    """
    Service layer for quality test management.
    """

    async def create_test(self, db: Session, test_data: TestCreate) -> TestResponse:
        test = Tests(
            product_id=test_data.product_id,
            test_type=test_data.test_type,
            requester=test_data.requester,
            assigned_to=test_data.assigned_to,
            description=test_data.description,
            status=test_data.status,
            deadline_at=test_data.deadline_at,
        )
        db.add(test)
        db.commit()
        db.refresh(test)
        return test

    async def get_test(self, db: Session, test_id: int) -> Optional[Tests]:
        return db.query(Tests).filter(Tests.id == test_id).first()

    async def get_all_tests(
        self, db: Session, skip: int = 0, limit: int = 100
    ) -> List[Tests]:
        return db.query(Tests).offset(skip).limit(limit).all()

    async def get_tests_paginated(
        self,
        db: Session,
        offset: int = 0,
        limit: int = 20,
        status: Optional[str] = None,
        search: Optional[str] = None,
    ) -> Tuple[List[Tests], int]:
        query = db.query(Tests)

        if status:
            query = query.filter(Tests.status == status)

        if search:
            pattern = f"%{search}%"
            query = query.filter(
                or_(
                    Tests.requester.ilike(pattern),
                    Tests.test_type.ilike(pattern),
                    Tests.assigned_to.ilike(pattern),
                    Tests.description.ilike(pattern),
                    cast(Tests.id, SAString).ilike(pattern),
                    cast(Tests.product_id, SAString).ilike(pattern),
                )
            )

        total = query.count()
        items = (
            query.order_by(Tests.created_at.desc()).offset(offset).limit(limit).all()
        )
        return items, total

    async def update_test(self, db: Session, test_id: int, test_data: dict) -> Tests:
        test = db.query(Tests).filter(Tests.id == test_id).first()
        if not test:
            raise HTTPException(status_code=404, detail="Test not found")

        for key, value in test_data.items():
            if hasattr(test, key):
                setattr(test, key, value)

        db.commit()
        db.refresh(test)
        return test

    async def delete_test(self, db: Session, test_id: int) -> None:
        test = db.query(Tests).filter(Tests.id == test_id).first()
        if not test:
            raise HTTPException(status_code=404, detail="Test not found")

        photos = db.query(Photo).filter(Photo.test_id == test_id).all()
        for photo in photos:
            try:
                await photo_storage.delete_photo(photo.file_path)
                logger.info("Deleted photo from MinIO: %s", photo.file_path)
            except Exception as e:
                logger.error(
                    "Failed to delete photo from MinIO: %s, Error: %s",
                    photo.file_path,
                    str(e),
                )

        db.query(Photo).filter(Photo.test_id == test_id).delete()
        db.delete(test)
        db.commit()

        logger.info("Deleted test %s with %s photo(s)", test_id, len(photos))

    # ✅ THIS MUST BE INSIDE THE CLASS
    async def review_test(
        self,
        db: Session,
        test_id: int,
        decision: str,
        reviewer: str,
        comment: Optional[str] = None,
    ):
        test = db.query(Tests).filter(Tests.id == test_id).first()
        if not test:
            raise HTTPException(status_code=404, detail="Test not found")

        decision_norm = (decision or "").lower().strip()

        if decision_norm in ("approved", "approve"):
            # Only set review fields if they exist in your model/table
            if hasattr(test, "review_status"):
                test.review_status = "approved"
            if hasattr(test, "reviewed_by"):
                test.reviewed_by = reviewer
            if hasattr(test, "reviewed_at"):
                test.reviewed_at = datetime.utcnow()
            if hasattr(test, "review_comment"):
                test.review_comment = comment

            db.commit()
            db.refresh(test)
            return test

        if decision_norm in ("rejected", "reject"):
            # ✅ delete test when rejected
            await self.delete_test(db, test_id)
            return {"detail": "Test rejected and removed"}

        raise HTTPException(
            status_code=400,
            detail="Decision must be approve/approved or reject/rejected",
        )


tests_service = TestsService()

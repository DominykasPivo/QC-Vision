import logging
from datetime import datetime
from typing import List, Optional, Tuple

from sqlalchemy import String as SAString
from sqlalchemy import cast, or_
from sqlalchemy.orm import Session

from app.modules.photos.storage import photo_storage  # noqa: F401

from .cleanup_utils import cleanup_test_photos
from .factory import TestFactory
from .models import Color, Tests
from .schemas import TestCreate

logger = logging.getLogger("backend_tests_service")


class TestsService:
    """
    Service layer for quality test management.
    """

    async def list_colors(self, db: Session) -> list[Color]:
        return (
            db.query(Color)
            .filter(Color.is_active == True)  # noqa: E712
            .order_by(Color.name)
            .all()
        )

    async def create_test(self, db: Session, test_data: TestCreate) -> Tests:
        test = TestFactory.build(db, test_data)
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
        limit: int = 12,
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
                    Tests.jira_id.ilike(pattern),
                    Tests.product_name.ilike(pattern),
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
            # ✅ unit tests expect ValueError
            raise ValueError("Test not found")

        if "color_ids" in test_data:
            color_ids = test_data.pop("color_ids")
            test.colors = db.query(Color).filter(Color.id.in_(color_ids)).all()

        for key, value in test_data.items():
            if hasattr(test, key):
                setattr(test, key, value)

        db.commit()
        db.refresh(test)
        return test

    async def delete_test(self, db: Session, test_id: int) -> None:
        """
        Delete a test and all related photos (DB rows + MinIO objects).

        This method ensures complete cleanup by:
        1. Deleting photos from MinIO storage
        2. Deleting photo database records
        3. Deleting the test record

        The photo cleanup is delegated to cleanup_utils to maintain
        separation of concerns and improve testability.
        """
        test = db.query(Tests).filter(Tests.id == test_id).first()
        if not test:
            raise ValueError("Test not found")

        # Delete all photos (storage + database)
        await cleanup_test_photos(db, test_id)

        # Delete test record
        db.delete(test)
        db.commit()

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
            raise ValueError("Test not found")

        if getattr(test, "review_status", None) in ("approved", "rejected"):
            raise ValueError("Test already reviewed")

        decision_norm = (decision or "").lower().strip()

        if decision_norm in ("approved", "approve"):
            test.review_status = "approved"  # type: ignore
        elif decision_norm in ("rejected", "reject"):
            test.review_status = "rejected"  # type: ignore
        else:
            raise ValueError("Invalid decision")

        # common fields
        if hasattr(test, "reviewed_by"):
            test.reviewed_by = reviewer  # type: ignore
        if hasattr(test, "reviewed_at"):
            test.reviewed_at = datetime.utcnow()  # type: ignore
        if hasattr(test, "review_comment"):
            test.review_comment = comment  # type: ignore

        db.commit()
        db.refresh(test)
        return test


tests_service = TestsService()

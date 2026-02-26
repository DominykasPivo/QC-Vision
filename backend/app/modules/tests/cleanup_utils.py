"""
Cleanup utilities for test deletion operations.

Handles cascading deletion of related resources when tests are removed,
including photos from both database and storage.
"""

import logging

from sqlalchemy.orm import Session

from app.modules.photos.models import Photo
from app.modules.photos.storage import photo_storage

logger = logging.getLogger("backend_tests_cleanup")


async def cleanup_test_photos(db: Session, test_id: int) -> None:
    """
    Delete all photos associated with a test from both storage and database.

    This function:
    1. Fetches all photos for the test
    2. Deletes them from MinIO storage (best-effort)
    3. Deletes them from the database in one operation

    Args:
        db: Database session
        test_id: ID of the test whose photos should be deleted

    Note:
        Storage deletion is best-effort - failures are logged but don't stop
        the database deletion. This ensures orphaned DB records are cleaned up
        even if storage cleanup fails.
    """
    # Fetch photos for storage cleanup
    photos = db.query(Photo).filter(Photo.test_id == test_id).all()

    # Delete from storage (best-effort)
    for photo in photos:
        try:
            if getattr(photo, "file_path", None):
                await photo_storage.delete_photo(photo.file_path)
        except Exception as e:
            logger.warning(
                f"Failed to delete from storage {getattr(photo, 'file_path', None)}: {e}"
            )

    # Delete photo rows in one operation
    # Note: This is important for unit tests that expect a single delete() call
    db.query(Photo).filter(Photo.test_id == test_id).delete()


def get_test_photo_count(db: Session, test_id: int) -> int:
    """
    Get the count of photos associated with a test.

    Args:
        db: Database session
        test_id: ID of the test

    Returns:
        Number of photos associated with the test
    """
    return db.query(Photo).filter(Photo.test_id == test_id).count()

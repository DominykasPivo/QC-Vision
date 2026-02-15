"""
Unit tests for TestsService – service logic verified in isolation via a
mocked database session.  No real database interaction takes place.

Every test asserts on *what the service tells the session to do* (add, delete,
commit, attribute mutations, storage calls) rather than on DB state.
"""

from datetime import datetime
from unittest.mock import MagicMock

import pytest

from app.modules.photos.models import Photo
from app.modules.tests.models import Tests
from app.modules.tests.schemas import TestCreate
from app.modules.tests.service import tests_service

# ---------------------------------------------------------------------------
# create_test
# ---------------------------------------------------------------------------


class TestCreateTest:
    async def test_all_fields_persisted(self, mock_db):
        data = TestCreate(
            product_id=103,
            test_type="final",
            requester="Dave",
            assigned_to="Eve",
            status="finalized",
            deadline_at=datetime(2026, 3, 15),
        )

        await tests_service.create_test(mock_db, data)

        mock_db.add.assert_called_once()
        added = mock_db.add.call_args[0][0]
        assert isinstance(added, Tests)
        assert added.product_id == 103
        assert added.test_type == "final"
        assert added.requester == "Dave"
        assert added.assigned_to == "Eve"
        assert added.status == "finalized"
        assert added.deadline_at == datetime(2026, 3, 15)
        mock_db.commit.assert_called_once()

    async def test_optional_fields_use_defaults(self, mock_db):
        data = TestCreate(product_id=104, test_type="incoming", requester="Mona")

        await tests_service.create_test(mock_db, data)

        added = mock_db.add.call_args[0][0]
        assert added.assigned_to is None
        assert added.status == "pending"
        assert added.deadline_at is None


# ---------------------------------------------------------------------------
# get_test
# ---------------------------------------------------------------------------


class TestGetTest:
    async def test_returns_existing_test(self, mock_db):
        test = MagicMock()
        mock_db.query.return_value.filter.return_value.first.return_value = test

        result = await tests_service.get_test(mock_db, 1)
        assert result is test

    async def test_returns_none_for_missing_test(self, mock_db):
        mock_db.query.return_value.filter.return_value.first.return_value = None
        assert await tests_service.get_test(mock_db, 9999) is None


# ---------------------------------------------------------------------------
# get_all_tests  –  skip / limit forwarding
# ---------------------------------------------------------------------------


class TestGetAllTests:
    async def test_pagination(self, mock_db):
        tests = [MagicMock(), MagicMock()]
        (
            mock_db.query.return_value.offset.return_value.limit.return_value.all.return_value
        ) = tests

        result = await tests_service.get_all_tests(mock_db, skip=2, limit=3)

        assert result == tests
        # Verify skip and limit were forwarded to the query chain
        mock_db.query.return_value.offset.assert_called_with(2)
        mock_db.query.return_value.offset.return_value.limit.assert_called_with(3)

    async def test_empty_database_returns_empty_list(self, mock_db):
        (
            mock_db.query.return_value.offset.return_value.limit.return_value.all.return_value
        ) = []

        assert await tests_service.get_all_tests(mock_db) == []


# ---------------------------------------------------------------------------
# update_test
# ---------------------------------------------------------------------------


class TestUpdateTest:
    async def test_updates_multiple_fields(self, mock_db):
        test = MagicMock()
        mock_db.query.return_value.filter.return_value.first.return_value = test

        updated = await tests_service.update_test(
            mock_db, 1, {"status": "in_progress", "assigned_to": "Bob"}
        )

        assert test.status == "in_progress"
        assert test.assigned_to == "Bob"
        mock_db.commit.assert_called_once()
        assert updated is test

    async def test_raises_valueerror_for_missing_test(self, mock_db):
        mock_db.query.return_value.filter.return_value.first.return_value = None

        with pytest.raises(ValueError, match="not found"):
            await tests_service.update_test(mock_db, 9999, {"status": "open"})


# ---------------------------------------------------------------------------
# delete_test  –  storage cleanup + row removal
# ---------------------------------------------------------------------------


class TestDeleteTest:
    async def test_removes_test_and_all_photos(self, mock_db, mock_photo_storage):
        test = MagicMock()
        photo1 = MagicMock()
        photo1.file_path = "/uploads/test1/photo1.jpg"
        photo2 = MagicMock()
        photo2.file_path = "/uploads/test1/photo2.jpg"

        # query(Tests) and query(Photo) need different chain results
        def _query(model):
            m = MagicMock()
            if model is Tests:
                m.filter.return_value.first.return_value = test
            elif model is Photo:
                m.filter.return_value.all.return_value = [photo1, photo2]
                m.filter.return_value.delete.return_value = 2
            return m

        mock_db.query.side_effect = _query

        await tests_service.delete_test(mock_db, 1)

        # Storage delete called once per photo with the correct path
        assert mock_photo_storage.delete_photo.call_count == 2
        mock_photo_storage.delete_photo.assert_any_await("/uploads/test1/photo1.jpg")
        mock_photo_storage.delete_photo.assert_any_await("/uploads/test1/photo2.jpg")

        # Test row itself deleted and transaction committed
        mock_db.delete.assert_called_once_with(test)
        mock_db.commit.assert_called_once()

    async def test_raises_valueerror_for_missing_test(self, mock_db):
        mock_db.query.return_value.filter.return_value.first.return_value = None

        with pytest.raises(ValueError, match="not found"):
            await tests_service.delete_test(mock_db, 9999)

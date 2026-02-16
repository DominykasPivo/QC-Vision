"""
Unit tests for DefectsService – service logic verified in isolation via a
mocked database session.  No real database interaction takes place.

Every test asserts on *what the service tells the session to do* (add, delete,
commit, attribute mutations) rather than on DB state.  Cascade behaviour and
relationship loading are database concerns and remain covered by the
integration tests.
"""

from unittest.mock import MagicMock

import pytest

from app.modules.defects.models import Defect, DefectAnnotation
from app.modules.defects.schemas import AnnotationCreate, DefectCreate, DefectUpdate
from app.modules.defects.service import defects_service


# ---------------------------------------------------------------------------
# create_defect_for_photo
# ---------------------------------------------------------------------------


class TestCreateDefect:
    async def test_defect_with_two_annotations_stored(self, mock_db):
        # flush() must assign a primary-key so the annotations pick it up
        def _flush():
            for call in mock_db.add.call_args_list:
                obj = call[0][0]
                if isinstance(obj, Defect) and obj.id is None:
                    obj.id = 1

        mock_db.flush.side_effect = _flush

        payload = DefectCreate(
            category_id=10,
            description="Ink smear on logo print",
            severity="high",
            annotations=[
                AnnotationCreate(
                    category_id=10,
                    geometry={
                        "type": "rectangle",
                        "x": 0.42,
                        "y": 0.55,
                        "w": 0.15,
                        "h": 0.12,
                    },
                ),
                AnnotationCreate(
                    category_id=10,
                    geometry={"type": "circle", "cx": 0.52, "cy": 0.72, "r": 0.05},
                ),
            ],
        )

        result = await defects_service.create_defect_for_photo(mock_db, 42, payload)

        # Returned object carries the fields the service set
        assert result.photo_id == 42
        assert result.description == "Ink smear on logo print"
        assert result.severity == "high"

        # 1 Defect + 2 annotations added; flush & commit each called once
        assert mock_db.add.call_count == 3
        mock_db.flush.assert_called_once()
        mock_db.commit.assert_called_once()

        # Verify the two annotation objects carry the right data
        added = [c[0][0] for c in mock_db.add.call_args_list]
        annotations = [o for o in added if isinstance(o, DefectAnnotation)]
        assert len(annotations) == 2
        assert all(a.defect_id == 1 for a in annotations)
        assert {a.geometry["type"] for a in annotations} == {"rectangle", "circle"}

    async def test_defect_without_annotations(self, mock_db):
        payload = DefectCreate(category_id=10, severity="low")

        result = await defects_service.create_defect_for_photo(mock_db, 42, payload)

        assert result.severity == "low"
        # Only the Defect row itself is added – no annotations
        assert mock_db.add.call_count == 1
        assert isinstance(mock_db.add.call_args[0][0], Defect)


# ---------------------------------------------------------------------------
# list_defects_for_photo  –  filtering & isolation
# ---------------------------------------------------------------------------


class TestListDefects:
    async def test_returns_only_defects_belonging_to_given_photo(self, mock_db):
        defects = [MagicMock(), MagicMock()]
        (
            mock_db.query.return_value.options.return_value.filter.return_value.order_by.return_value.all.return_value
        ) = defects

        result = await defects_service.list_defects_for_photo(mock_db, 7)

        assert result == defects
        mock_db.query.assert_called_with(Defect)

        # Verify the filter clause targets the correct column and value
        filter_call = mock_db.query.return_value.options.return_value.filter
        filter_call.assert_called_once()
        clause = filter_call.call_args[0][0]
        assert clause.left.key == "photo_id"
        assert clause.right.value == 7

    async def test_empty_for_photo_with_no_defects(self, mock_db):
        (
            mock_db.query.return_value.options.return_value.filter.return_value.order_by.return_value.all.return_value
        ) = []

        assert await defects_service.list_defects_for_photo(mock_db, 99) == []


# ---------------------------------------------------------------------------
# get_defect
# ---------------------------------------------------------------------------


class TestGetDefect:
    async def test_returns_existing_defect(self, mock_db):
        defect = MagicMock()
        defect.id = 5
        mock_db.query.return_value.filter.return_value.first.return_value = defect

        fetched = await defects_service.get_defect(mock_db, 5)
        assert fetched is defect

    async def test_returns_none_for_missing_defect(self, mock_db):
        mock_db.query.return_value.filter.return_value.first.return_value = None
        assert await defects_service.get_defect(mock_db, 9999) is None


# ---------------------------------------------------------------------------
# add_annotation
# ---------------------------------------------------------------------------


class TestAddAnnotation:
    async def test_annotation_is_linked_to_defect(self, mock_db):
        geometry = {
            "type": "polygon",
            "points": [
                {"x": 0.10, "y": 0.20},
                {"x": 0.30, "y": 0.25},
                {"x": 0.25, "y": 0.45},
            ],
        }

        await defects_service.add_annotation(
            mock_db, 10, AnnotationCreate(category_id=3, geometry=geometry)
        )

        mock_db.add.assert_called_once()
        added = mock_db.add.call_args[0][0]
        assert isinstance(added, DefectAnnotation)
        assert added.defect_id == 10
        assert added.category_id == 3
        assert added.geometry["type"] == "polygon"
        assert len(added.geometry["points"]) == 3
        mock_db.commit.assert_called_once()


# ---------------------------------------------------------------------------
# update_defect  –  partial updates & category side-effect
# ---------------------------------------------------------------------------


class TestUpdateDefect:
    async def test_update_severity_only(self, mock_db):
        defect = MagicMock(severity="low")
        mock_db.query.return_value.options.return_value.filter.return_value.first.return_value = defect

        updated = await defects_service.update_defect(
            mock_db, 1, DefectUpdate(severity="critical")
        )

        assert defect.severity == "critical"
        mock_db.commit.assert_called_once()
        assert updated is defect

    async def test_returns_none_for_missing_defect(self, mock_db):
        mock_db.query.return_value.options.return_value.filter.return_value.first.return_value = None

        result = await defects_service.update_defect(
            mock_db, 9999, DefectUpdate(severity="low")
        )
        assert result is None

    async def test_update_category_id_changes_first_annotation(self, mock_db):
        """When category_id is supplied and an annotation already exists,
        the *first* annotation's category_id is overwritten."""
        defect = MagicMock()
        annotation = MagicMock()

        def _query(model):
            m = MagicMock()
            if model is Defect:
                m.filter.return_value.first.return_value = defect
            elif model is DefectAnnotation:
                m.filter.return_value.first.return_value = annotation
            return m

        mock_db.query.side_effect = _query

        await defects_service.update_defect(mock_db, 1, DefectUpdate(category_id=5))

        assert annotation.category_id == 5
        mock_db.add.assert_not_called()  # existing annotation updated, none created

    async def test_update_category_id_creates_annotation_when_none_exist(self, mock_db):
        """When no annotation exists yet, one is created with empty geometry."""
        defect = MagicMock()

        def _query(model):
            m = MagicMock()
            if model is Defect:
                m.filter.return_value.first.return_value = defect
            elif model is DefectAnnotation:
                m.filter.return_value.first.return_value = None
            return m

        mock_db.query.side_effect = _query

        await defects_service.update_defect(mock_db, 1, DefectUpdate(category_id=5))

        mock_db.add.assert_called_once()
        added = mock_db.add.call_args[0][0]
        assert isinstance(added, DefectAnnotation)
        assert added.category_id == 5
        assert added.geometry == {}


# ---------------------------------------------------------------------------
# delete_defect  –  removal & not-found path
# ---------------------------------------------------------------------------


class TestDeleteDefect:
    async def test_deletes_existing_defect(self, mock_db):
        defect = MagicMock()
        mock_db.query.return_value.filter.return_value.first.return_value = defect

        success = await defects_service.delete_defect(mock_db, 1)
        assert success is True
        mock_db.delete.assert_called_once_with(defect)
        mock_db.commit.assert_called_once()

    async def test_returns_false_for_missing_defect(self, mock_db):
        mock_db.query.return_value.filter.return_value.first.return_value = None
        assert await defects_service.delete_defect(mock_db, 9999) is False
        mock_db.delete.assert_not_called()

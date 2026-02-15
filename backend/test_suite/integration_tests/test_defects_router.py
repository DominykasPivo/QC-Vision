"""
Integration tests for the Defects module API  (/api/v1/defects/...).

Data is seeded directly into the in-memory SQLite session that the
TestClient shares, so every HTTP request in a test sees the same rows.

DefectResponse / AnnotationResponse / CategoryResponse have no Field
aliases, so their JSON keys match the Python field names exactly.
"""

import pytest

from app.modules.defects.models import DefectCategory
from app.modules.photos.models import Photo
from app.modules.tests.models import Tests

# ---------------------------------------------------------------------------
# Seed helper
# ---------------------------------------------------------------------------


def _seed(db):
    """Insert minimum required rows.  Returns (test_id, photo_id, category_id)."""
    t = Tests(product_id=101, test_type="incoming", requester="Alice", status="open")
    db.add(t)
    db.flush()
    p = Photo(test_id=t.id, file_path="/uploads/test1/photo1.jpg")
    cat = DefectCategory(name="Print Errors", is_active=True)
    db.add_all([p, cat])
    db.commit()
    db.refresh(p)
    db.refresh(cat)
    return t.id, p.id, cat.id


# ---------------------------------------------------------------------------
# GET /api/v1/defects/categories
# ---------------------------------------------------------------------------


class TestCategoriesRoute:
    def test_returns_all_categories_including_inactive(self, client, db_session):
        db_session.add_all(
            [
                DefectCategory(name="Incorrect Colors", is_active=True),
                DefectCategory(name="Damage", is_active=True),
                DefectCategory(name="Print Errors", is_active=True),
                DefectCategory(name="Embroidery Issues", is_active=True),
                DefectCategory(name="Other", is_active=False),
            ]
        )
        db_session.commit()

        resp = client.get("/api/v1/defects/categories")
        assert resp.status_code == 200
        names = {c["name"] for c in resp.json()}
        assert names == {
            "Incorrect Colors",
            "Damage",
            "Print Errors",
            "Embroidery Issues",
            "Other",
        }


# ---------------------------------------------------------------------------
# POST /api/v1/defects/photo/{photo_id}
# ---------------------------------------------------------------------------


class TestCreateDefectRoute:
    def test_201_with_annotation(self, client, db_session):
        _test_id, photo_id, cat_id = _seed(db_session)
        resp = client.post(
            f"/api/v1/defects/photo/{photo_id}",
            json={
                "category_id": cat_id,
                "description": "Ink smear on logo print",
                "severity": "high",
                "annotations": [
                    {
                        "category_id": cat_id,
                        "geometry": {
                            "type": "circle",
                            "cx": 0.42,
                            "cy": 0.55,
                            "r": 0.08,
                        },
                    }
                ],
            },
        )
        assert resp.status_code == 201

        body = resp.json()
        assert body["severity"] == "high"
        assert body["description"] == "Ink smear on logo print"
        assert len(body["annotations"]) == 1
        assert body["annotations"][0]["geometry"]["type"] == "circle"

    def test_201_without_annotations(self, client, db_session):
        _test_id, photo_id, cat_id = _seed(db_session)
        resp = client.post(
            f"/api/v1/defects/photo/{photo_id}",
            json={"category_id": cat_id, "severity": "low"},
        )
        assert resp.status_code == 201
        assert resp.json()["annotations"] == []


# ---------------------------------------------------------------------------
# GET /api/v1/defects/{defect_id}
# ---------------------------------------------------------------------------


class TestGetDefectRoute:
    def test_returns_existing_defect(self, client, db_session):
        _test_id, photo_id, cat_id = _seed(db_session)
        created = client.post(
            f"/api/v1/defects/photo/{photo_id}",
            json={"category_id": cat_id, "severity": "medium"},
        ).json()

        resp = client.get(f"/api/v1/defects/{created['id']}")
        assert resp.status_code == 200
        assert resp.json()["id"] == created["id"]

    def test_404_for_nonexistent_defect(self, client):
        assert client.get("/api/v1/defects/9999").status_code == 404


# ---------------------------------------------------------------------------
# GET /api/v1/defects/photo/{photo_id}  –  listing by photo
# ---------------------------------------------------------------------------


class TestListDefectsRoute:
    def test_returns_only_defects_for_requested_photo(self, client, db_session):
        test_id, photo_id, cat_id = _seed(db_session)

        # Second photo on the same test
        photo2 = Photo(test_id=test_id, file_path="/uploads/test1/photo2.jpg")
        db_session.add(photo2)
        db_session.commit()
        db_session.refresh(photo2)

        # 2 defects → photo_id  |  1 defect → photo2
        for _ in range(2):
            client.post(
                f"/api/v1/defects/photo/{photo_id}",
                json={"category_id": cat_id, "severity": "low"},
            )
        client.post(
            f"/api/v1/defects/photo/{photo2.id}",
            json={"category_id": cat_id, "severity": "high"},
        )

        resp = client.get(f"/api/v1/defects/photo/{photo_id}")
        assert resp.status_code == 200
        assert len(resp.json()) == 2


# ---------------------------------------------------------------------------
# POST /api/v1/defects/{defect_id}/annotations
# ---------------------------------------------------------------------------


class TestAddAnnotationRoute:
    def test_add_annotation(self, client, db_session):
        _test_id, photo_id, cat_id = _seed(db_session)
        defect_id = client.post(
            f"/api/v1/defects/photo/{photo_id}",
            json={"category_id": cat_id, "severity": "low"},
        ).json()["id"]

        # Success case
        resp = client.post(
            f"/api/v1/defects/{defect_id}/annotations",
            json={
                "category_id": cat_id,
                "geometry": {"type": "circle", "cx": 0.52, "cy": 0.72, "r": 0.05},
            },
        )
        assert resp.status_code == 201
        assert resp.json()["defect_id"] == defect_id

        # 404 when parent defect missing
        resp = client.post(
            "/api/v1/defects/9999/annotations",
            json={
                "category_id": cat_id,
                "geometry": {
                    "type": "rectangle",
                    "x": 0.60,
                    "y": 0.20,
                    "w": 0.18,
                    "h": 0.15,
                },
            },
        )
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# PUT /api/v1/defects/{defect_id}
# ---------------------------------------------------------------------------


class TestUpdateDefectRoute:
    def test_update_defect(self, client, db_session):
        _test_id, photo_id, cat_id = _seed(db_session)
        defect_id = client.post(
            f"/api/v1/defects/photo/{photo_id}",
            json={"category_id": cat_id, "severity": "low"},
        ).json()["id"]

        # Success
        resp = client.put(f"/api/v1/defects/{defect_id}", json={"severity": "critical"})
        assert resp.status_code == 200
        assert resp.json()["severity"] == "critical"

        # 404 for nonexistent
        resp = client.put("/api/v1/defects/9999", json={"severity": "low"})
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# DELETE /api/v1/defects/{defect_id}
# ---------------------------------------------------------------------------


class TestDeleteDefectRoute:
    def test_delete_defect(self, client, db_session):
        _test_id, photo_id, cat_id = _seed(db_session)
        defect_id = client.post(
            f"/api/v1/defects/photo/{photo_id}",
            json={"category_id": cat_id, "severity": "low"},
        ).json()["id"]

        # Successful deletion
        assert client.delete(f"/api/v1/defects/{defect_id}").status_code == 204
        assert client.get(f"/api/v1/defects/{defect_id}").status_code == 404

        # 404 for nonexistent
        assert client.delete("/api/v1/defects/9999").status_code == 404

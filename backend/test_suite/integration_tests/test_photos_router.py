"""
Integration tests for the Photos module API  (/api/v1/photos/...).

Data is seeded directly into the in-memory SQLite session that the
TestClient shares.  MinIO is replaced by the ``mock_photo_storage`` stub
wired into the ``client`` fixture.  Upload tests send real JPEG images
(generated in-memory via PIL) so that PhotoService validation and
processing run end-to-end.
"""

from io import BytesIO

from PIL import Image

from app.modules.photos.models import Photo
from app.modules.tests.models import Tests

# ---------------------------------------------------------------------------
# Seed helpers
# ---------------------------------------------------------------------------


def _seed_test(db):
    """Insert a Tests row and return its id."""
    t = Tests(gyra_id="GY-101", product_name="Test Product", test_type="incoming", requester="Alice", status="open")
    db.add(t)
    db.commit()
    db.refresh(t)
    return t.id


def _make_jpeg(width: int = 100, height: int = 100) -> BytesIO:
    """Create a valid in-memory JPEG and return the buffer seeked to 0."""
    img = Image.new("RGB", (width, height), (128, 64, 32))
    buf = BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)
    return buf


# ---------------------------------------------------------------------------
# POST /api/v1/photos/upload
# ---------------------------------------------------------------------------


class TestUploadPhotoRoute:
    def test_upload_valid_jpeg(self, client, db_session, mock_photo_storage):
        test_id = _seed_test(db_session)

        resp = client.post(
            f"/api/v1/photos/upload?test_id={test_id}",
            files={"file": ("sample.jpg", _make_jpeg(), "image/jpeg")},
        )
        assert resp.status_code == 201

        body = resp.json()
        assert body["test_id"] == test_id
        assert body["file_path"].startswith("photos/")
        mock_photo_storage.upload_photo.assert_awaited_once()

    def test_rejects_non_image_content_type(self, client, db_session):
        test_id = _seed_test(db_session)

        resp = client.post(
            f"/api/v1/photos/upload?test_id={test_id}",
            files={"file": ("doc.txt", BytesIO(b"hello"), "text/plain")},
        )
        assert resp.status_code == 400

    def test_rejects_empty_file(self, client, db_session):
        test_id = _seed_test(db_session)

        resp = client.post(
            f"/api/v1/photos/upload?test_id={test_id}",
            files={"file": ("empty.jpg", BytesIO(b""), "image/jpeg")},
        )
        assert resp.status_code == 400

    def test_rejects_corrupted_image(self, client, db_session):
        test_id = _seed_test(db_session)

        resp = client.post(
            f"/api/v1/photos/upload?test_id={test_id}",
            files={"file": ("bad.jpg", BytesIO(b"not an image at all"), "image/jpeg")},
        )
        assert resp.status_code == 400


# ---------------------------------------------------------------------------
# GET /api/v1/photos/test/{test_id}
# ---------------------------------------------------------------------------


class TestListPhotosRoute:
    def test_returns_photos_for_test(self, client, db_session):
        test_id = _seed_test(db_session)
        db_session.add_all(
            [
                Photo(test_id=test_id, file_path="/uploads/p1.jpg"),
                Photo(test_id=test_id, file_path="/uploads/p2.jpg"),
            ]
        )
        db_session.commit()

        resp = client.get(f"/api/v1/photos/test/{test_id}")
        assert resp.status_code == 200
        assert len(resp.json()) == 2

    def test_returns_empty_for_test_with_no_photos(self, client, db_session):
        test_id = _seed_test(db_session)

        resp = client.get(f"/api/v1/photos/test/{test_id}")
        assert resp.status_code == 200
        assert resp.json() == []


# ---------------------------------------------------------------------------
# GET /api/v1/photos/{photo_id}/image
# ---------------------------------------------------------------------------


class TestGetPhotoImageRoute:
    def test_returns_image_data(self, client, db_session, mock_photo_storage):
        test_id = _seed_test(db_session)
        photo = Photo(test_id=test_id, file_path="/uploads/p1.jpg")
        db_session.add(photo)
        db_session.commit()
        db_session.refresh(photo)

        resp = client.get(f"/api/v1/photos/{photo.id}/image")
        assert resp.status_code == 200
        assert resp.headers["content-type"] == "image/jpeg"
        mock_photo_storage.get_photo.assert_awaited_once_with("/uploads/p1.jpg")

    def test_404_for_nonexistent_photo(self, client):
        assert client.get("/api/v1/photos/9999/image").status_code == 404


# ---------------------------------------------------------------------------
# DELETE /api/v1/photos/{photo_id}
# ---------------------------------------------------------------------------


class TestDeletePhotoRoute:
    def test_204_and_row_is_gone(self, client, db_session, mock_photo_storage):
        test_id = _seed_test(db_session)
        photo = Photo(test_id=test_id, file_path="/uploads/p1.jpg")
        db_session.add(photo)
        db_session.commit()
        db_session.refresh(photo)

        assert client.delete(f"/api/v1/photos/{photo.id}").status_code == 204
        mock_photo_storage.delete_photo.assert_awaited_once_with("/uploads/p1.jpg")

        # Row is gone – subsequent URL lookup returns 404
        assert client.get(f"/api/v1/photos/{photo.id}/url").status_code == 404

    def test_404_for_nonexistent_photo(self, client):
        assert client.delete("/api/v1/photos/9999").status_code == 404


# ---------------------------------------------------------------------------
# GET /api/v1/photos/gallery  –  pagination & filters
# ---------------------------------------------------------------------------


class TestGalleryRoute:
    def _seed_gallery_data(self, db_session):
        """
        Create comprehensive test data for gallery filtering tests.
        Returns dict with test_ids, photo_ids, and category_ids for assertions.
        """
        from app.modules.defects.models import Defect, DefectAnnotation, DefectCategory

        # Create categories
        cat_print = DefectCategory(name="Print Errors", is_active=True)
        cat_damage = DefectCategory(name="Damage", is_active=True)
        db_session.add_all([cat_print, cat_damage])
        db_session.flush()

        # Create tests with different types and statuses
        test_incoming_open = Tests(
            gyra_id="GY-100",
            product_name="T-Shirt A",
            test_type="incoming",
            requester="Alice",
            status="open",
        )
        test_final_progress = Tests(
            gyra_id="GY-101",
            product_name="Hoodie B",
            test_type="final",
            requester="Bob",
            status="in_progress",
        )
        db_session.add_all([test_incoming_open, test_final_progress])
        db_session.flush()

        # Create photos with different verification statuses
        photo1 = Photo(
            test_id=test_incoming_open.id,
            file_path="/test1/p1.jpg",
            verification_status="pending",
        )
        photo2 = Photo(
            test_id=test_final_progress.id,
            file_path="/test2/p2.jpg",
            verification_status="approved",
        )
        photo3 = Photo(
            test_id=test_incoming_open.id,
            file_path="/test1/p3.jpg",
            verification_status="pending",
        )
        db_session.add_all([photo1, photo2, photo3])
        db_session.flush()

        # Create defects with varying severities
        # Photo 1: High severity print defect
        defect1 = Defect(photo_id=photo1.id, description="Print smear", severity="high")
        db_session.add(defect1)
        db_session.flush()
        db_session.add(
            DefectAnnotation(
                defect_id=defect1.id,
                category_id=cat_print.id,
                geometry={"type": "circle", "cx": 0.5, "cy": 0.5, "r": 0.1},
            )
        )

        # Photo 2: Critical damage defect
        defect2 = Defect(photo_id=photo2.id, description="Torn fabric", severity="critical")
        db_session.add(defect2)
        db_session.flush()
        db_session.add(
            DefectAnnotation(
                defect_id=defect2.id,
                category_id=cat_damage.id,
                geometry={"type": "rect", "x": 0.2, "y": 0.3, "w": 0.4, "h": 0.3},
            )
        )

        # Photo 3: No defects
        db_session.commit()

        return {
            "test_ids": {
                "incoming_open": test_incoming_open.id,
                "final_progress": test_final_progress.id,
            },
            "photo_ids": {
                "p1_high": photo1.id,
                "p2_critical": photo2.id,
                "p3_none": photo3.id,
            },
            "category_ids": {"print": cat_print.id, "damage": cat_damage.id},
        }

    def test_gallery_pagination(self, client, db_session):
        """Test that gallery endpoint returns paginated results with correct total count."""
        self._seed_gallery_data(db_session)

        # Default pagination
        resp = client.get("/api/v1/photos/gallery")
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "total" in data
        assert data["total"] == 3

        # Page with 2 items per page
        resp = client.get("/api/v1/photos/gallery?page=1&page_size=2")
        data = resp.json()
        assert len(data["items"]) == 2
        assert data["total"] == 3

    def test_gallery_filter_by_severity_and_test_type(self, client, db_session):
        """Test filtering gallery by defect severity and test type."""
        ids = self._seed_gallery_data(db_session)

        # Filter by critical severity
        resp = client.get("/api/v1/photos/gallery?severity=critical")
        data = resp.json()
        assert data["total"] == 1
        assert data["items"][0]["id"] == ids["photo_ids"]["p2_critical"]
        assert data["items"][0]["highest_severity"] == "critical"

        # Filter by incoming test type
        resp = client.get("/api/v1/photos/gallery?test_type=incoming")
        data = resp.json()
        assert data["total"] == 2  # photos 1 and 3
        assert all(item["test_type"] == "incoming" for item in data["items"])

    def test_gallery_filter_by_has_defects(self, client, db_session):
        """Test filtering gallery by presence of defects."""
        ids = self._seed_gallery_data(db_session)

        # Filter for photos WITH defects
        resp = client.get("/api/v1/photos/gallery?has_defects=true")
        data = resp.json()
        assert data["total"] == 2  # photos 1, 2 have defects
        assert all(item["defect_count"] > 0 for item in data["items"])

        # Filter for photos WITHOUT defects
        resp = client.get("/api/v1/photos/gallery?has_defects=false")
        data = resp.json()
        assert data["total"] == 1  # photo 3 has no defects
        assert data["items"][0]["id"] == ids["photo_ids"]["p3_none"]
        assert data["items"][0]["defect_count"] == 0


# ---------------------------------------------------------------------------
# PATCH /api/v1/photos/{photo_id}/verification
# ---------------------------------------------------------------------------


class TestPhotoVerificationRoute:
    def test_update_verification_status(self, client, db_session):
        """Test updating photo verification status."""
        test_id = _seed_test(db_session)
        photo = Photo(test_id=test_id, file_path="/uploads/p1.jpg", verification_status="pending")
        db_session.add(photo)
        db_session.commit()
        db_session.refresh(photo)

        # Approve photo
        resp = client.patch(
            f"/api/v1/photos/{photo.id}/verification",
            json={"verification_status": "approved"},
        )
        assert resp.status_code == 200
        assert resp.json()["verification_status"] == "approved"

        # Reject photo
        resp = client.patch(
            f"/api/v1/photos/{photo.id}/verification",
            json={"verification_status": "rejected"},
        )
        assert resp.status_code == 200
        assert resp.json()["verification_status"] == "rejected"



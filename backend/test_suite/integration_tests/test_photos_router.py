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
    t = Tests(product_id=101, test_type="incoming", requester="Alice", status="open")
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
# GET /api/v1/photos/{photo_id}/url
# ---------------------------------------------------------------------------


class TestGetPhotoUrlRoute:
    def test_returns_url(self, client, db_session, mock_photo_storage):
        test_id = _seed_test(db_session)
        photo = Photo(test_id=test_id, file_path="/uploads/p1.jpg")
        db_session.add(photo)
        db_session.commit()
        db_session.refresh(photo)

        resp = client.get(f"/api/v1/photos/{photo.id}/url")
        assert resp.status_code == 200
        assert resp.json()["expires_in"] == 3600
        mock_photo_storage.generate_presigned_url.assert_called_once_with(
            "/uploads/p1.jpg", expiration=3600
        )

    def test_404_for_nonexistent_photo(self, client):
        assert client.get("/api/v1/photos/9999/url").status_code == 404


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

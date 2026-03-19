"""
Unit tests for CameraService – service logic verified in isolation via a
mocked database session.  No real database interaction takes place.

Cameras are registered manually via SQL/NocoDB, so there are no registration
or modification service methods to test. We test listing and retrieval logic.
"""

from unittest.mock import MagicMock

from app.modules.camera.models import CameraDevice
from app.modules.camera.service import camera_service

# ---------------------------------------------------------------------------
# list_cameras
# ---------------------------------------------------------------------------


class TestListCameras:
    def test_list_all_cameras_without_filter(self, mock_db):
        """List all cameras when no type filter is provided."""
        cameras = [
            MagicMock(name="Browser Cam", type="browser"),
            MagicMock(name="RTSP Cam", type="rtsp"),
            MagicMock(name="DroidCam", type="droidcam"),
        ]
        mock_db.query.return_value.order_by.return_value.all.return_value = cameras

        result = camera_service.list_cameras(mock_db, camera_type=None)

        assert result == cameras
        assert len(result) == 3
        mock_db.query.assert_called_with(CameraDevice)

    def test_list_cameras_with_type_filter(self, mock_db):
        """List cameras filtered by type using mocked query chain."""
        cameras = [
            MagicMock(name="RTSP Cam 1", type="rtsp"),
            MagicMock(name="RTSP Cam 2", type="rtsp"),
        ]
        (
            mock_db.query.return_value.filter.return_value.order_by.return_value.all.return_value
        ) = cameras

        result = camera_service.list_cameras(mock_db, camera_type="rtsp")

        assert result == cameras
        mock_db.query.assert_called_with(CameraDevice)

        # Verify filter was applied
        filter_call = mock_db.query.return_value.filter
        filter_call.assert_called_once()
        clause = filter_call.call_args[0][0]
        assert clause.left.key == "type"
        assert clause.right.value == "rtsp"


# ---------------------------------------------------------------------------
# get_camera
# ---------------------------------------------------------------------------


class TestGetCamera:
    def test_returns_existing_camera(self, mock_db):
        """Retrieve camera by ID from database."""
        camera = MagicMock(spec=CameraDevice)
        camera.id = 42
        camera.name = "Test Camera"
        mock_db.query.return_value.filter.return_value.first.return_value = camera

        result = camera_service.get_camera(mock_db, 42)

        assert result is camera
        assert result.id == 42
        mock_db.query.assert_called_with(CameraDevice)

    def test_returns_none_for_missing_camera(self, mock_db):
        """Return None when camera doesn't exist."""
        mock_db.query.return_value.filter.return_value.first.return_value = None

        result = camera_service.get_camera(mock_db, 9999)

        assert result is None

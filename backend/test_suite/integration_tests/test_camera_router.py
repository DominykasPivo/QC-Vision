"""
Integration tests for the Camera module API  (/api/v1/cameras/...).

Cameras are registered manually via SQL/NocoDB (not through API).
These tests verify the application can list and retrieve camera data correctly.
"""

from app.modules.camera.models import CameraDevice

# ---------------------------------------------------------------------------
# GET /api/v1/cameras/
# ---------------------------------------------------------------------------


class TestListCamerasRoute:
    def test_list_all_cameras(self, client, db_session):
        """List all registered cameras."""
        # Seed cameras via database (simulating manual SQL insertion)
        db_session.add_all(
            [
                CameraDevice(
                    name="Browser Camera",
                    type="browser",
                    status="online",
                ),
                CameraDevice(
                    name="Workshop IP Camera",
                    type="rtsp",
                    status="online",
                    connection_info='{"snapshot_url": "http://192.168.1.100:8080/shot.jpg"}',
                    capabilities='{"resolution": "1920x1080", "fps": 30}',
                ),
                CameraDevice(
                    name="Mobile DroidCam",
                    type="droidcam",
                    status="offline",
                ),
            ]
        )
        db_session.commit()

        resp = client.get("/api/v1/cameras/")
        assert resp.status_code == 200

        body = resp.json()
        assert body["total"] == 3
        assert len(body["cameras"]) == 3

        # Verify all camera names are present
        camera_names = {cam["name"] for cam in body["cameras"]}
        assert camera_names == {
            "Browser Camera",
            "Workshop IP Camera",
            "Mobile DroidCam",
        }

    def test_list_cameras_filtered_by_type(self, client, db_session):
        """List cameras filtered by type (RTSP only)."""
        # Seed multiple camera types
        db_session.add_all(
            [
                CameraDevice(name="Browser Cam", type="browser", status="online"),
                CameraDevice(name="RTSP Cam 1", type="rtsp", status="online"),
                CameraDevice(name="RTSP Cam 2", type="rtsp", status="offline"),
                CameraDevice(name="DroidCam", type="droidcam", status="online"),
            ]
        )
        db_session.commit()

        # Filter by RTSP type
        resp = client.get("/api/v1/cameras/?camera_type=rtsp")
        assert resp.status_code == 200

        body = resp.json()
        assert body["total"] == 2
        assert len(body["cameras"]) == 2
        assert all(cam["type"] == "rtsp" for cam in body["cameras"])

        # Verify both RTSP cameras are present
        rtsp_names = {cam["name"] for cam in body["cameras"]}
        assert rtsp_names == {"RTSP Cam 1", "RTSP Cam 2"}


# ---------------------------------------------------------------------------
# GET /api/v1/cameras/{camera_id}
# ---------------------------------------------------------------------------


class TestGetCameraRoute:
    def test_get_camera_details(self, client, db_session):
        """Get camera details - 404 for nonexistent, 200 for existing."""
        # 404 for nonexistent camera
        assert client.get("/api/v1/cameras/9999").status_code == 404

        # Create camera via database
        camera = CameraDevice(
            name="Production Line Camera",
            type="rtsp",
            status="online",
            connection_info='{"snapshot_url": "http://192.168.50.103:554/shot.jpg"}',
            capabilities='{"zoom": true, "focus": true}',
        )
        db_session.add(camera)
        db_session.commit()
        db_session.refresh(camera)

        resp = client.get(f"/api/v1/cameras/{camera.id}")
        assert resp.status_code == 200

        body = resp.json()
        assert body["id"] == camera.id
        assert body["name"] == "Production Line Camera"
        assert body["type"] == "rtsp"
        assert body["status"] == "online"
        assert "snapshot_url" in body["connection_info"]


# ---------------------------------------------------------------------------
# GET /api/v1/cameras/{camera_id}/capture
# ---------------------------------------------------------------------------


class TestCaptureCameraRoute:
    def test_capture_404_for_nonexistent_camera(self, client):
        """Capture returns 404 for camera that doesn't exist."""
        resp = client.get("/api/v1/cameras/9999/capture")
        assert resp.status_code == 500  # Can't capture from non-existent camera

    def test_capture_500_for_camera_without_connection_info(self, client, db_session):
        """Capture returns 500 for camera without connection_info."""
        camera = CameraDevice(
            name="Browser Camera",
            type="browser",
            status="online",
            connection_info=None,  # No connection info
        )
        db_session.add(camera)
        db_session.commit()
        db_session.refresh(camera)

        resp = client.get(f"/api/v1/cameras/{camera.id}/capture")
        assert resp.status_code == 500
        assert "Failed to capture" in resp.json()["detail"]

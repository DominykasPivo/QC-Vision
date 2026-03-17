"""
Camera service layer - business logic for camera operations
"""

import json
import logging
from typing import List, Optional

import cv2
import numpy as np
import requests
from sqlalchemy.orm import Session

from .models import CameraDevice

logger = logging.getLogger("backend_camera_service")


class CameraService:
    """
    Service layer for camera device management.

    Cameras are registered manually via SQL/NocoDB.
    This service handles listing and capturing from registered cameras.
    """

    def list_cameras(
        self, db: Session, camera_type: Optional[str] = None
    ) -> List[CameraDevice]:
        """
        List all registered cameras, optionally filtered by type.

        Args:
            db: Database session
            camera_type: Optional filter by camera type

        Returns:
            List of CameraDevice instances
        """
        query = db.query(CameraDevice)
        if camera_type:
            query = query.filter(CameraDevice.type == camera_type)
        return query.order_by(CameraDevice.created_at.desc()).all()

    def get_camera(self, db: Session, camera_id: int) -> Optional[CameraDevice]:
        """
        Retrieve a camera by ID.

        Args:
            db: Database session
            camera_id: Camera ID

        Returns:
            CameraDevice instance or None
        """
        return db.query(CameraDevice).filter(CameraDevice.id == camera_id).first()

    def capture_frame_from_ip_camera(
        self, db: Session, camera_id: int
    ) -> Optional[bytes]:
        """
        Capture a single frame from an IP camera.

        Args:
            db: Database session
            camera_id: Camera ID with connection_info containing URL

        Returns:
            JPEG image bytes or None if failed
        """
        camera = self.get_camera(db, camera_id)
        if not camera or not camera.connection_info:
            return None

        try:
            info = json.loads(camera.connection_info)
            # Prefer snapshot_url for capturing, fallback to url for backward compatibility
            url = info.get("snapshot_url") or info.get("url")
            if not url:
                logger.error(f"Camera {camera_id} missing URL in connection_info")
                return None

            # Fetch frame from IP camera
            response = requests.get(url, timeout=5, stream=True)
            response.raise_for_status()

            # Convert to image bytes
            img_array = np.asarray(bytearray(response.content), dtype=np.uint8)
            img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)

            if img is None:
                logger.error(f"Failed to decode image from {url}")
                return None

            # Convert to JPEG
            _, buffer = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 92])
            return buffer.tobytes()

        except Exception as e:
            logger.error(f"Failed to capture from camera {camera_id}: {e}")
            return None


# Singleton service instance (Dependency Injection pattern)
camera_service = CameraService()

"""
Camera service layer - business logic for camera operations
"""

import json
import logging
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy.orm import Session

from .models import CameraDevice
from .schemas import CameraDeviceCreate

logger = logging.getLogger("backend_camera_service")


class CameraService:
    """
    Service layer for camera device management.

    Handles camera registration, status tracking, and device lifecycle.
    Follows Service Layer pattern with methods under 25 lines.
    """

    def register_camera(
        self, db: Session, camera_data: CameraDeviceCreate
    ) -> CameraDevice:
        """
        Register a new camera device.

        Args:
            db: Database session
            camera_data: Camera registration data

        Returns:
            Created CameraDevice instance
        """
        camera = CameraDevice(
            name=camera_data.name,
            type=camera_data.type,
            status="online",
            capabilities=self._serialize_capabilities(camera_data.capabilities),
            connection_info=self._serialize_connection_info(
                camera_data.connection_info
            ),
            last_seen=datetime.now(timezone.utc),
        )
        db.add(camera)
        db.commit()
        db.refresh(camera)
        logger.info(f"Registered camera: {camera.name} (type: {camera.type})")
        return camera

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

    def update_status(
        self, db: Session, camera_id: int, status: str
    ) -> Optional[CameraDevice]:
        """
        Update camera status and last seen timestamp.

        Args:
            db: Database session
            camera_id: Camera ID
            status: New status (online, offline, error)

        Returns:
            Updated CameraDevice or None if not found
        """
        camera = self.get_camera(db, camera_id)
        if not camera:
            return None

        camera.status = status
        camera.last_seen = datetime.now(timezone.utc)
        db.commit()
        db.refresh(camera)
        logger.debug(f"Updated camera {camera_id} status to {status}")
        return camera

    def delete_camera(self, db: Session, camera_id: int) -> bool:
        """
        Delete a camera device.

        Args:
            db: Database session
            camera_id: Camera ID

        Returns:
            True if deleted, False if not found
        """
        camera = self.get_camera(db, camera_id)
        if not camera:
            return False

        db.delete(camera)
        db.commit()
        logger.info(f"Deleted camera: {camera.name} (ID: {camera_id})")
        return True

    def get_online_cameras(self, db: Session) -> List[CameraDevice]:
        """
        Get all cameras with 'online' status.

        Args:
            db: Database session

        Returns:
            List of online CameraDevice instances
        """
        return (
            db.query(CameraDevice)
            .filter(CameraDevice.status == "online")
            .order_by(CameraDevice.last_seen.desc())
            .all()
        )

    def _serialize_capabilities(self, capabilities: Optional[object]) -> Optional[str]:
        """Serialize capabilities object to JSON string."""
        if not capabilities:
            return None
        if hasattr(capabilities, "model_dump"):
            return json.dumps(capabilities.model_dump())
        return json.dumps(capabilities)

    def _serialize_connection_info(self, info: Optional[dict]) -> Optional[str]:
        """Serialize connection info dict to JSON string."""
        return json.dumps(info) if info else None


# Singleton service instance (Dependency Injection pattern)
camera_service = CameraService()

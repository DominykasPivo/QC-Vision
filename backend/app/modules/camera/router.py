"""
Camera API router - FastAPI endpoints for camera operations
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.modules.audit.service import log_action
from app.security import get_actor

from .schemas import CameraDeviceResponse, CameraListResponse
from .service import camera_service

logger = logging.getLogger("backend_camera_router")

router = APIRouter(prefix="/cameras", tags=["cameras"])


@router.get("/", response_model=CameraListResponse)
async def list_cameras(
    camera_type: Optional[str] = Query(None, description="Filter by camera type"),
    db: Session = Depends(get_db),
    actor: dict = Depends(get_actor),
):
    """
    List all registered cameras.

    Optionally filter by camera type (browser, droidcam, rtsp, etc.)
    Cameras are registered manually via SQL/NocoDB.
    """
    cameras = camera_service.list_cameras(db, camera_type=camera_type)
    return CameraListResponse(cameras=cameras, total=len(cameras))


@router.get("/{camera_id}", response_model=CameraDeviceResponse)
async def get_camera(
    camera_id: int,
    db: Session = Depends(get_db),
    actor: dict = Depends(get_actor),
):
    """
    Get details of a specific camera device.
    """
    camera = camera_service.get_camera(db, camera_id)
    if not camera:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Camera not found"
        )
    return camera


@router.get("/{camera_id}/capture")
async def capture_from_ip_camera(
    camera_id: int,
    db: Session = Depends(get_db),
    actor: dict = Depends(get_actor),
):
    """
    Capture a frame from an IP camera.

    Camera must have connection_info with 'url' field pointing to IP camera stream.
    Example connection_info: {"url": "http://192.168.1.100:8080/video"}
    """
    username = actor["username"]

    image_bytes = camera_service.capture_frame_from_ip_camera(db, camera_id)
    if not image_bytes:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to capture frame from IP camera",
        )

    log_action(
        db,
        action="CAPTURE",
        entity_type="Camera",
        entity_id=camera_id,
        username=username,
    )

    return Response(content=image_bytes, media_type="image/jpeg")

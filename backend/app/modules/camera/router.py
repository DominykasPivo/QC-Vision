"""
Camera API router - FastAPI endpoints for camera operations
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.modules.audit.service import log_action
from app.security import get_actor

from .schemas import (
    CameraDeviceCreate,
    CameraDeviceResponse,
    CameraListResponse,
    CameraStatusUpdate,
)
from .service import camera_service

logger = logging.getLogger("backend_camera_router")

router = APIRouter(prefix="/cameras", tags=["cameras"])


@router.post(
    "/register",
    response_model=CameraDeviceResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register_camera(
    camera_data: CameraDeviceCreate,
    db: Session = Depends(get_db),
    actor: dict = Depends(get_actor),
):
    """
    Register a new camera device.

    Creates a camera device entry with optional capabilities and connection info.
    """
    username = actor["username"]

    try:
        camera = camera_service.register_camera(db, camera_data)

        log_action(
            db,
            action="REGISTER",
            entity_type="Camera",
            entity_id=camera.id,
            username=username,
            meta={"name": camera.name, "type": camera.type},
        )

        return camera
    except Exception as e:
        logger.error(f"Failed to register camera: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to register camera",
        )


@router.get("/", response_model=CameraListResponse)
async def list_cameras(
    camera_type: Optional[str] = Query(None, description="Filter by camera type"),
    db: Session = Depends(get_db),
    actor: dict = Depends(get_actor),
):
    """
    List all registered cameras.

    Optionally filter by camera type (browser, droidcam, rtsp, etc.)
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


@router.patch("/{camera_id}/status", response_model=CameraDeviceResponse)
async def update_camera_status(
    camera_id: int,
    status_update: CameraStatusUpdate,
    db: Session = Depends(get_db),
    actor: dict = Depends(get_actor),
):
    """
    Update camera status (online, offline, error).
    """
    username = actor["username"]

    camera = camera_service.update_status(db, camera_id, status_update.status)
    if not camera:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Camera not found"
        )

    log_action(
        db,
        action="UPDATE_STATUS",
        entity_type="Camera",
        entity_id=camera_id,
        username=username,
        meta={"status": status_update.status},
    )

    return camera


@router.delete("/{camera_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_camera(
    camera_id: int,
    db: Session = Depends(get_db),
    actor: dict = Depends(get_actor),
):
    """
    Delete a camera device.
    """
    username = actor["username"]

    if not camera_service.delete_camera(db, camera_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Camera not found"
        )

    log_action(
        db,
        action="DELETE",
        entity_type="Camera",
        entity_id=camera_id,
        username=username,
    )

    return None


@router.get("/online", response_model=CameraListResponse)
async def get_online_cameras(
    db: Session = Depends(get_db),
    actor: dict = Depends(get_actor),
):
    """
    Get all cameras currently online.
    """
    cameras = camera_service.get_online_cameras(db)
    return CameraListResponse(cameras=cameras, total=len(cameras))

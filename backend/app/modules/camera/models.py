"""
Camera device database models
"""

from sqlalchemy import Column, DateTime, Integer, String, Text
from sqlalchemy.sql import func

from app.database import Base


class CameraDevice(Base):
    """
    Represents a registered camera device (browser, DroidCam, IP camera, etc.)
    """

    __tablename__ = "camera_devices"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    type = Column(String(50), nullable=False, index=True)  # browser, droidcam, rtsp
    status = Column(
        String(50), nullable=False, default="offline"
    )  # online, offline, error
    capabilities = Column(Text, nullable=True)  # JSON string of camera capabilities
    connection_info = Column(Text, nullable=True)  # JSON string of connection details
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_seen = Column(DateTime(timezone=True), nullable=True)

"""
Photo database models
"""

from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, Text

from app.database import Base


class Photo(Base):
    __tablename__ = "photos"

    id = Column(Integer, primary_key=True, index=True)
    test_id = Column(
        Integer,
        ForeignKey("quality_tests.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    camera_id = Column(
        Integer,
        ForeignKey("camera_devices.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    file_path = Column(Text, nullable=False)
    time_stamp = Column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow
    )
    analysis_results = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    verification_status = Column(Text, nullable=False, default="pending")
    color_id = Column(
        Integer,
        ForeignKey("colors.id", ondelete="SET NULL"),
        nullable=True,
    )
    method = Column(Text, nullable=True)

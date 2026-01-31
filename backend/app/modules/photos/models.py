"""
Photo database models
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from datetime import datetime

from app.database import Base


class Photo(Base):
    __tablename__ = "photos"

    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign key to qualityTests table
    test_id = Column(Integer, ForeignKey("qualityTests.id", ondelete="RESTRICT"), nullable=False, index=True)
    
    # Storage info - MinIO path
    file_path = Column(Text, nullable=False)
    
    # Timestamp
    time_stamp = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    
    # AI/Analysis results (optional text field)
    analysis_results = Column(Text, nullable=True)

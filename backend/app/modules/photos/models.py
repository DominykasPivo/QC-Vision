"""
Photo database models
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from datetime import datetime

from app.database import Base


class Photo(Base):
    __tablename__ = "photos"

    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign key to quality_tests table (CASCADE to auto-delete photos when test is deleted)
    test_id = Column(Integer, ForeignKey("quality_tests.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Storage info - MinIO path
    file_path = Column(Text, nullable=False)
    
    # Timestamp
    time_stamp = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    
    # AI/Analysis results (optional text field)
    analysis_results = Column(Text, nullable=True)

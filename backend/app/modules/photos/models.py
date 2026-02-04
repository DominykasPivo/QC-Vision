"""
Photo database models
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from datetime import datetime

from app.database import Base


class Photo(Base):
    __tablename__ = "photos"

    id = Column(Integer, primary_key=True, index=True)
    test_id = Column(Integer, ForeignKey("quality_tests.id", ondelete="CASCADE"), nullable=False, index=True)
    
    file_path = Column(Text, nullable=False)
    time_stamp = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    analysis_results = Column(Text, nullable=True)

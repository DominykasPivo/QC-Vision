"""
Tests database models
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from datetime import datetime

from app.database import Base


class Tests(Base):
    __tablename__ = "qualityTests"

    id = Column(Integer, primary_key=True, index=True)
    
    productId = Column(Integer, nullable=False, index=True)

    testType = Column(String(50), nullable=False)

    requester = Column(String(100), nullable=False)

    assignedTo = Column(String(100), nullable=True)

    status = Column(String(50), nullable=False, default="pending")

    deadlineAt = Column(DateTime(timezone=True), nullable=True)

    createdAt = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    updatedAt = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

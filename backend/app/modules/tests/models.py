from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from datetime import datetime

from app.database import Base


class Tests(Base):
    __tablename__ = "quality_tests"

    id = Column(Integer, primary_key=True, index=True)
    
    product_id = Column("product_id", Integer, nullable=False, index=True)

    test_type = Column("test_type", String(50), nullable=False)

    requester = Column(String(100), nullable=False)

    assigned_to = Column("assigned_to", String(100), nullable=True)

    status = Column(String(50), nullable=False, default="pending")

    deadline_at = Column("deadline_at", DateTime(timezone=True), nullable=True)

    created_at = Column("created_at", DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    updated_at = Column("updated_at", DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

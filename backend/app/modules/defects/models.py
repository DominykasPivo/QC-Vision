from sqlalchemy import Column, Integer, Text, Boolean, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base


class DefectCategory(Base):
    __tablename__ = "defect_category"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(Text, nullable=False, unique=True)
    is_active = Column(Boolean, nullable=False, server_default="true")


class Defect(Base):
    __tablename__ = "defects"

    id = Column(Integer, primary_key=True, index=True)
    photo_id = Column(Integer, ForeignKey("photos.id", ondelete="CASCADE"), nullable=False, index=True)

    description = Column(Text, nullable=True)
    severity = Column(Text, nullable=False)  # DB enum defect_severity, stored as text in ORM
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    annotations = relationship("DefectAnnotation", back_populates="defect", cascade="all, delete-orphan")


class DefectAnnotation(Base):
    __tablename__ = "defect_annotations"

    id = Column(Integer, primary_key=True, index=True)

    defect_id = Column(Integer, ForeignKey("defects.id", ondelete="RESTRICT"), nullable=False, index=True)
    category_id = Column(Integer, ForeignKey("defect_category.id", ondelete="RESTRICT"), nullable=False, index=True)

    geometry = Column(JSONB, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    defect = relationship("Defect", back_populates="annotations")
    category = relationship("DefectCategory")

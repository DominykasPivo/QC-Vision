from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Table,
    Text,
)
from sqlalchemy.orm import relationship

from app.database import Base


class Color(Base):
    __tablename__ = "colors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(Text, nullable=False, unique=True)
    hex_value = Column(Text, nullable=False)
    is_active = Column(Boolean, nullable=False, server_default="true")


test_colors_table = Table(
    "test_colors",
    Base.metadata,
    Column(
        "test_id",
        Integer,
        ForeignKey("quality_tests.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "color_id",
        Integer,
        ForeignKey("colors.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


class Tests(Base):
    __tablename__ = "quality_tests"

    id = Column(Integer, primary_key=True, index=True)
    jira_id = Column("jira_id", String(100), nullable=False, index=True)
    product_name = Column("product_name", String(255), nullable=False)

    test_type = Column("test_type", String(50), nullable=False)
    requester = Column(String(100), nullable=False)
    assigned_to = Column("assigned_to", String(100), nullable=True)
    description = Column(Text, nullable=True)
    matrix_columns = Column(Text, nullable=True)
    colors = relationship("Color", secondary=test_colors_table, lazy="joined")
    status = Column(String(50), nullable=False, default="pending")
    deadline_at = Column("deadline_at", DateTime(timezone=True), nullable=True)
    created_at = Column(
        "created_at", DateTime(timezone=True), nullable=False, default=datetime.utcnow
    )
    review_status = Column(String(20), nullable=False, default="pending")
    reviewed_by = Column(String(100), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    review_comment = Column(Text, nullable=True)
    updated_at = Column(
        "updated_at",
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

from sqlalchemy import JSON, Column, DateTime, Integer, Text, text
from sqlalchemy.sql import func

from app.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)

    action = Column(Text, nullable=False)
    entity_type = Column(Text, nullable=False)
    entity_id = Column(Integer, nullable=False)

    meta = Column(JSON, nullable=False, server_default=text("'{}'"))

    created_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    username = Column(Text, nullable=False)

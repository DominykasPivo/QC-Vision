"""
Database configuration and session management
"""

import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Database URL from environment variable
DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql://qcvision:qcvision123@localhost:5432/qcvision_db"
)

# Create SQLAlchemy engine with appropriate settings for the database type
# SQLite (used in tests) doesn't support connection pooling arguments
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, echo=False)
else:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,  # Verify connections before using
        echo=False,  # Set to True for SQL query logging
        pool_size=20,  # Increased from default 5 to handle concurrent users
        max_overflow=30,  # Increased from default 10 to handle traffic spikes
        pool_recycle=3600,  # Recycle connections after 1 hour
        pool_timeout=30,  # Wait up to 30 seconds for a connection
    )

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create base class for models
Base = declarative_base()


def get_db():
    """
    Dependency for FastAPI routes to get database session.
    Usage: db: Session = Depends(get_db)
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    """Create all tables in the database"""
    Base.metadata.create_all(bind=engine)


def drop_tables():
    """Drop all tables in the database (use with caution!)"""
    Base.metadata.drop_all(bind=engine)

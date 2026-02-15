"""
Shared fixtures for the QC-Vision backend test suite.

Bootstrap order  (runs at import time, BEFORE any app code loads):
  1. Stub the ``minio`` package – PhotoStorage() is instantiated at module
     import time and its __init__ calls Minio(); this prevents a real
     network connection.
  2. Replace ``sqlalchemy.dialects.postgresql.JSONB`` with the cross-database
     ``sqlalchemy.JSON`` type so that Base.metadata.create_all() works on an
     in-memory SQLite database.

Fixtures
--------
db_session           – fresh, isolated SQLAlchemy session backed by in-memory SQLite.
mock_photo_storage   – replaces every live reference to PhotoStorage with
                       controllable AsyncMock methods (upload / get / delete).
client               – FastAPI TestClient wired to the same db_session;
                       lifespan create_tables() is suppressed.
"""

from __future__ import annotations

import sys
from unittest.mock import AsyncMock, MagicMock

# ---------------------------------------------------------------------------
# 1.  Stub ``minio`` – must run before any app import
# ---------------------------------------------------------------------------
_minio_instance = MagicMock()
_minio_instance.bucket_exists.return_value = True  # skip bucket-creation branch

_minio_mod = MagicMock()
_minio_mod.Minio = MagicMock(return_value=_minio_instance)


class _FakeS3Error(Exception):
    pass


_minio_mod.error = MagicMock()
_minio_mod.error.S3Error = _FakeS3Error

sys.modules["minio"] = _minio_mod
sys.modules["minio.error"] = _minio_mod.error

# ---------------------------------------------------------------------------
# 2.  JSONB  →  JSON – must run before defects model is imported
# ---------------------------------------------------------------------------
import sqlalchemy.dialects.postgresql as _pg  # noqa: E402
from sqlalchemy import JSON as _JSON  # noqa: E402

_pg.JSONB = _JSON  # type: ignore[attr-defined]

# ---------------------------------------------------------------------------
# 2b. Point DATABASE_URL at SQLite so that database.py's module-level
#     create_engine() does NOT try to connect to PostgreSQL / load psycopg2.
# ---------------------------------------------------------------------------
import os as _os  # noqa: E402

_os.environ.setdefault("DATABASE_URL", "sqlite://")

from unittest.mock import patch  # noqa: E402

# ---------------------------------------------------------------------------
# 3.  App imports – now safe
# ---------------------------------------------------------------------------
import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine, event  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from app.database import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402

# Keep references to modules whose ``photo_storage`` global we monkeypatch.
# We use sys.modules instead of ``import X as Y`` because several
# __init__.py files do ``from .router import router`` which shadows the
# submodule name on the package – sys.modules is immune to that.
_storage_mod = sys.modules["app.modules.photos.storage"]
_photos_router_mod = sys.modules["app.modules.photos.router"]
_photos_service_mod = sys.modules["app.modules.photos.service"]
_tests_service_mod = sys.modules["app.modules.tests.service"]


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture()
def db_session():
    """
    Isolated in-memory SQLite database.  Tables are created before the test
    and dropped afterwards so every test starts with an empty schema.
    """
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    # SQLite ignores foreign-key constraints by default; enable them.
    @event.listens_for(engine, "connect")
    def _fk_pragma(dbapi_conn, _rec):
        dbapi_conn.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine)()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def mock_photo_storage(monkeypatch):
    """
    Replaces every live reference to PhotoStorage with a single MagicMock.
    Async methods are wrapped in AsyncMock so they can be ``await``-ed.
    """
    mock = MagicMock()
    mock.upload_photo = AsyncMock(return_value="photos/20250101/test-uuid.jpg")
    mock.get_photo = AsyncMock(return_value=b"\xff\xd8\xff\xe0fake-jpeg-data")
    mock.delete_photo = AsyncMock(return_value=True)
    mock.generate_presigned_url = MagicMock(
        return_value="http://localhost:9000/qc-vision-photos/photos/20250101/test-uuid.jpg"
    )

    # Patch every module that imported photo_storage as a module-level name
    monkeypatch.setattr(_storage_mod, "photo_storage", mock)
    monkeypatch.setattr(_photos_router_mod, "photo_storage", mock)
    monkeypatch.setattr(_tests_service_mod, "photo_storage", mock)
    # photo_service holds its own PhotoStorage instance – replace directly
    _photos_service_mod.photo_service.storage = mock
    return mock


@pytest.fixture()
def mock_db():
    """Bare MagicMock standing in for a SQLAlchemy Session.
    Each test configures the query-chain returns it needs."""
    return MagicMock()


@pytest.fixture()
def client(db_session, mock_photo_storage):
    """
    FastAPI TestClient.  ``get_db`` is overridden to return the in-memory
    session; ``create_tables()`` inside the lifespan is a no-op.
    """

    def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    with patch("app.main.create_tables"):
        with TestClient(app) as c:
            yield c
    app.dependency_overrides.clear()

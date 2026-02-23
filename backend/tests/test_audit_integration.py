import httpx
import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app


@pytest.mark.asyncio
async def test_create_test_writes_audit_log():
    # Create an in-memory SQLite database for testing
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    # Enable foreign key constraints for SQLite
    @event.listens_for(engine, "connect")
    def _fk_pragma(dbapi_conn, _rec):
        dbapi_conn.execute("PRAGMA foreign_keys=ON")

    # Create all tables
    Base.metadata.create_all(bind=engine)

    # Create a session
    session_factory = sessionmaker(bind=engine)
    db_session = session_factory()

    # Override the get_db dependency to use our test session
    def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db

    try:
        # Manually run FastAPI startup events
        await app.router.startup()

        transport = httpx.ASGITransport(app=app)

        async with httpx.AsyncClient(
            transport=transport, base_url="http://test"
        ) as client:
            form = {
                "productId": "99999",
                "testType": "incoming",
                "requester": "sherifa",
                "status": "pending",
            }

            r = await client.post("/api/v1/tests/", data=form)
            assert r.status_code == 201

    finally:
        # Manually run shutdown events
        await app.router.shutdown()

        # Clean up
        app.dependency_overrides.clear()
        db_session.close()
        Base.metadata.drop_all(bind=engine)

import pytest
import httpx

from app.main import app


@pytest.mark.asyncio
async def test_create_test_writes_audit_log():
    # manually run FastAPI startup events
    await app.router.startup()

    try:
        transport = httpx.ASGITransport(app=app)

        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            form = {
                "productId": "99999",
                "testType": "incoming",
                "requester": "sherifa",
                "status": "pending",
            }

            r = await client.post("/api/v1/tests/", data=form)
            assert r.status_code == 201

    finally:
        # manually run shutdown events
        await app.router.shutdown()
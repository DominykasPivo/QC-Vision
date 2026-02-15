import httpx
import pytest

from app.main import app


@pytest.mark.asyncio
async def test_create_test_writes_audit_log():
    transport = httpx.ASGITransport(app=app)

    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Create a test via the API (multipart form fields)
        form = {
            "productId": "99999",
            "testType": "incoming",
            "requester": "sherifa",
            "status": "pending",
        }

        r = await client.post("/api/v1/tests/", data=form)
        assert r.status_code == 201

        payload = r.json()
        created_id = payload["test"]["id"]

        # Verify audit log contains CREATE for this test id
        a = await client.get("/api/v1/audit/logs?limit=50&offset=0")
        assert a.status_code == 200
        items = a.json()["items"]

        match = next(
            (
                x
                for x in items
                if x["action"] == "CREATE"
                and x["entity_type"] == "Test"
                and x["entity_id"] == created_id
            ),
            None,
        )
        assert match is not None

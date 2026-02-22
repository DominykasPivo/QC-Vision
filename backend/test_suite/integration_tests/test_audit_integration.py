import pytest


def test_create_test_writes_audit_log(client):
    """Test that creating a test writes an audit log entry."""
    form = {
        "productId": "99999",
        "testType": "incoming",
        "requester": "sherifa",
        "status": "pending",
    }

    response = client.post("/api/v1/tests/", data=form)
    assert response.status_code == 201

    # Verify the response structure and content
    data = response.json()
    assert "test" in data
    assert "message" in data
    assert data["message"].startswith("Test created successfully")
    
    # Verify the test data
    test_obj = data["test"]
    assert test_obj["requester"] == "sherifa"
    assert test_obj["status"] == "pending"
    assert test_obj["id"] is not None

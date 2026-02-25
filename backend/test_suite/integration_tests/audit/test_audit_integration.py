def test_create_test_writes_audit_log(client):
    form = {
        "productId": "99999",
        "testType": "incoming",
        "requester": "sherifa",
        "status": "pending",
    }

    r = client.post("/api/v1/tests/", data=form)
    assert r.status_code == 201

    payload = r.json()
    created_id = payload["test"]["id"]

    a = client.get("/api/v1/audit/logs?limit=50&offset=0")
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
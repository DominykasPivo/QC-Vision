def test_create_test_writes_audit_log(client):
    form = {
        "gyraId": "99999",
        "productName": "Test Product",
        "testType": "incoming",
        "requester": "sherifa",
        "status": "pending",
    }

    response = client.post("/api/v1/tests/", data=form)

    if response.status_code != 201:
        print("STATUS:", response.status_code)
        print("BODY:", response.text)

    assert response.status_code == 201

    payload = response.json()
    created_id = payload["test"]["id"]

    audit_response = client.get("/api/v1/audit/logs?limit=50&offset=0")
    assert audit_response.status_code == 200

    items = audit_response.json().get("items", [])

    match = next(
        (
            x
            for x in items
            if x.get("action") == "CREATE"
            and x.get("entity_type") == "Test"
            and str(x.get("entity_id")) == str(created_id)
        ),
        None,
    )

    assert match is not None
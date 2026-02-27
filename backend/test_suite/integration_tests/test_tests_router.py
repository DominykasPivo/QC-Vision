"""
Integration tests for the Tests module API  (/api/v1/tests/...).

The ``create`` endpoint requires multipart/form-data (it declares both
Form and File parameters).  We force multipart encoding by sending every
form field through the ``files`` parameter using the
``(field_name, (None, value))`` tuple convention — httpx interprets a
``None`` filename as a plain form field inside a multipart body.

Response keys use the *alias* names defined in TestResponse
(jira_id, product_name, test_type, assigned_to, deadline_at, created_at, updated_at)
because FastAPI's jsonable_encoder defaults to ``by_alias=True``.
"""

# ---------------------------------------------------------------------------
# Helper – build multipart form-field tuples
# ---------------------------------------------------------------------------


def _form_fields(**kwargs) -> list:
    """Convert keyword arguments into httpx multipart field tuples.
    None values are omitted so the endpoint uses its own defaults."""
    return [(k, (None, str(v))) for k, v in kwargs.items() if v is not None]


# ---------------------------------------------------------------------------
# POST /api/v1/tests/
# ---------------------------------------------------------------------------


class TestCreateTestRoute:
    def test_201_with_minimal_fields(self, client):
        resp = client.post(
            "/api/v1/tests/",
            files=_form_fields(
                jiraId="GY-101",
                productName="Test Product",
                testType="incoming",
                requester="Alice",
            ),
        )
        assert resp.status_code == 201

        body = resp.json()
        assert body["test"]["jira_id"] == "GY-101"
        assert body["test"]["product_name"] == "Test Product"
        assert body["test"]["requester"] == "Alice"
        assert body["test"]["status"] == "pending"  # default
        assert body["message"].startswith("Test created")

    def test_201_with_all_optional_fields(self, client):
        resp = client.post(
            "/api/v1/tests/",
            files=_form_fields(
                jiraId="GY-103",
                productName="Test Product",
                testType="final",
                requester="Dave",
                assignedTo="Eve",
                description="Test description for final inspection",
                status="finalized",
                deadlineAt="2026-03-15T00:00:00Z",
            ),
        )
        assert resp.status_code == 201

        test = resp.json()["test"]
        assert test["assigned_to"] == "Eve"
        assert test["description"] == "Test description for final inspection"
        assert test["status"] == "finalized"
        assert test["deadline_at"] is not None

    def test_201_without_description(self, client):
        resp = client.post(
            "/api/v1/tests/",
            files=_form_fields(
                jiraId="GY-105",
                productName="Test Product",
                testType="incoming",
                requester="Frank",
            ),
        )
        assert resp.status_code == 201
        assert resp.json()["test"]["description"] is None

    def test_400_on_invalid_deadline_format(self, client):
        resp = client.post(
            "/api/v1/tests/",
            files=_form_fields(
                jiraId="GY-104",
                productName="Test Product",
                testType="incoming",
                requester="Mona",
                deadlineAt="not-a-date",
            ),
        )
        assert resp.status_code == 400


# ---------------------------------------------------------------------------
# GET /api/v1/tests/{test_id}
# ---------------------------------------------------------------------------


class TestGetTestRoute:
    def test_get_test(self, client):
        # 404 for nonexistent
        assert client.get("/api/v1/tests/9999").status_code == 404

        # Returns created test
        created = client.post(
            "/api/v1/tests/",
            files=_form_fields(
                jiraId="GY-102",
                productName="Test Product",
                testType="in_process",
                requester="Carol",
            ),
        ).json()["test"]

        resp = client.get(f"/api/v1/tests/{created['id']}")
        assert resp.status_code == 200
        assert resp.json()["id"] == created["id"]
        assert resp.json()["jira_id"] == "GY-102"
        assert resp.json()["product_name"] == "Test Product"


# ---------------------------------------------------------------------------
# GET /api/v1/tests/  –  listing & pagination
# ---------------------------------------------------------------------------


class TestListTestsRoute:
    def _create_n(self, client, n: int):
        requesters = ["Alice", "Bob", "Carol", "Dave", "Eve"]
        for i in range(n):
            client.post(
                "/api/v1/tests/",
                files=_form_fields(
                    jiraId=f"GY-{101 + i}",
                    productName="Test Product",
                    testType="incoming",
                    requester=requesters[i % 5],
                ),
            )

    def test_listing_and_pagination(self, client):
        self._create_n(client, 5)

        resp = client.get("/api/v1/tests/")
        assert resp.status_code == 200

        data = resp.json()
        assert data["total"] == 5
        assert len(data["items"]) == 5

        # Limit restricts count
        data = client.get("/api/v1/tests/?limit=2").json()
        assert len(data["items"]) == 2

        # Skip offsets results (skip 4 of 5 → 1 remaining)
        data = client.get("/api/v1/tests/?offset=4").json()
        assert len(data["items"]) == 1

        # Skip beyond total returns empty
        data = client.get("/api/v1/tests/?offset=100").json()
        assert data["items"] == []

    def test_advanced_search_and_filters(self, client):
        """Test comprehensive search across multiple fields and status filtering."""
        # Create diverse test data
        client.post(
            "/api/v1/tests/",
            files=_form_fields(
                jiraId="GY-2001",
                productName="Blue T-Shirt",
                testType="incoming",
                requester="Alice Thompson",
                assignedTo="Bob Inspector",
                description="Check for print quality issues",
                status="open",
            ),
        )
        client.post(
            "/api/v1/tests/",
            files=_form_fields(
                jiraId="GY-2002",
                productName="Red Hoodie",
                testType="final",
                requester="Carol Smith",
                description="Verify embroidery alignment",
                status="in_progress",
            ),
        )

        # Test multi-field search
        data = client.get("/api/v1/tests/?search=Hoodie").json()
        assert data["total"] == 1
        assert data["items"][0]["product_name"] == "Red Hoodie"

        data = client.get("/api/v1/tests/?search=GY-2001").json()
        assert data["total"] == 1
        assert data["items"][0]["jira_id"] == "GY-2001"

        # Test status filter
        data = client.get("/api/v1/tests/?status=open").json()
        assert all(t["status"] == "open" for t in data["items"])
        assert any(t["jira_id"] == "GY-2001" for t in data["items"])

        # Test combined search + status filter
        data = client.get("/api/v1/tests/?search=Alice&status=open").json()
        assert data["total"] >= 1
        assert all(t["status"] == "open" for t in data["items"])
        assert all("Alice" in t["requester"] for t in data["items"])


# ---------------------------------------------------------------------------
# PATCH /api/v1/tests/{test_id}
# ---------------------------------------------------------------------------


class TestUpdateTestRoute:
    def test_update_test_fields(self, client):
        test_id = client.post(
            "/api/v1/tests/",
            files=_form_fields(
                jiraId="GY-102",
                productName="Test Product",
                testType="incoming",
                requester="Carol",
            ),
        ).json()["test"]["id"]

        # Update status
        resp = client.patch(f"/api/v1/tests/{test_id}", json={"status": "in_progress"})
        assert resp.status_code == 200
        assert resp.json()["status"] == "in_progress"

        # Update assigned_to
        resp = client.patch(f"/api/v1/tests/{test_id}", json={"assigned_to": "Omar"})
        assert resp.status_code == 200
        assert resp.json()["assigned_to"] == "Omar"

        # Update description
        resp = client.patch(
            f"/api/v1/tests/{test_id}", json={"description": "Updated description"}
        )
        assert resp.status_code == 200
        assert resp.json()["description"] == "Updated description"

    def test_404_for_nonexistent_test(self, client):
        resp = client.patch("/api/v1/tests/9999", json={"status": "open"})
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# DELETE /api/v1/tests/{test_id}
# ---------------------------------------------------------------------------


class TestDeleteTestRoute:
    def test_204_and_subsequent_get_is_404(self, client):
        test_id = client.post(
            "/api/v1/tests/",
            files=_form_fields(
                jiraId="GY-104",
                productName="Test Product",
                testType="other",
                requester="Mona",
            ),
        ).json()["test"]["id"]

        assert client.delete(f"/api/v1/tests/{test_id}").status_code == 204
        assert client.get(f"/api/v1/tests/{test_id}").status_code == 404

    def test_404_for_nonexistent_test(self, client):
        assert client.delete("/api/v1/tests/9999").status_code == 404

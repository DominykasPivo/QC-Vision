"""
End-to-end integration tests for QC-Vision workflows.

These tests verify complete user journeys through the application,
from test creation to defect annotation and gallery filtering.
"""

from io import BytesIO

from PIL import Image

from app.modules.defects.models import DefectCategory


def _make_jpeg(width: int = 400, height: int = 300) -> BytesIO:
    """Create a valid in-memory JPEG."""
    img = Image.new("RGB", (width, height), (128, 64, 32))
    buf = BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)
    return buf


def _form_fields(**kwargs) -> list:
    """Convert keyword arguments into httpx multipart field tuples."""
    return [(k, (None, str(v))) for k, v in kwargs.items() if v is not None]


class TestEndToEndQualityInspectionWorkflow:
    """
    Complete workflow: Create test → Upload photos → Annotate defects →
    Move annotations → Filter gallery → Update verification → Search tests.
    """

    def test_complete_quality_inspection_workflow(self, client, db_session):
        """
        End-to-end test simulating a complete quality inspection workflow.

        Workflow steps:
        1. QA manager creates a new quality test for incoming inspection
        2. Inspector uploads photos to the test
        3. Inspector identifies and annotates defects on photos
        4. Inspector moves/updates annotations to correct positions
        5. Inspector reviews photos in gallery with filters
        6. Reviewer updates verification status
        7. Manager searches and filters tests for reporting
        """

        # Seed defect categories required for the workflow
        db_session.add_all([
            DefectCategory(name="Print Errors", is_active=True),
            DefectCategory(name="Damage", is_active=True),
            DefectCategory(name="Incorrect Colors", is_active=True),
        ])
        db_session.commit()

        # ===================================================================
        # STEP 1: Create quality test for incoming inspection
        # ===================================================================
        test_response = client.post(
            "/api/v1/tests/",
            files=_form_fields(
                jiraId="GY-E2E-001",
                productName="Premium Cotton T-Shirt",
                testType="incoming",
                requester="Sarah Manager",
                assignedTo="John Inspector",
                description="Inspect incoming shipment batch #4521 for print quality defects",
                status="in_progress",
                deadlineAt="2026-03-01T00:00:00Z",
            ),
        )
        assert test_response.status_code == 201
        test = test_response.json()["test"]
        test_id = test["id"]

        assert test["jira_id"] == "GY-E2E-001"
        assert test["status"] == "in_progress"
        assert test["assigned_to"] == "John Inspector"

        # ===================================================================
        # STEP 2: Upload multiple photos to the test
        # ===================================================================
        photo1_response = client.post(
            f"/api/v1/photos/upload?test_id={test_id}",
            files={"file": ("front_view.jpg", _make_jpeg(800, 600), "image/jpeg")},
        )
        assert photo1_response.status_code == 201
        photo1 = photo1_response.json()
        photo1_id = photo1["id"]

        photo2_response = client.post(
            f"/api/v1/photos/upload?test_id={test_id}",
            files={"file": ("back_view.jpg", _make_jpeg(800, 600), "image/jpeg")},
        )
        assert photo2_response.status_code == 201
        photo2 = photo2_response.json()
        photo2_id = photo2["id"]

        # Verify photos are associated with the test
        photos_list = client.get(f"/api/v1/photos/test/{test_id}").json()
        assert len(photos_list) == 2

        # ===================================================================
        # STEP 3: Get defect categories and create annotated defects
        # ===================================================================
        categories = client.get("/api/v1/defects/categories").json()
        assert len(categories) > 0
        cat_id = categories[0]["id"]

        # Inspector finds a print smear defect on photo 1
        defect1_response = client.post(
            f"/api/v1/defects/photo/{photo1_id}",
            json={
                "category_id": cat_id,
                "description": "Ink smear on front logo print, approximately 2cm diameter",
                "severity": "high",
                "annotations": [
                    {
                        "category_id": cat_id,
                        "geometry": {
                            "type": "circle",
                            "cx": 0.52,
                            "cy": 0.35,
                            "r": 0.08,
                        },
                        "color": "#FF0000",
                    }
                ],
            },
        )
        assert defect1_response.status_code == 201
        defect1 = defect1_response.json()
        assert defect1["severity"] == "high"
        assert len(defect1["annotations"]) == 1

        # Inspector finds a minor defect on photo 2
        defect2_response = client.post(
            f"/api/v1/defects/photo/{photo2_id}",
            json={
                "category_id": cat_id,
                "description": "Minor color misalignment",
                "severity": "low",
                "annotations": [
                    {
                        "category_id": cat_id,
                        "geometry": {
                            "type": "rectangle",
                            "x": 0.3,
                            "y": 0.4,
                            "w": 0.25,
                            "h": 0.15,
                        },
                    }
                ],
            },
        )
        assert defect2_response.status_code == 201

        # ===================================================================
        # STEP 4: Inspector moves annotation to more precise position
        # ===================================================================
        annotation_id = defect1["annotations"][0]["id"]

        update_response = client.put(
            f"/api/v1/defects/annotations/{annotation_id}",
            json={
                "geometry": {
                    "type": "circle",
                    "cx": 0.54,  # adjusted
                    "cy": 0.33,  # adjusted
                    "r": 0.08,
                }
            },
        )
        assert update_response.status_code == 200
        updated_annotation = update_response.json()
        assert updated_annotation["geometry"]["cx"] == 0.54
        assert updated_annotation["geometry"]["cy"] == 0.33

        # ===================================================================
        # STEP 5: Review photos in gallery with filters
        # ===================================================================

        # View all photos in gallery
        gallery_all = client.get("/api/v1/photos/gallery").json()
        assert gallery_all["total"] >= 2

        # Filter gallery by test type
        gallery_incoming = client.get("/api/v1/photos/gallery?test_type=incoming").json()
        assert gallery_incoming["total"] >= 2

        # Filter gallery to show only high severity defects
        gallery_high = client.get("/api/v1/photos/gallery?severity=high").json()
        assert gallery_high["total"] >= 1
        high_severity_photo = next(
            (item for item in gallery_high["items"] if item["id"] == photo1_id), None
        )
        assert high_severity_photo is not None
        assert high_severity_photo["highest_severity"] == "high"

        # Filter to show only photos WITH defects
        gallery_with_defects = client.get("/api/v1/photos/gallery?has_defects=true").json()
        assert gallery_with_defects["total"] >= 2

        # ===================================================================
        # STEP 6: Reviewer updates verification status
        # ===================================================================

        # Photo 1 has high severity defect → reject
        verify1 = client.patch(
            f"/api/v1/photos/{photo1_id}/verification",
            json={"verification_status": "rejected"},
        )
        assert verify1.status_code == 200
        assert verify1.json()["verification_status"] == "rejected"

        # Photo 2 has low severity → approve
        verify2 = client.patch(
            f"/api/v1/photos/{photo2_id}/verification",
            json={"verification_status": "approved"},
        )
        assert verify2.status_code == 200
        assert verify2.json()["verification_status"] == "approved"

        # ===================================================================
        # STEP 7: Manager searches and filters tests for reporting
        # ===================================================================

        # Search by Jira ID
        search_jira = client.get("/api/v1/tests/?search=E2E-001").json()
        assert search_jira["total"] >= 1
        assert any(t["jira_id"] == "GY-E2E-001" for t in search_jira["items"])

        # Search by product name
        search_product = client.get("/api/v1/tests/?search=Cotton").json()
        assert search_product["total"] >= 1

        # Filter by status
        status_filter = client.get("/api/v1/tests/?status=in_progress").json()
        assert any(t["id"] == test_id for t in status_filter["items"])

        # Combined search + status filter
        combined = client.get("/api/v1/tests/?search=Premium&status=in_progress").json()
        assert any(t["id"] == test_id for t in combined["items"])

        # ===================================================================
        # STEP 8: Verify annotation was updated correctly
        # ===================================================================
        defects_for_photo1 = client.get(f"/api/v1/defects/photo/{photo1_id}").json()
        assert len(defects_for_photo1) == 1
        ann = defects_for_photo1[0]["annotations"][0]
        assert ann["geometry"]["cx"] == 0.54  # updated position
        assert ann["geometry"]["cy"] == 0.33

        # ===================================================================
        # STEP 9: Manager updates test status to finalized
        # ===================================================================
        finalize = client.patch(
            f"/api/v1/tests/{test_id}",
            json={"status": "finalized"},
        )
        assert finalize.status_code == 200
        assert finalize.json()["status"] == "finalized"


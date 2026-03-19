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
        db_session.add_all(
            [
                DefectCategory(name="Print Errors", is_active=True),
                DefectCategory(name="Damage", is_active=True),
                DefectCategory(name="Incorrect Colors", is_active=True),
            ]
        )
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
        gallery_incoming = client.get(
            "/api/v1/photos/gallery?test_type=incoming"
        ).json()
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
        gallery_with_defects = client.get(
            "/api/v1/photos/gallery?has_defects=true"
        ).json()
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


class TestCameraIOTWorkflow:
    """
    Complete camera workflow: Register camera → List cameras → Retrieve details.

    Note: Cameras are registered manually via SQL/NocoDB (not through API).
    Camera integration display on frontend is tested here.
    """

    def test_ip_camera_listing_and_retrieval(self, client, db_session):
        """
        End-to-end test for IP camera listing and detail retrieval.

        Workflow steps:
        1. Seed IP camera devices (simulating manual SQL insertion)
        2. List all cameras
        3. Filter cameras by type
        4. Retrieve specific camera details
        5. Verify camera information is correct
        """

        # ===================================================================
        # STEP 1: Seed IP camera devices (simulating manual SQL insertion)
        # ===================================================================
        from app.modules.camera.models import CameraDevice

        camera1 = CameraDevice(
            name="Production Line Camera #1",
            type="rtsp",
            status="online",
            connection_info='{"snapshot_url": "http://192.168.50.101:554/shot.jpg"}',
            capabilities='{"zoom": true, "focus": true, "resolution": ["1920x1080"]}',
        )
        camera2 = CameraDevice(
            name="Quality Check Station Camera",
            type="rtsp",
            status="online",
            connection_info='{"snapshot_url": "http://192.168.50.102:554/shot.jpg"}',
            capabilities='{"zoom": false, "focus": true, "resolution": ["1280x720"]}',
        )
        camera3 = CameraDevice(
            name="Handheld Inspection Device",
            type="usb",
            status="offline",
            connection_info='{"device_id": "USB-CAMERA-003"}',
            capabilities='{"zoom": true, "focus": false, "resolution": ["640x480"]}',
        )

        db_session.add_all([camera1, camera2, camera3])
        db_session.commit()
        db_session.refresh(camera1)
        db_session.refresh(camera2)
        db_session.refresh(camera3)

        # ===================================================================
        # STEP 2: List all cameras
        # ===================================================================
        cameras_list = client.get("/api/v1/cameras/").json()
        assert cameras_list["total"] == 3
        assert len(cameras_list["cameras"]) == 3

        # ===================================================================
        # STEP 3: Filter cameras by type
        # ===================================================================
        rtsp_cameras = client.get("/api/v1/cameras/?camera_type=rtsp").json()
        assert rtsp_cameras["total"] == 2
        assert all(cam["type"] == "rtsp" for cam in rtsp_cameras["cameras"])

        usb_cameras = client.get("/api/v1/cameras/?camera_type=usb").json()
        assert usb_cameras["total"] == 1
        assert usb_cameras["cameras"][0]["type"] == "usb"

        # ===================================================================
        # STEP 4: Retrieve specific camera details
        # ===================================================================
        camera1_detail = client.get(f"/api/v1/cameras/{camera1.id}").json()
        assert camera1_detail["name"] == "Production Line Camera #1"
        assert camera1_detail["type"] == "rtsp"
        assert camera1_detail["status"] == "online"

        camera2_detail = client.get(f"/api/v1/cameras/{camera2.id}").json()
        assert camera2_detail["name"] == "Quality Check Station Camera"
        assert camera2_detail["type"] == "rtsp"

        camera3_detail = client.get(f"/api/v1/cameras/{camera3.id}").json()
        assert camera3_detail["name"] == "Handheld Inspection Device"
        assert camera3_detail["type"] == "usb"
        assert camera3_detail["status"] == "offline"

        # ===================================================================
        # STEP 5: Verify camera information structure
        # ===================================================================
        # Ensure all cameras have required fields
        for camera in cameras_list["cameras"]:
            assert "id" in camera
            assert "name" in camera
            assert "type" in camera
            assert "status" in camera
            assert camera["type"] in ["rtsp", "usb", "http"]
            assert camera["status"] in ["online", "offline"]


class TestQCMatrixWorkflow:
    """
    Complete QC-Matrix workflow: Create test with matrix configuration →
    Upload photos → Verify matrix structure and filtering.
    """

    def test_qc_matrix_configuration_and_filtering(self, client, db_session):
        """
        End-to-end test for QC-Matrix functionality.

        Workflow steps:
        1. Create test with matrix_columns configuration (e.g., sizes: S, M, L)
        2. Upload photos for different matrix positions
        3. Update matrix_columns configuration
        4. Retrieve test and verify matrix structure
        5. Filter/organize photos by matrix columns
        """

        # ===================================================================
        # STEP 1: Create test (matrix_columns added later via PATCH)
        # ===================================================================
        test_response = client.post(
            "/api/v1/tests/",
            files=_form_fields(
                jiraId="GY-MATRIX-E2E-001",
                productName="Athletic Performance T-Shirt",
                testType="final",
                requester="QA Lead",
                assignedTo="Quality Inspector",
                description="Final inspection across all size variants",
                status="in_progress",
            ),
        )
        assert test_response.status_code == 201
        test = test_response.json()["test"]
        test_id = test["id"]

        # Add matrix_columns configuration via PATCH
        matrix_config = '["S", "M", "L", "XL"]'
        matrix_update = client.patch(
            f"/api/v1/tests/{test_id}",
            json={"matrix_columns": matrix_config},
        )
        assert matrix_update.status_code == 200
        assert matrix_update.json()["matrix_columns"] == matrix_config

        # ===================================================================
        # STEP 2: Upload photos for different matrix positions (sizes)
        # ===================================================================

        # Upload photo for Size S
        photo_s = client.post(
            f"/api/v1/photos/upload?test_id={test_id}",
            files={"file": ("shirt_size_S.jpg", _make_jpeg(800, 600), "image/jpeg")},
        )
        assert photo_s.status_code == 201

        # Upload photo for Size M
        photo_m = client.post(
            f"/api/v1/photos/upload?test_id={test_id}",
            files={"file": ("shirt_size_M.jpg", _make_jpeg(800, 600), "image/jpeg")},
        )
        assert photo_m.status_code == 201

        # Upload photo for Size L
        photo_l = client.post(
            f"/api/v1/photos/upload?test_id={test_id}",
            files={"file": ("shirt_size_L.jpg", _make_jpeg(800, 600), "image/jpeg")},
        )
        assert photo_l.status_code == 201

        # Upload photo for Size XL
        photo_xl = client.post(
            f"/api/v1/photos/upload?test_id={test_id}",
            files={"file": ("shirt_size_XL.jpg", _make_jpeg(800, 600), "image/jpeg")},
        )
        assert photo_xl.status_code == 201

        # ===================================================================
        # STEP 3: Verify all photos are associated with test
        # ===================================================================
        test_photos = client.get(f"/api/v1/photos/test/{test_id}").json()
        assert len(test_photos) == 4

        # ===================================================================
        # STEP 4: Update matrix_columns configuration (add XXL)
        # ===================================================================
        updated_matrix = '["S", "M", "L", "XL", "XXL"]'

        update_response = client.patch(
            f"/api/v1/tests/{test_id}",
            json={"matrix_columns": updated_matrix},
        )
        assert update_response.status_code == 200
        updated_test = update_response.json()
        assert updated_test["matrix_columns"] == updated_matrix

        # ===================================================================
        # STEP 5: Retrieve test and verify matrix structure
        # ===================================================================
        test_detail = client.get(f"/api/v1/tests/{test_id}").json()
        assert test_detail["matrix_columns"] == updated_matrix

        # Verify matrix columns can be parsed as JSON
        import json

        matrix_cols = json.loads(test_detail["matrix_columns"])
        assert len(matrix_cols) == 5
        assert matrix_cols == ["S", "M", "L", "XL", "XXL"]

        # ===================================================================
        # STEP 6: Upload photo for new matrix column (XXL)
        # ===================================================================
        photo_xxl = client.post(
            f"/api/v1/photos/upload?test_id={test_id}",
            files={"file": ("shirt_size_XXL.jpg", _make_jpeg(800, 600), "image/jpeg")},
        )
        assert photo_xxl.status_code == 201

        # Verify total photo count
        test_photos_final = client.get(f"/api/v1/photos/test/{test_id}").json()
        assert len(test_photos_final) == 5

        # ===================================================================
        # STEP 7: Search tests with matrix_columns configuration
        # ===================================================================
        search_result = client.get("/api/v1/tests/?search=Athletic").json()
        assert search_result["total"] >= 1

        matrix_test = next(
            (t for t in search_result["items"] if t["id"] == test_id), None
        )
        assert matrix_test is not None
        assert matrix_test["matrix_columns"] is not None

        # ===================================================================
        # STEP 8: Complete test workflow
        # ===================================================================
        finalize = client.patch(
            f"/api/v1/tests/{test_id}",
            json={"status": "finalized"},
        )
        assert finalize.status_code == 200
        assert finalize.json()["status"] == "finalized"

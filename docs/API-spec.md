## Table of Contents

1. [Test Management Service](#test-management-service)
2. [Photo Management Service](#photo-management-service)
3. [Defect Documentation Service](#defect-documentation-service)
4. [Audit & Review Service](#audit--review-service)
5. [AI Recognition Service](#ai-recognition-service) *(Planned)*

---

## Test Management Service

**Base Path:** `/api/v1/tests`

**Responsibility:**
Orchestrates quality test lifecycle management — handles test creation with photo uploads, status transitions, and review workflow. Coordinates with Photo and Defect services.

**Data Owned:**
* Quality test records
* Test status history
* Test metadata (product name, test type, deadlines)
* Review decisions (reviewer, timestamp, comment)

**API Endpoints:**

### [POST] /
Create a new quality test with optional photo uploads (multipart form data)

**Form Fields:**
- `jiraId` (required): Jira ticket ID
- `productName` (required): Product name
- `testType` (required): Type of test
- `requester` (required): Who requested the test
- `assignedTo` (optional): Assigned user
- `description` (optional): Test description
- `status` (optional): Initial status (default: "pending")
- `deadlineAt` (optional): Deadline in ISO 8601 format
- `photos` (optional): Multiple image files

**Response:**
```json
{
  "test": { ...TestResponse },
  "photos": [ ...PhotoResponse ],
  "failed_photos": [ { "filename": "...", "error": "..." } ],
  "message": "Test created successfully with N photo(s)"
}
```

### [GET] /
List all tests with pagination and filtering

**Query Parameters:**
- `limit`: Maximum records to return (default: 20, max: 100)
- `offset`: Number of records to skip (default: 0)
- `status`: Filter by test status (optional)
- `search`: Search across jira_id, product_name, requester, assigned_to (optional)

**Response:** `TestListResponse` — `{ items, total, limit, offset }`

### [GET] /{test_id}
Get detailed test information by ID

**Response:** `TestResponse`

### [POST] /{test_id}/review
Submit a review decision for a test (approve or reject)

**Authentication:** Bearer token required (reviewer role)

**Body:**
```json
{
  "decision": "approved" | "rejected",
  "comment": "Optional review comment"
}
```

**Response:** `TestResponse`

### [PATCH] /{test_id}
Update test details (partial update)

**Body:** JSON object with any subset of updatable fields (`status`, `assigned_to`, `test_type`, etc.)

**Response:** `TestResponse`

### [DELETE] /{test_id}
Delete a test and all associated photos

---

**TestResponse fields:** `id`, `jira_id`, `product_name`, `test_type`, `requester`, `assigned_to`, `description`, `status`, `deadline_at`, `created_at`, `updated_at`, `review_status`, `reviewed_by`, `reviewed_at`, `review_comment`

---

## Photo Management Service

**Base Path:** `/api/v1/photos`

**Responsibility:**
Manages product photo lifecycle — handles file uploads, MinIO storage integration, photo-test associations, and verification workflow.

**Data Owned:**
* Photo metadata (filename, file path, timestamp)
* Photo-test associations
* MinIO storage references
* Verification status per photo

**API Endpoints:**

### [POST] /upload
Upload a photo and link to a test

**Query Parameters:**
- `test_id` (required): Test ID to link the photo to

**Body:** Multipart form with image file

**Response:** `PhotoResponse`

### [GET] /test/{test_id}
Get all photos for a specific test

**Response:** `List[PhotoResponse]`

### [GET] /gallery
Get paginated gallery photos with aggregated defect summaries

**Query Parameters:**
- `page`: Page number (default: 1)
- `page_size`: Items per page (default: 20, max: 100)
- `severity`: Filter by defect severity (optional)
- `category_id`: Filter by defect category ID (optional)
- `test_type`: Filter by test type (optional)
- `test_status`: Filter by test status (optional)
- `has_defects`: Filter to photos with/without defects (optional boolean)
- `verification_status`: Filter by verification status (optional)

**Response:** `GalleryResponse` — `{ items: [GalleryPhotoResponse], total, page, page_size }`

**GalleryPhotoResponse fields:** `id`, `test_id`, `file_path`, `time_stamp`, `test_type`, `test_status`, `defect_count`, `highest_severity`, `category_ids`, `description`, `verification_status`

### [GET] /{photo_id}
Get a single photo's metadata by ID

**Response:** `PhotoResponse`

### [GET] /{photo_id}/image
Get photo image data directly (proxied through backend)

Returns the actual image binary with appropriate content-type header (`image/jpeg`, `image/png`, or `image/webp`). Includes `Cache-Control: public, max-age=3600`.

### [PATCH] /{photo_id}/verification
Update the verification status of a photo

**Body:**
```json
{ "verification_status": "pending" | "approved" | "rejected" }
```

**Response:** `PhotoResponse`

### [PATCH] /{photo_id}
Update photo metadata

**Body:**
```json
{ "description": "Optional new description" }
```

**Response:** `PhotoResponse`

### [DELETE] /{photo_id}
Delete a photo from storage and database

---

**PhotoResponse fields:** `id`, `test_id`, `file_path`, `time_stamp`, `analysis_results`, `description`, `verification_status`

---

## Defect Documentation Service

**Base Path:** `/api/v1/defects`

**Responsibility:**
Manages quality defect reporting and tracking — handles defect creation with visual annotations, severity classification, category management, and review workflow.

**Data Owned:**
* Defect records (category, severity, description)
* Visual annotations (coordinates, shapes, colors)
* Defect-photo associations
* Defect categories and definitions
* Review decisions per defect

**API Endpoints:**

### [GET] /categories
Get all available defect categories

**Response:** `List[CategoryResponse]`

### [POST] /photo/{photo_id}
Create a new defect for a specific photo

**Body:** `DefectCreate` — `{ category_id, severity, description?, annotations? }`

**Response:** `DefectResponse`

### [GET] /photo/{photo_id}
Get all defects for a specific photo

**Response:** `List[DefectResponse]`

### [GET] /{defect_id}
Get detailed defect information by ID

**Response:** `DefectResponse`

### [POST] /{defect_id}/review
Submit a review decision for a defect (approve or reject)

**Authentication:** Bearer token required (reviewer role)

**Body:**
```json
{
  "decision": "approved" | "rejected",
  "comment": "Optional review comment"
}
```

**Response:** `DefectResponse`

### [POST] /{defect_id}/annotations
Add an annotation to an existing defect

**Body:** `AnnotationCreate` — `{ category_id?, geometry, color? }`

**Response:** `AnnotationResponse`

### [PUT] /annotations/{annotation_id}
Update an existing annotation

**Body:** `{ category_id?, geometry?, color? }`

**Response:** `AnnotationResponse`

### [DELETE] /annotations/{annotation_id}
Delete an annotation by ID

**Response:** 204 No Content

### [PUT] /{defect_id}
Update an existing defect

**Response:** `DefectResponse`

### [DELETE] /{defect_id}
Delete a defect and all its annotations

---

**DefectResponse fields:** `id`, `photo_id`, `category_id`, `severity`, `description`, `created_at`, `updated_at`, `review_status`, `reviewed_by`, `reviewed_at`, `review_comment`, `annotations`

---

## Audit & Review Service

**Base Path:** `/api/v1/audit`

**Responsibility:**
Manages system audit trail — handles action logging with timestamps and filtering capabilities.

**Data Owned:**
* Audit log records (user actions, timestamps, metadata)

**API Endpoints:**

### [GET] /logs
Get audit logs with filtering

**Query Parameters:**
- `action`: Filter by action type (`CREATE`, `UPDATE`, `DELETE`, `STATUS_CHANGE`, `ASSIGN`, `UNASSIGN`, `REVIEW`, `UPLOAD`, `UPLOAD_FAILED`, etc.)
- `entity_type`: Filter by entity (`Test`, `Photo`, `Defect`)
- `entity_id`: Filter by specific entity ID
- `username`: Filter by username
- `created_from`: Start date filter (ISO 8601)
- `created_to`: End date filter (ISO 8601)
- `limit`: Maximum records (default: 50, max: 200)
- `offset`: Pagination offset (default: 0)
- `clear_filters`: If true, ignore all other filters and return unfiltered results (default: false)

### [GET] /logs/{log_id}
Get a specific audit log entry by ID

### [GET] /tests/{test_id}/activity
Get audit activity for a specific test

**Query Parameters:**
- `user_actions_only`: If true, return only user-initiated actions (default: true)
- `limit`: Maximum records (max: 500)
- `offset`: Pagination offset (default: 0)

---

## AI Recognition Service *(Planned)*

**Base Path:** `/api/v1/ai`

**Responsibility:**
Manages AI-powered design recognition from product photos — handles image preprocessing, model inference, confidence scoring, and recognition result storage.

**Data Owned:**
* AI recognition results
* Design matching history
* Confidence scores and suggestions

**Planned Endpoints:**

### *[Planned]* [POST] /recognize-design
Recognize product design from uploaded photo

### *[Planned]* [POST] /suggest-test-order
Suggest matching test orders based on recognized design

### *[Planned]* [GET] /recognition-history
Get AI recognition history for auditing and analytics

---


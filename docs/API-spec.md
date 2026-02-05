## Table of Contents

1. [Test Management Service](#test-management-service)
2. [Photo Management Service](#photo-management-service)
3. [Defect Documentation Service](#defect-documentation-service)
4. [Audit & Review Service](#audit--review-service)
5. [AI Recognition Service](#ai-recognition-service) *(Planned)*
6. [WebSocket Service](#websocket-service) *(Planned)*

---

## Test Management Service

**Base Path:** `/api/v1/tests`

**Responsibility:**
Orchestrates quality test lifecycle management — handles test creation with photo uploads, status transitions, and test-order linking. Coordinates with Photo and Defect services.

**Data Owned:**
* Quality test records
* Test status history
* External order associations
* Test metadata (product type, test type, deadlines)

**API Endpoints:**

### [POST] /
Create a new quality test with optional photo uploads (multipart form data)

**Form Fields:**
- `productId` (required): Product ID
- `testType` (required): Type of test
- `requester` (required): Who requested the test
- `assignedTo` (optional): Assigned user
- `status` (optional): Initial status (default: "pending")
- `deadlineAt` (optional): Deadline in ISO 8601 format
- `photos` (optional): Multiple image files

### [GET] /
List all tests with pagination

**Query Parameters:**
- `skip`: Number of records to skip (default: 0)
- `limit`: Maximum records to return (default: 100)

### [GET] /{test_id}
Get detailed test information by ID

### [PATCH] /{test_id}
Update test details (partial update)

### [DELETE] /{test_id}
Delete a test and all associated photos

---

## Photo Management Service

**Base Path:** `/api/v1/photos`

**Responsibility:**
Manages product photo lifecycle — handles file uploads, MinIO storage integration, and photo-test associations.

**Data Owned:**
* Photo metadata (filename, size, MIME type)
* Photo-test associations
* MinIO storage references

**API Endpoints:**

### [POST] /upload
Upload a photo and link to a test

**Query Parameters:**
- `test_id` (required): Test ID to link the photo to

**Body:** Multipart form with image file

### [GET] /test/{test_id}
Get all photos for a specific test

### [GET] /{photo_id}/url
Get a presigned URL for direct photo access

**Response:**
- `url`: Presigned URL
- `expires_in`: Expiration time in seconds (default: 3600)

### [GET] /{photo_id}/image
Get photo image data directly (proxied through backend)

Returns the actual image binary with appropriate content-type header. Works on any device without exposing MinIO URLs.

### [DELETE] /{photo_id}
Delete a photo from storage and database

---

## Defect Documentation Service

**Base Path:** `/api/v1/defects`

**Responsibility:**
Manages quality defect reporting and tracking — handles defect creation with visual annotations, severity classification, and category management.

**Data Owned:**
* Defect records (category, severity, description)
* Visual annotations (coordinates, shapes, colors)
* Defect-photo associations
* Defect categories and definitions

**API Endpoints:**

### [GET] /categories
Get all available defect categories

### [POST] /photo/{photo_id}
Create a new defect for a specific photo

**Body:** DefectCreate schema with category, severity, description, and optional annotations

### [GET] /photo/{photo_id}
Get all defects for a specific photo

### [GET] /{defect_id}
Get detailed defect information by ID

### [POST] /{defect_id}/annotations
Add an annotation to an existing defect

**Body:** AnnotationCreate schema with annotation details

### [PUT] /{defect_id}
Update an existing defect

### [DELETE] /{defect_id}
Delete a defect and all its annotations

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
- `action`: Filter by action type (CREATE, UPDATE, DELETE, etc.)
- `entity_type`: Filter by entity (Test, Photo, Defect)
- `entity_id`: Filter by specific entity ID
- `username`: Filter by username
- `created_from`: Start date filter (ISO 8601)
- `created_to`: End date filter (ISO 8601)
- `limit`: Maximum records (default: 50, max: 200)
- `offset`: Pagination offset (default: 0)

### [GET] /logs/{log_id}
Get a specific audit log entry by ID

### *[Planned]* [GET] /search
Global search across tests, photos, and defects

### *[Planned]* [GET] /reports/summary
Get dashboard statistics and summary metrics

### *[Planned]* [POST] /reports/export
Export data to CSV or JSON format

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

## WebSocket Service *(Planned)*

**Responsibility:**
Manages real-time bidirectional communication — handles persistent connections and broadcasts events to connected clients.

**Planned Connection Endpoint:**

### *[Planned]* [WebSocket] /ws
Establish persistent WebSocket connection for real-time updates

**Planned Events:**
- `test.created` - New test created
- `test.status_changed` - Test status updated
- `test.updated` - Test details modified
- `photo.uploaded` - Photo uploaded
- `defect.created` - Defect reported
- `defect.updated` - Defect modified
- `defect.deleted` - Defect removed
- `ai.recognition_complete` - AI processing finished

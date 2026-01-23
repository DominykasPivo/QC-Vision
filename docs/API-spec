## Table of Contents

1. [Test Management Service](#test-management-service)
2. [Photo Management Service](#photo-management-service)
3. [Defect Documentation Service](#defect-documentation-service)
4. [Audit & Review Service](#audit--review-service)
5. [AI Recognition Service](#ai-recognition-service)
6. [WebSocket Service](#websocket-service)

## Test Management Service

**Service Name:** `test_management`

**Responsibility:**  
Orchestrates quality test lifecycle management — handles test creation, status transitions, search/filtering, and test-order linking. Coordinates with Photo and Defect services.

**Data Owned:**
* Quality test records
* Test status history
* External order associations
* Test metadata (product type, test type, deadlines)

**API Endpoints:**

### [POST] /tests
Create a new quality test

### [GET] /tests
List all tests with filtering and pagination

### [GET] /tests/:testId
Get detailed test information including photos and defects

### [PATCH] /tests/:testId
Update test details

### [PATCH] /tests/:testId/status
Update test status with validation for allowed transitions

### [DELETE] /tests/:testId
Soft delete a test (only if status is 'open')

---

## Photo Management Service

**Service Name:** `photo_management`

**Responsibility:**  
Manages product photo lifecycle — handles multipart file uploads, thumbnail generation, MinIO storage integration, metadata extraction, and photo-test associations. Coordinates with AI Recognition for design detection.

**Data Owned:**
* Photo metadata (filename, size, dimensions, MIME type)
* Photo-test associations
* Upload history and capture method tracking
* MinIO storage references

**API Endpoints:**

### [POST] /photos/upload
Upload one or more photos and link to a test

### [GET] /photos
List photos with filtering

### [GET] /photos/:photoId
Get detailed photo information including defects and AI results

### [DELETE] /photos/:photoId
Delete a photo (only if no defects are linked)

### [POST] /photos/:photoId/link-test
Link an existing photo to a different test

---

## Defect Documentation Service

**Service Name:** `defect_documentation`

**Responsibility:**  
Manages quality defect reporting and tracking — handles defect creation with visual annotations, severity classification, category management, and defect-photo associations. Coordinates with Test Management for defect counts and alerts.

**Data Owned:**
* Defect records (category, severity, description)
* Visual annotations (coordinates, shapes, colors)
* Defect-photo-test associations
* Defect categories and definitions

**API Endpoints:**

### [POST] /defects
Create a new defect report with visual annotations

### [GET] /defects
List defects with filtering

### [GET] /defects/:defectId
Get detailed defect information

### [PATCH] /defects/:defectId
Update defect information

### [DELETE] /defects/:defectId
Delete a defect report

### [GET] /defects/categories
Get available defect categories with descriptions

---

## Audit & Review Service

**Service Name:** `audit_review`

**Responsibility:**  
Manages system audit trail and reporting — handles action logging with timestamps, global search across all entities, dashboard statistics generation, and data export to CSV/JSON. Provides traceability for compliance and quality metrics analysis.

**Data Owned:**
* Audit log records (user actions, timestamps, IP addresses)
* Search indices
* Dashboard statistics cache
* Export file metadata

**API Endpoints:**

### [GET] /audit/logs
Get audit logs with filtering

### [GET] /search
Global search across tests, photos, and defects

### [GET] /reports/summary
Get dashboard statistics and summary metrics

### [POST] /reports/export
Export data to CSV or JSON format

---

## AI Recognition Service

**Service Name:** `ai_recognition`

**Responsibility:**  
Manages AI-powered design recognition from product photos — handles image preprocessing, model inference, confidence scoring, multi-design suggestions, and recognition result storage. Provides fallback to manual search when confidence is low.

**Data Owned:**
* AI recognition results
* Design matching history
* Confidence scores and suggestions
* Processing performance metrics

**API Endpoints:**

### [POST] /ai/recognize-design
Recognize product design from uploaded photo

### [POST] /ai/suggest-test-order
Suggest matching test orders based on recognized design

### [GET] /ai/recognition-history
Get AI recognition history for auditing and analytics

---

## WebSocket Service

**Service Name:** `websocket`

**Responsibility:**  
Manages real-time bidirectional communication — handles persistent connections, broadcasts events to all connected clients, manages connection lifecycle, and coordinates real-time collaboration between multiple users.

**Data Owned:**
* Active WebSocket connections
* Connection metadata (user, timestamp)
* Event broadcast queue

**Connection Endpoint:**

### [WebSocket] /ws
Establish persistent WebSocket connection for real-time updates

**Events Emitted:**
- `test.created` - New test created
- `test.status_changed` - Test status updated
- `test.updated` - Test details modified
- `photo.uploaded` - Photo uploaded
- `defect.created` - Defect reported
- `defect.updated` - Defect modified
- `defect.deleted` - Defect removed
- `ai.recognition_complete` - AI processing finished
---


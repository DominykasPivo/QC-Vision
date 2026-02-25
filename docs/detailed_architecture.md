# QC Vision - System Architecture

## Architecture Diagram

```mermaid
flowchart LR
    subgraph CLIENT["CLIENT/PRESENTATION LAYER"]
        direction TB
        WEB["Desktop Browser<br/>:3000"]
        MOBILE["Mobile Browser<br/>:3000"]
    end

    subgraph FRONTEND["FRONTEND LAYER - Vite Dev Server :3000"]
        direction LR
        REACT["React <br/>TailwindCSS<br/>Polling (15-30s)"]
    end

    subgraph BACKEND["APPLICATION LAYER - Python + FastAPI :8000"]
        direction TB
        TEST["Test Management"]
        PHOTO["Photo Management"]
        DEFECT["Defect Documentation"]
        AUDIT["Audit & Review"]
        USER["User Management"]
        AI["AI Recognition<br/>(Planned)"]
    end

    subgraph DATA["DATA LAYER"]
        direction TB
        DB[("PostgreSQL<br/>:5432")]
        STORAGE[("MinIO<br/>:9000")]
        NOCODB["NocoDB<br/>:8080"]
    end

    WEB --> REACT
    MOBILE --> REACT
    REACT -->|"REST API Calls"| TEST
    REACT -->|"REST API Calls"| PHOTO
    REACT -->|"REST API Calls"| DEFECT
    REACT -->|"REST API Calls"| AUDIT
    REACT -->|"REST API Calls"| USER
    REACT -.->|"Polling<br/>15-30s intervals"| TEST
    REACT -.->|"Polling<br/>30s intervals"| PHOTO
    REACT -.->|"Polling<br/>15s intervals"| DEFECT
    REACT -.->|"Polling<br/>30s intervals"| AUDIT

    TEST -->|"CRUD Tests"| DB
    PHOTO -->|"Store Photos"| STORAGE
    PHOTO -->|"Photo Metadata"| DB
    DEFECT -->|"CRUD Defects"| DB
    AUDIT -->|"Store Logs"| DB
    USER -->|"CRUD Users"| DB
    AI -.->|"(Planned)"| DB

    NOCODB -->|"Admin Access"| DB
```

For a clearer architecture diagram, use draw.io [here](https://drive.google.com/file/d/15YkJcZwWqBhIJU4S3FyBjxDVHXOc-Kmm/view?usp=sharing)

## Overview

QC Vision follows a **modular monolithic architecture** with clear separation of concerns across four main layers:

1. **Client/Presentation Layer** - Web and mobile browser interfaces
2. **Frontend Layer** - React SPA served by Vite dev server
3. **Application Layer** - Core business logic modules (FastAPI)
4. **Data Layer** - PostgreSQL database, MinIO object storage, and NocoDB admin

### Design Patterns

The application implements several key software design patterns for maintainability and scalability:

- **Service Layer Pattern**: Business logic separated from HTTP routing (e.g., `TestsService`, `PhotoService`)
- **Repository Pattern**: Data access abstracted through SQLAlchemy ORM
- **Dependency Injection**: FastAPI's `Depends()` for database sessions and security
- **Middleware Pattern**: Audit logging via custom ASGI middleware
- **Singleton Pattern**: Single MinIO storage instance via `@lru_cache(maxsize=1)`

See [DESIGN_PATTERNS.md](DESIGN_PATTERNS.md) for detailed explanations and code examples of each pattern.

## Architecture Layers

### Client/Presentation Layer

The client layer consists of:
- **Desktop Browser** - Full-featured web application
- **Mobile Browser** - Touch-optimized responsive interface

Both clients access the React SPA served on port 3000.

### Frontend Layer (Vite :3000)

**React Single Page Application:**
- Built with React 18 + TypeScript + Vite for fast development
- React Router v7 for client-side routing
- TailwindCSS for styling
- Radix UI component primitives
- Header-based authentication (X-User, X-Role)
- Communicates with backend via REST API calls

**Frontend Routes:**
- `/login` - User authentication
- `/tests` - Test list and management
- `/tests/:id` - Individual test details
- `/create` - Create new test
- `/gallery` - Photo gallery with filtering
- `/photos/:photoId` - Photo defect annotation
- `/audit` - Audit log viewer
- `/review` - Review queue for tests

### Application Layer (Python + FastAPI :8000)

**Unified Backend Service:**
All modules run within a single FastAPI application, providing:

**Implemented Modules:**

**1. Test Management (`/api/v1/tests`)**
- Create and manage quality tests
- Track test status (pending, in_progress, completed, failed)
- Link tests to orders via jira_id
- Assign tests to users
- Set deadlines and track progress
- Review workflow (pending, approved, rejected)
- Search and filter tests
- Pagination support

**2. Photo Management (`/api/v1/photos`)**
- Upload photos (multi-file support)
- Store original and processed images in MinIO
- Image processing (resize, format conversion, RGB normalization)
- Thumbnail generation
- Proxy image retrieval from MinIO
- Gallery view with aggregated defect data
- Advanced filtering (severity, category, test type, verification status)
- Photo verification workflow

**3. Defect Documentation (`/api/v1/defects`)**
- Create and track quality defects
- Visual annotations with geometric data (rectangles, polygons, circles)
- Defect categorization system
- Severity levels (minor, major, critical)
- JSON-based annotation geometry storage
- Review workflow for defects
- Bulk operations support

**4. Audit & Review (`/api/v1/audit`)**
- Automatic action logging via middleware
- Track CREATE, UPDATE, DELETE, UPLOAD operations
- Entity type tracking (Test, Photo, Defect, User)
- Metadata capture (test_id, file names, etc.)
- Filtering and search capabilities
- User action history

**5. User Management (`/api/v1/users`)**
- Simple header-based authentication
- Role-based access control (user, reviewer, admin)
- Auto-create users on first login
- User profile endpoint (`/api/v1/users/me`)

**Security & Middleware:**
- `require_reviewer()` dependency for protected endpoints
- Custom audit middleware for automatic logging
- CORS middlewaacross multiple pages (15-30 second intervals when tab is visible)
- Window focus event refresh for defects (TestDetails page)
- Page-specific polling implementation

**Real-Time Updates:**
- HTTP polling for tests only (30-second intervals when tab is visible)
- Window focus event refresh for defects (TestDetails page)
- See "Real-Time Updates" section for details

**Planned Modules:**
- **AI Recognition** - Design recognition from photos
- **WebSocket Server** - Real-time updates and collaboration (currently using polling)

### Data Layer

**PostgreSQL (:5432)**
- Stores structured data (tests, photos metadata, defects, audit logs, users)
- Handles all CRUD operations
- Provides relational data integrity
- Connection pooling (pool_size: 20, max_overflow: 30)
- Connection recycling (3600s) and health checks (pool_pre_ping)
- Supports both PostgreSQL and SQLite (for testing)

**Data Models:**

1. **quality_tests** - Quality test records
   - Core fields: jira_id, product_name, test_type, requester, assigned_to
   - Status tracking: pending, in_progress, completed, failed
   - Review fields: review_status, reviewed_by, reviewed_at, review_comment
   - Timestamps: created_at, updated_at, deadline_at

2. **photos** - Photo metadata
   - Links to quality_tests via test_id (CASCADE delete)
   - Storage: file_path (MinIO object key)
   - Verification: verification_status (pending, verified, rejected)
   - Optional: description, analysis_results
   - Timestamp: time_stamp

3. **defects** - Defect records
   - Links to photos via photo_id (CASCADE delete)
   - Fields: description, severity (minor, major, critical)
   - Relationship: one-to-many with defect_annotations
   - Review fields: review_status, reviewed_by, reviewed_at, review_comment
   - Timestamp: created_at

4. **defect_annotations** - Visual annotation geometry
   - Links to defects via defect_id (RESTRICT delete)
   - Links to defect_category via category_id (RESTRICT delete)
   - Geometry data: JSONB field (rectangles, polygons, circles, freehand)
   - Color coding for visual distinction
   - Timestamp: created_at

5. **defect_category** - Defect classification
   - Categories: scratch, dent, discoloration, misalignment, etc.
   - Active/inactive flag: is_active
   - Unique constraint on name

6. **audit_logs** - Action tracking
   - Fields: action, entity_type, entity_id, username
   - Metadata: JSON field for additional context
   - Auto-generated by middleware
   - Timestamp: created_at

7. **users** - User accounts
   - Fields: username (unique), role (user, reviewer, admin)
   - Auto-created on first authentication
   - Used for header-based auth

**MinIO (:9000, :9001)**
- S3-compatible object storage
- Stores original and processed photo files
- Bucket: `qc-vision-photos` (auto-created)
- Public read access policy
- Console available on port 9001 for administration
- Object naming: UUID-based with original extension

**NocoDB (:8080)**
- Database admin UI
- Provides spreadsheet-like interface to PostgreSQL data
- Useful for data management and debugging

## Data Flow

### Request Flow
```
Client → React SPA (:3000) → FastAPI Backend (:8000) → Database/Storage → Response
```

### Authentication Flow
```
Client → Login Page → Set X-User Header → All Requests Include Headers → Role Validation
```

### Photo Upload Flow
```
Client → React SPA → POST /api/v1/photos/upload 
      → Validation (size, format) 
      → Image Processing (resize, RGB convert)
      → MinIO Storage 
      → DB Metadata Save 
      → Audit Log 
      → Response
```

### Photo Retrieval Flow
```
Client → React SPA → GET /api/v1/photos/{id}/image 
      → Backend Proxy 
      → MinIO Object Fetch 
      → Stream Response
```

### Defect Annotation Flow
```
Client → Photo Viewer → Create Annotation 
      → POST /api/v1/defects/photo/{photo_id} 
      → Save Defect + Annotations (JSONB geometry)
      → Update Photo Metadata
      → Audit Log
      → Response
```

### Audit Logging Flow
```
Any API Request → Custom Middleware Intercepts
      → Infer Action (CREATE/UPDATE/DELETE/UPLOAD)
      → Extract Entity Info
      → Parse Response for IDs
      → Log to audit_logs Table
      → Continue Response
```

## API Endpoints

### Core Endpoints

**Root & Health:**
- `GET /` - API information
- `GET /health` - Health check (for Docker/load balancers)
- `GET /api/v1/status` - API status and service availability

### Test Management (`/api/v1/tests`)

- `POST /` - Create new test (with optional photo uploads)
- `GET /` - List all tests (paginated)
- `GET /{test_id}` - Get test details
- `PATCH /{test_id}` - Update test
- `DELETE /{test_id}` - Delete test (cascades to photos and defects)
- `POST /{test_id}/review` - Submit test review (reviewer only)
- `GET /statistics` - Get test statistics
- `GET /summary` - Get test summary counts

### Photo Management (`/api/v1/photos`)

- `POST /upload` - Upload photos for a test
- `GET /test/{test_id}` - Get all photos for a test
- `GET /{photo_id}` - Get photo metadata
- `GET /{photo_id}/image` - Stream photo image
- `PATCH /{photo_id}` - Update photo details
- `DELETE /{photo_id}` - Delete photo
- `POST /{photo_id}/verify` - Verify photo (reviewer only)
- `GET /gallery` - Get paginated gallery with filters
  - Query params: page, page_size, severity, category_id, test_type, test_status, has_defects, verification_status

### Defect Management (`/api/v1/defects`)

- `GET /categories` - List all defect categories
- `POST /photo/{photo_id}` - Create defect with annotations
- `GET /photo/{photo_id}` - Get all defects for a photo
- `GET /{defect_id}` - Get defect details
- `PATCH /{defect_id}` - Update defect
- `DELETE /{defect_id}` - Delete defect
- `POST /{defect_id}/review` - Submit defect review (reviewer only)
- `POST /{defect_id}/annotations` - Add annotation to defect
- `PATCH /annotations/{annotation_id}` - Update annotation
- `DELETE /annotations/{annotation_id}` - Delete annotation

### Audit Log (`/api/v1/audit`)

- `GET /logs` - Get audit logs (paginated)
  - Query params: page, page_size, action, entity_type, entity_id, username, created_from, created_to, clear_filters
- `GET /logs/{log_id}` - Get specific audit log entry
- `GET /tests/{test_id}/activity` - Get activity history for a test
  - Query params: user_actions_only, limit, offset

### User Management (`/api/v1/users`)

- `GET /me` - Get current user profile (auto-creates if needed)

### Authentication Headers

All authenticated requests require:
- `X-User: {username}` (5 characters)
- `X-Role: {role}` (user, reviewer, admin) - Optional, defaults to "user"

Protected endpoints (reviewer/admin only) use `require_reviewer()` dependency.

## Module Structure

### Backend Module Organization

Each backend module follows a consistent structure:

```
app/modules/{module_name}/
├── __init__.py         # Module initialization
├── models.py           # SQLAlchemy ORM models
├── schemas.py          # Pydantic request/response models
├── router.py           # FastAPI route handlers
├── service.py          # Business logic layer
└── {additional}.py     # Module-specific utilities
```

**Example - Photos Module:**
```
app/modules/photos/
├── __init__.py
├── models.py           # Photo model
├── schemas.py          # PhotoResponse, PhotoCreate, etc.
├── router.py           # HTTP endpoints
├── service.py          # PhotoService class
├── storage.py          # PhotoStorage (MinIO integration)
├── processing.py       # Image processing utilities
└── validation.py       # File validation utilities
```

**Service Layer Pattern:**
- Each module has a service class (e.g., `PhotoService`, `TestsService`)
- Services contain business logic, isolated from HTTP concerns
- Services are injected into route handlers
- Promotes testability and separation of concerns

**Key Services:**
- `tests_service` - Test CRUD, search, filtering, statistics
- `photo_service` - Photo upload, processing, gallery, validation
- `defects_service` - Defect CRUD, annotations, categories
- `audit_service` - Log creation, filtering, test activity
- `photo_storage` - MinIO object storage operations

### Frontend Component Organization

```
src/
├── components/          # Reusable UI components
│   ├── annotations/    # Defect annotation tools
│   ├── layout/         # Layout components (AppShell, etc.)
│   └── ui/             # Base UI components (Radix primitives)
├── pages/              # Route-level components
│   ├── Login.tsx
│   ├── TestsList.tsx
│   ├── TestDetails.tsx
│   ├── Gallery.tsx
│   ├── PhotoDefects.tsx
│   ├── AuditLog.tsx
│   └── Review.tsx
├── lib/                # Utilities and helpers
│   ├── api/            # API client functions
│   ├── auth.ts         # Authentication utilities
│   ├── utils.ts        # General utilities
│   └── validation/     # Form validation
└── routes.tsx          # Route configuration
```

## Real-Time Updates

### Current Implementation: Polling
real-time updates across multiple pages:

**Polling Strategy:**

| Page | Data | Interval | Description |
|------|------|----------|-------------|
| **Tests List** (AppShell) | Tests | 30s | Auto-refreshes test list for all pages |
| **PhotoDefects** | Defects & Photo | 15s | Fast updates for active annotation work |
| **Gallery** | Gallery Photos | 30s | Monitors new photos and defect changes |
| **AuditLog** | Audit Events | 30s | Real-time activity monitoring |
| **Review** | Pending Tests | 30s | Review queue updates |
| **TestDetails** | Defects (focus only) | On focus | Refreshes when tab regains focus |

**Implementation Details:**
- **Optimization**: All polling stops when tab is not visible (`document.hidden`)
- **Cleanup**: Intervals cleared on component unmount
- **Filter-aware**: Audit log polling respects active filters

**Code Pattern:**
```typescript
useEffect(() => {
  const POLL_MS = 30_000; // or 15_000 for high-priority data
  const id = setInterval(() => {
    if (!document.hidden) {
      loadData(); // Refetch current data
    }
  }, POLL_MS);

  return () => clearInterval(id);
}, [dependencies]);
```

**Benefits:**
- Simple HTTP-based architecture
- No persistent connection management
- Works across all network configurations
- Minimal server load (polls only when tab visible)
- Page-specific intervals optimize for use case

**Coverage:**
- ✅ Tests - auto-refreshed every 30s (global)
- ✅ Defects - auto-refreshed every 15s (PhotoDefects page)
- ✅ Gallery - auto-refreshed every 30s (Gallery page)
- ✅ Audit logs - auto-refreshed every 30s (Audit page)
- ✅ Review queue - auto-refreshed every 30s (Review page)
- ⚠️ Individual photos - only on window focus (TestDetails)
- Multi-user collaboration requires manual refreshes

## Technology Stack

**Frontend:**
- React 18 + TypeScript
- Vite (build tool and dev server)
- React Router DOM v7 (client-side routing)
- TailwindCSS (utility-first styling)
- Radix UI (accessible component primitives)
- Axios (HTTP client)

**Backend:**
- Python 3.11+
- FastAPI 0.104+ (REST API framework)
- Uvicorn (ASGI server)
- SQLAlchemy 2.0+ (PostgreSQL ORM)
- Pydantic 2.5+ (data validation)
- python-multipart (file upload handling)
- minio 7.2+ (MinIO/S3 integration)
- Pillow 10.1+ (image processing)
- Alembic 1.12+ (database migrations)
- Psycopg2 (PostgreSQL driver)

**Testing:**
- pytest 7.4+
- pytest-asyncio (async test support)
- pytest-cov (coverage reporting)

**Database:**
- PostgreSQL 15

**Object Storage:**
- MinIO (S3-compatible)

**Admin UI:**
- NocoDB

**Deployment:**
- Docker + Docker Compose
- Multi-container architecture

## Port Configuration

| Service | Port(s) | Purpose |
|---------|---------|---------|
| Vite Frontend | 3000 | React SPA dev server |
| FastAPI Backend | 8000 | REST API (all modules) |
| PostgreSQL | 5432 | Database |
| MinIO API | 9000 | Object storage API |
| MinIO Console | 9001 | MinIO web interface |
| NocoDB | 8080 | Database admin UI |

## Docker Containers

| Implemented Polling Patterns:**

1. **Global Test Polling (AppShell.tsx):**
   ```typescript
   const POLL_MS = 30_000;
   const id = setInterval(() => {
     if (!document.hidden) {
       refreshTests(); // Fetches /api/v1/tests/?limit=100
     }
   }, POLL_MS);
   ```

2. **Page-Specific Polling:**
   - **PhotoDefects.tsx**: 15-second interval for defects and photo data
   - **Gallery.tsx**: 30-second interval for gallery photos
   - **AuditLog.tsx**: 30-second interval for audit events (respects filters)
   - **Review.tsx**: 30-second interval for pending tests

3. **Focus-Based Refresh (TestDetails.tsx):**
   ```typescript
   window.addEventListener('focus', refetchDefects);
   // Refreshes defects when tab gains focus
   ```

**Design Decisions:**
- **15s interval** for active work (defect annotation) - prioritizes collaboration
- **30s interval** for monitoring (tests, gallery, audit, review) - balances freshness with load
- Polling only occurs when browser tab is visible
- Prevents unnecessary network traffic from background tabs
- All intervals properly cleaned up on component unmount
- Audit log polling re-initializes when filters change to respect new filter state

**Server Load Optimization:**
- Only visible tabs poll data
- Longer intervals (30s) for less critical data
- Shorter intervals (15s) only where real-time collaboration matters most
- Focus events provide instant updates without continuous polling

**Future Improvements:**
- Implement WebSocket for push-based updates
- Add optimistic UI updates for better UX
- Consider server-sent events (SSE) as middle ground
window.addEventListener('focus', refetchDefects);
// Refetches defects for current photo when tab gains focus
```

**Design Decisions:**
- Test polling only occurs when browser tab is visible
- Prevents unnecessary network traffic from background tabs
- 30-second interval balances freshness with server load
- Window focus events provide instant defect updates on tab switch
- Photos, gallery, and audit logs require manual refresh

**Future Improvements:**
- Extend polling to photos and audit logs
- Implement WebSocket for true real-time updates across all entities
- Add optimistic UI updates for better UX

## Key Features & Implementation Details

### Authentication & Authorization

**Header-Based Authentication:**
- No JWT tokens or sessions required
- Uses `X-User` header (5-character username)
- Optional `X-Role` header (user, reviewer, admin)
- Users auto-created on first request via `/api/v1/users/me`

**Role-Based Access Control:**
- `user` - Basic access (view, create)
- `reviewer` - Can approve/reject tests and defects
- `admin` - Full system access
- Protected endpoints use `require_reviewer()` dependency

### Image Processing Pipeline

**Upload Validation:**
- Max file size: 10MB per file
- Allowed formats: JPEG, JPG, PNG, WEBP, GIF, BMP
- Integrity checks using PIL

**Processing Steps:**
1. Validate file size and format
2. Open and verify image with Pillow
3. Convert to RGB (if needed)
4. Resize if larger than 2000px (maintaining aspect ratio)
5. Generate UUID-based filename
6. Save to MinIO bucket
7. Store metadata in PostgreSQL

**Storage Strategy:**
- Original filename preserved in metadata
- UUID-based object keys in MinIO
- Public read access for easy retrieval
- Proxy endpoint for secure access control

### Defect Annotation System

**Annotation Types:**
- Rectangle (bounding boxes)
- Polygon (multi-point shapes)
- Circle (radial areas)
- Freehand (custom paths)

**Data Storage:**
- Geometry stored as JSONB in PostgreSQL
- Supports complex shape definitions
- Color-coded for visual distinction
- Linked to defect categories

**Review Workflow:**
- Defects can be reviewed by authorized users
- Status: pending, approved, rejected
- Review comments and timestamps tracked
- Reviewer attribution

### Audit Middleware

**Automatic Logging:**
- Custom ASGI middleware intercepts all requests
- Excludes documentation endpoints (/docs, /redoc, /openapi.json, /health)
- Infers action from HTTP method (POST=CREATE, PUT/PATCH=UPDATE, DELETE=DELETE)
- Extracts entity type from URL path
- Parses response body for entity IDs
- Stores in audit_logs table

**Captured Information:**
- Action type (CREATE, UPDATE, DELETE, UPLOAD, READ)
- Entity type (Test, Photo, Defect, User, etc.)
- Entity ID (from response)
- Username (from X-User header)
- Metadata (test_id, file names, etc.)
- Timestamp

### Database Session Management

**Connection Pooling:**
- Pool size: 20 connections
- Max overflow: 30 connections
- Pool recycle: 3600 seconds
- Pool timeout: 30 seconds
- Pre-ping health checks enabled

**Session Lifecycle:**
- Session created per request via `get_db()` dependency
- Automatic commit on success
- Rollback on exception
- Guaranteed cleanup in finally block

### Error Handling

**HTTP Exceptions:**
- 400 Bad Request - Validation errors
- 403 Forbidden - Insufficient permissions
- 404 Not Found - Resource not found
- 500 Internal Server Error - Unexpected errors

**Logging:**
- Structured logging with timestamps
- Log levels: DEBUG, INFO, WARNING, ERROR
- Module-specific loggers
- Configurable via LOG_LEVEL environment variable

## Environment Configuration

**Backend Environment Variables:**
```
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/qcvision_db

# MinIO Object Storage
MINIO_ENDPOINT=minio:9000
MINIO_PUBLIC_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=qc-vision-photos

# Application
LOG_LEVEL=INFO
ENV=production
```

**Frontend Environment Variables:**
```
VITE_API_URL=http://localhost:8000
```

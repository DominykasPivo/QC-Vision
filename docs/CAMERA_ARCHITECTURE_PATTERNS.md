# Camera IoT - Architecture & Software Patterns

**Date:** March 11, 2026
**Purpose:** Deep dive into architecture decisions and software design patterns for camera integration

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Design Patterns](#design-patterns)
3. [Architecture Decisions & Rationale](#architecture-decisions--rationale)
4. [Data Flow & State Management](#data-flow--state-management)
5. [Security Architecture](#security-architecture)
6. [Performance & Scalability](#performance--scalability)
7. [Error Handling Strategy](#error-handling-strategy)

---

## Architecture Overview

### Layered Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  PRESENTATION LAYER                                         │
│  React Components + Hooks (UI/UX, user interaction)         │
├─────────────────────────────────────────────────────────────┤
│  APPLICATION LAYER                                          │
│  FastAPI Routers + Services (business logic)                │
├─────────────────────────────────────────────────────────────┤
│  DOMAIN LAYER                                               │
│  Models + Schemas (data structures, validation)             │
├─────────────────────────────────────────────────────────────┤
│  INFRASTRUCTURE LAYER                                       │
│  Database + Storage + Camera Adapters (I/O operations)      │
└─────────────────────────────────────────────────────────────┘
```

### Key Architectural Principles

1. **Separation of Concerns**: Each layer has distinct responsibility
2. **Dependency Inversion**: High-level modules don't depend on low-level details
3. **Single Responsibility**: Each component does one thing well
4. **Open/Closed Principle**: Open for extension, closed for modification
5. **Interface Segregation**: Clients shouldn't depend on unused interfaces

---

## Design Patterns

### 1. **Adapter Pattern** ⭐ Core Pattern

**Problem:** Need to support multiple camera types (USB webcam, DroidCam, RTSP, ONVIF) with different APIs

**Solution:** Camera Adapter interface abstracts implementation details

```python
# backend/app/modules/camera/adapters/base.py

from abc import ABC, abstractmethod
from typing import Optional, Dict, Any

class CameraAdapter(ABC):
    """
    Abstract base class for all camera adapters.
    Allows supporting different camera types with unified interface.
    """

    @abstractmethod
    async def connect(self, connection_params: Dict[str, Any]) -> bool:
        """Establish connection to camera"""
        pass

    @abstractmethod
    async def disconnect(self) -> bool:
        """Close camera connection"""
        pass

    @abstractmethod
    async def get_stream_url(self) -> Optional[str]:
        """Get URL for video stream"""
        pass

    @abstractmethod
    async def capture_frame(self) -> bytes:
        """Capture single frame as JPEG bytes"""
        pass

    @abstractmethod
    async def get_capabilities(self) -> Dict[str, Any]:
        """Get camera capabilities (zoom, focus, resolution options)"""
        pass

    @abstractmethod
    async def apply_settings(self, settings: Dict[str, Any]) -> bool:
        """Apply camera settings (zoom, focus, etc.)"""
        pass
```

**Implementation Example:**

```python
# backend/app/modules/camera/adapters/browser.py

class BrowserCameraAdapter(CameraAdapter):
    """
    Adapter for browser-based cameras (webcams accessed via MediaStream API).
    No server-side connection needed - handled client-side.
    """

    async def connect(self, connection_params: Dict[str, Any]) -> bool:
        # Browser cameras connect client-side
        return True

    async def get_stream_url(self) -> Optional[str]:
        # No stream URL - uses MediaStream API directly
        return None

    async def capture_frame(self) -> bytes:
        # Frame captured client-side, sent to server
        raise NotImplementedError("Browser cameras capture client-side")

    async def get_capabilities(self) -> Dict[str, Any]:
        return {
            "zoom": True,  # Digital zoom via CSS/Canvas
            "focus": False,  # Depends on browser support
            "resolution": ["1920x1080", "1280x720", "640x480"]
        }
```

```python
# backend/app/modules/camera/adapters/droidcam.py

import httpx

class DroidCamAdapter(CameraAdapter):
    """
    Adapter for DroidCam smartphone cameras.
    Connects via HTTP to DroidCam server on phone.
    """

    def __init__(self, ip: str, port: int = 4747):
        self.ip = ip
        self.port = port
        self.base_url = f"http://{ip}:{port}"
        self.client = httpx.AsyncClient()

    async def connect(self, connection_params: Dict[str, Any]) -> bool:
        try:
            # Test connection
            response = await self.client.get(f"{self.base_url}/status")
            return response.status_code == 200
        except Exception:
            return False

    async def disconnect(self) -> bool:
        await self.client.aclose()
        return True

    async def get_stream_url(self) -> Optional[str]:
        # DroidCam provides MJPEG stream
        return f"{self.base_url}/video"

    async def capture_frame(self) -> bytes:
        response = await self.client.get(f"{self.base_url}/photo.jpg")
        return response.content

    async def get_capabilities(self) -> Dict[str, Any]:
        return {
            "zoom": True,
            "focus": True,
            "flash": True,
            "resolution": ["1920x1080", "1280x720"]
        }

    async def apply_settings(self, settings: Dict[str, Any]) -> bool:
        # DroidCam specific settings API
        if "flash" in settings:
            await self.client.get(
                f"{self.base_url}/settings",
                params={"flash": settings["flash"]}
            )
        return True
```

**Benefits:**
- ✅ Add new camera types without changing existing code
- ✅ Swap camera implementations at runtime
- ✅ Test with mock adapters
- ✅ Consistent interface across all camera types

---

### 2. **Service Layer Pattern** ⭐ Core Pattern

**Problem:** Need to separate business logic from HTTP routing and data access

**Solution:** Dedicated service classes handle business operations

```python
# backend/app/modules/camera/service.py

class CameraService:
    """
    Service layer for camera management.
    Encapsulates business logic separate from HTTP routing.
    """

    def __init__(self):
        self._adapters: Dict[str, CameraAdapter] = {}
        self._register_adapters()

    def _register_adapters(self):
        """Register available camera adapter types"""
        self._adapters['browser'] = BrowserCameraAdapter()
        self._adapters['droidcam'] = DroidCamAdapter
        self._adapters['rtsp'] = RTSPAdapter

    async def register_camera(
        self,
        db: Session,
        camera_data: CameraDeviceCreate,
        username: str
    ) -> CameraDevice:
        """
        Business logic for registering a new camera.
        Validates, creates adapter, stores in database.
        """
        # Business validation
        if camera_data.type not in self._adapters:
            raise ValueError(f"Unsupported camera type: {camera_data.type}")

        # Create adapter instance
        if camera_data.type != 'browser':
            adapter_class = self._adapters[camera_data.type]
            adapter = adapter_class(**camera_data.connection_params)

            # Test connection
            if not await adapter.connect(camera_data.connection_params):
                raise ValueError("Failed to connect to camera")

        # Persist to database
        camera = CameraDevice(
            name=camera_data.name,
            type=camera_data.type,
            status='online',
            capabilities=camera_data.capabilities,
            last_seen=datetime.now(timezone.utc)
        )
        db.add(camera)
        db.commit()
        db.refresh(camera)

        return camera

    async def capture_photo(
        self,
        db: Session,
        camera_id: int,
        test_id: int,
        settings: Optional[Dict[str, Any]] = None
    ) -> Photo:
        """
        Business logic for capturing photo from camera.
        Handles adapter selection, capture, storage, database persistence.
        """
        # Get camera from database
        camera = db.query(CameraDevice).filter(CameraDevice.id == camera_id).first()
        if not camera:
            raise ValueError("Camera not found")

        # Get appropriate adapter
        adapter = self._get_adapter(camera)

        # Apply settings if provided
        if settings:
            await adapter.apply_settings(settings)

        # Capture frame
        photo_bytes = await adapter.capture_frame()

        # Process and store (delegate to photo service)
        from app.modules.photos.service import photo_service

        # Convert bytes to file-like object
        from io import BytesIO
        photo_file = BytesIO(photo_bytes)

        # Upload using existing photo service
        photo = await photo_service.upload_photo(
            db=db,
            file=photo_file,
            filename=f"camera_{camera_id}_capture.jpg",
            test_id=test_id
        )

        # Update camera metadata on photo
        photo.camera_id = camera_id
        photo.capture_mode = 'camera_manual'
        photo.camera_settings = settings
        db.commit()

        return photo
```

**Benefits:**
- ✅ Business logic testable in isolation
- ✅ Reusable across multiple endpoints
- ✅ Single source of truth for business rules
- ✅ Easy to add caching, logging, validation

---

### 3. **Repository Pattern** (Implicit via SQLAlchemy)

**Problem:** Need to abstract data access from business logic

**Solution:** SQLAlchemy ORM acts as repository layer

```python
# Direct database queries isolated to service layer
camera = db.query(CameraDevice).filter(CameraDevice.id == camera_id).first()

# Not scattered throughout routers!
```

**Benefits:**
- ✅ Business logic doesn't depend on database details
- ✅ Can swap database implementations
- ✅ Easier to mock for testing

---

### 4. **Dependency Injection Pattern** ⭐ Core Pattern

**Problem:** Need flexible, testable components without tight coupling

**Solution:** FastAPI's `Depends()` for injecting dependencies

```python
# backend/app/modules/camera/router.py

from fastapi import Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.security import get_actor

@router.post("/cameras/register")
async def register_camera(
    camera_data: CameraDeviceCreate,
    db: Session = Depends(get_db),          # ← Injected database session
    actor: dict = Depends(get_actor),       # ← Injected authenticated user
    camera_service: CameraService = Depends(get_camera_service)  # ← Injected service
):
    """
    Dependencies injected automatically by FastAPI.
    Makes testing easy - can inject mocks.
    """
    username = actor["username"]
    return await camera_service.register_camera(db, camera_data, username)
```

**Testing Benefits:**

```python
# tests/test_camera_router.py

def test_register_camera():
    # Override dependencies with mocks
    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[get_actor] = lambda: {"username": "testuser"}

    response = client.post("/api/v1/cameras/register", json=test_data)
    assert response.status_code == 201
```

---

### 5. **Factory Pattern** (Camera Adapter Factory)

**Problem:** Need to create different adapter instances based on camera type

**Solution:** Factory method in service layer

```python
class CameraService:
    def _get_adapter(self, camera: CameraDevice) -> CameraAdapter:
        """
        Factory method: creates appropriate adapter based on camera type.
        """
        if camera.type == 'browser':
            return BrowserCameraAdapter()

        elif camera.type == 'droidcam':
            # Parse connection params from database
            params = json.loads(camera.connection_params or '{}')
            return DroidCamAdapter(
                ip=params.get('ip'),
                port=params.get('port', 4747)
            )

        elif camera.type == 'rtsp':
            return RTSPAdapter(url=camera.connection_url)

        elif camera.type == 'onvif':
            params = json.loads(camera.connection_params or '{}')
            return ONVIFAdapter(
                ip=params['ip'],
                port=params['port'],
                user=params['user'],
                password=params['password']
            )

        else:
            raise ValueError(f"Unknown camera type: {camera.type}")
```

---

### 6. **Strategy Pattern** (Camera Capture Strategies)

**Problem:** Different capture strategies (manual, auto, scheduled)

**Solution:** Strategy pattern for capture modes

```python
from abc import ABC, abstractmethod

class CaptureStrategy(ABC):
    @abstractmethod
    async def should_capture(self, context: Dict[str, Any]) -> bool:
        """Determine if photo should be captured"""
        pass

class ManualCaptureStrategy(CaptureStrategy):
    async def should_capture(self, context: Dict[str, Any]) -> bool:
        # Always capture when manually triggered
        return True

class AutoCaptureStrategy(CaptureStrategy):
    def __init__(self, detection_service):
        self.detection_service = detection_service

    async def should_capture(self, context: Dict[str, Any]) -> bool:
        # Capture only if object detected with high confidence
        frame = context.get('frame')
        result = await self.detection_service.detect(frame)
        return result.confidence > 0.85

class ScheduledCaptureStrategy(CaptureStrategy):
    def __init__(self, interval_seconds: int):
        self.interval = interval_seconds
        self.last_capture = None

    async def should_capture(self, context: Dict[str, Any]) -> bool:
        # Capture at regular intervals
        now = datetime.now()
        if not self.last_capture:
            return True

        elapsed = (now - self.last_capture).total_seconds()
        if elapsed >= self.interval:
            self.last_capture = now
            return True

        return False
```

---

### 7. **Observer Pattern** (WebSocket Events)

**Problem:** Need to notify frontend of camera events in real-time

**Solution:** WebSocket-based observer pattern

```python
# backend/app/modules/camera/websocket.py

class CameraEventManager:
    """
    Observer pattern: manages subscribers to camera events.
    """

    def __init__(self):
        self._subscribers: Dict[int, List[WebSocket]] = {}

    async def subscribe(self, camera_id: int, websocket: WebSocket):
        """Subscribe to camera events"""
        if camera_id not in self._subscribers:
            self._subscribers[camera_id] = []
        self._subscribers[camera_id].append(websocket)

    async def unsubscribe(self, camera_id: int, websocket: WebSocket):
        """Unsubscribe from camera events"""
        if camera_id in self._subscribers:
            self._subscribers[camera_id].remove(websocket)

    async def notify(self, camera_id: int, event: Dict[str, Any]):
        """Notify all subscribers of event"""
        if camera_id not in self._subscribers:
            return

        for websocket in self._subscribers[camera_id]:
            await websocket.send_json(event)

# Usage
event_manager = CameraEventManager()

@router.websocket("/ws/camera/{camera_id}")
async def camera_websocket(websocket: WebSocket, camera_id: int):
    await websocket.accept()
    await event_manager.subscribe(camera_id, websocket)

    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    finally:
        await event_manager.unsubscribe(camera_id, websocket)

# When camera status changes
await event_manager.notify(camera_id, {
    "type": "status_changed",
    "status": "online",
    "timestamp": datetime.now().isoformat()
})
```

---

### 8. **Singleton Pattern** (Service Instances)

**Problem:** Only need one instance of certain services

**Solution:** Module-level singleton instances

```python
# backend/app/modules/camera/service.py

class CameraService:
    # ... implementation ...
    pass

# Singleton instance
camera_service = CameraService()

# All imports get same instance
from app.modules.camera.service import camera_service
```

---

### 9. **Composite Pattern** (Frontend Component Tree)

**Problem:** Complex UI with nested components

**Solution:** React component composition

```typescript
// Composite structure
<BoothCapture>
  <CameraSelector />
  <CameraPreview>
    <VideoElement />
    <GridOverlay />
    <CameraControls>
      <ZoomControl />
      <GridToggle />
      <CaptureButton />
    </CameraControls>
  </CameraPreview>
  <PhotoReview />
</BoothCapture>
```

---

### 10. **Custom Hooks Pattern** (React State Management)

**Problem:** Reusable stateful logic in React

**Solution:** Custom hooks encapsulate state and behavior

```typescript
// frontend/src/hooks/useCameraStream.ts

export function useCameraStream(options: CameraStreamOptions) {
    // Encapsulates all camera stream logic
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);
    // ... more state

    const startCamera = async () => { /* ... */ };
    const stopCamera = () => { /* ... */ };
    const captureFrame = async () => { /* ... */ };

    // Cleanup on unmount
    useEffect(() => {
        return () => stopCamera();
    }, []);

    return { stream, error, startCamera, stopCamera, captureFrame };
}

// Reusable across components
function CameraComponent() {
    const { stream, startCamera, captureFrame } = useCameraStream(options);
    // Use camera functionality
}
```

---

## Architecture Decisions & Rationale

### Decision 1: Browser MediaStream API vs Server-Side Streaming

**Decision:** Use browser MediaStream API for local cameras (webcam, DroidCam)

**Rationale:**
- ✅ **Lower latency**: Direct browser access, no server roundtrip
- ✅ **Reduced server load**: Video processing happens client-side
- ✅ **Better user privacy**: Stream never sent to server until capture
- ✅ **Simpler infrastructure**: No need for streaming server initially
- ✅ **Works offline**: Can preview without internet (upload needs connection)

**Trade-offs:**
- ⚠️ Limited to browsers with MediaStream API support (all modern browsers)
- ⚠️ Can't centrally monitor streams (but do we need to?)

---

### Decision 2: REST API for Control, WebSocket for Events

**Decision:** Use REST for commands, WebSocket for notifications

**REST API:**
```
POST /api/v1/cameras/register    - Register camera
GET  /api/v1/cameras             - List cameras
POST /api/v1/cameras/{id}/capture - Capture photo
```

**WebSocket:**
```
ws://server/ws/camera/{id}
↓ Events: status_changed, capture_complete, detection_result
```

**Rationale:**
- ✅ **REST**: Stateless, cacheable, standard HTTP semantics
- ✅ **WebSocket**: Real-time push notifications without polling
- ✅ **Hybrid**: Use right tool for each job

---

### Decision 3: Adapter Pattern for Camera Abstraction

**Decision:** Abstract different camera types behind common interface

**Rationale:**
- ✅ **Extensibility**: Add new camera types without changing core code
- ✅ **Testability**: Mock adapters for testing
- ✅ **Maintainability**: Each adapter self-contained
- ✅ **Open/Closed Principle**: Open for extension, closed for modification

**Alternative Considered:** Separate module per camera type
- ❌ Would require duplicated code for common operations
- ❌ Harder to ensure consistent behavior

---

### Decision 4: Client-Side Capture for Browser Cameras

**Decision:** Capture frame in browser, send JPEG to server

**Why not stream video to server?**
- ❌ High bandwidth usage (30fps video vs 1 photo)
- ❌ Server processing overhead
- ❌ Increased latency
- ❌ More complex infrastructure

**Why client-side capture?**
- ✅ Only send final captured photo (< 1MB)
- ✅ User sees exactly what will be uploaded
- ✅ Can apply client-side filters before upload
- ✅ Works with existing photo upload infrastructure

---

### Decision 5: Service Layer Pattern

**Decision:** Separate business logic into service classes

**Rationale:**
- ✅ **Single Responsibility**: Routers handle HTTP, services handle logic
- ✅ **Testability**: Test services without HTTP framework
- ✅ **Reusability**: Services can be called from routers, background jobs, etc.
- ✅ **Maintainability**: Business logic in one place

**Pattern in codebase:**
```
Router (HTTP concerns) → Service (business logic) → Repository (data access)
```

---

### Decision 6: SQLAlchemy ORM vs Raw SQL

**Decision:** Use SQLAlchemy ORM for data access

**Rationale:**
- ✅ **Type safety**: Models provide structure
- ✅ **Relationships**: Easy to navigate camera → photos → tests
- ✅ **Migrations**: Alembic integration for schema changes
- ✅ **Consistency**: Matches existing codebase pattern

Used everywhere:
```python
camera = db.query(CameraDevice).filter(CameraDevice.id == camera_id).first()
```

---

### Decision 7: JSON for Camera Settings Storage

**Decision:** Store camera settings as JSON column

```python
capabilities = Column(JSON, nullable=True)
camera_settings = Column(JSON, nullable=True)  # On photos table
```

**Rationale:**
- ✅ **Flexible schema**: Different cameras have different settings
- ✅ **No migrations needed**: Add new settings without schema changes
- ✅ **Query support**: PostgreSQL JSON operators for filtering

**Alternative Considered:** Separate settings table with key-value pairs
- ❌ More complex queries (JOIN required)
- ❌ Harder to validate complete settings object

---

### Decision 8: Synchronous Backend, Async Endpoints

**Decision:** Use `async def` for I/O-bound operations

```python
async def register_camera(...)  # Async endpoint
async def capture_photo(...)    # Async capture operation
```

**Rationale:**
- ✅ **I/O efficiency**: Don't block while waiting for camera/network
- ✅ **Scalability**: Handle multiple concurrent requests
- ✅ **FastAPI native**: First-class async support

**Where NOT async:**
- Database queries (SQLAlchemy session not async in our setup)
- Simple CRUD operations

---

## Data Flow & State Management

### Frontend State Flow

```typescript
┌──────────────────────────────────────────────────────┐
│  User Action (Click "Capture")                       │
└────────────────┬─────────────────────────────────────┘
                 ↓
┌──────────────────────────────────────────────────────┐
│  Custom Hook (useCameraStream.captureFrame())        │
│  - Reads video element                               │
│  - Draws to canvas                                   │
│  - Converts to Blob                                  │
└────────────────┬─────────────────────────────────────┘
                 ↓
┌──────────────────────────────────────────────────────┐
│  Component State Update                              │
│  setCapturedBlob(blob)                               │
│  setPreviewUrl(URL.createObjectURL(blob))            │
└────────────────┬─────────────────────────────────────┘
                 ↓
┌──────────────────────────────────────────────────────┐
│  React Re-render                                     │
│  - Hide video preview                                │
│  - Show captured image preview                       │
│  - Enable "Retake" and "Use Photo" buttons          │
└────────────────┬─────────────────────────────────────┘
                 ↓
┌──────────────────────────────────────────────────────┐
│  User Confirms → Upload to Backend                   │
│  FormData with blob → POST /api/v1/photos/upload    │
└──────────────────────────────────────────────────────┘
```

### Backend Data Flow

```python
┌──────────────────────────────────────────────────────┐
│  HTTP Request arrives at Router                      │
│  POST /api/v1/cameras/{id}/capture                   │
└────────────────┬─────────────────────────────────────┘
                 ↓
┌──────────────────────────────────────────────────────┐
│  Dependency Injection                                │
│  - Database session injected                         │
│  - Authenticated user injected                       │
│  - Service instance injected                         │
└────────────────┬─────────────────────────────────────┘
                 ↓
┌──────────────────────────────────────────────────────┐
│  Service Layer (CameraService.capture_photo)         │
│  - Fetch camera from database                        │
│  - Get appropriate adapter (Factory pattern)         │
│  - Apply settings to camera                          │
│  - Capture frame from camera                         │
│  - Delegate to PhotoService for storage              │
└────────────────┬─────────────────────────────────────┘
                 ↓
┌──────────────────────────────────────────────────────┐
│  Photo Service                                       │
│  - Validate image                                    │
│  - Process (resize, optimize)                        │
│  - Upload to MinIO                                   │
│  - Save metadata to database                         │
└────────────────┬─────────────────────────────────────┘
                 ↓
┌──────────────────────────────────────────────────────┐
│  Database Commit                                     │
│  - Photo record persisted                            │
│  - Camera last_seen updated                          │
│  - Audit log entry created                           │
└────────────────┬─────────────────────────────────────┘
                 ↓
┌──────────────────────────────────────────────────────┐
│  HTTP Response                                       │
│  PhotoResponse with URL, thumbnail, metadata         │
└──────────────────────────────────────────────────────┘
```

---

## Security Architecture

### 1. **Authentication & Authorization**

```python
# Every camera endpoint requires authentication
@router.post("/cameras/register")
async def register_camera(
    actor: dict = Depends(get_actor)  # ← Enforces authentication
):
    username = actor["username"]
    role = actor["role"]

    # Only admins can register cameras
    if role != "admin":
        raise HTTPException(403, "Insufficient permissions")
```

### 2. **Input Validation** (Pydantic Schemas)

```python
class CameraDeviceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    type: str = Field(..., pattern="^(browser|droidcam|rtsp|onvif)$")
    connection_url: Optional[HttpUrl] = None  # ← Validates URL format

    @validator('name')
    def name_must_not_contain_special_chars(cls, v):
        if not v.replace(' ', '').isalnum():
            raise ValueError('Name can only contain letters, numbers, spaces')
        return v
```

### 3. **Sensitive Data Protection**

```python
# Never log passwords
logger.info(f"Connecting to camera {camera.name}")  # ✅ OK
logger.info(f"Password: {password}")                # ❌ NEVER

# Encrypt passwords in database (future enhancement)
password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt())
```

### 4. **CORS Configuration**

```python
# backend/app/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend only
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 5. **Rate Limiting** (Future Enhancement)

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.post("/cameras/{id}/capture")
@limiter.limit("10/minute")  # Max 10 captures per minute
async def capture_photo(...):
    pass
```

---

## Performance & Scalability

### 1. **Lazy Loading**

```python
# Don't load camera capabilities until needed
capabilities = camera.capabilities  # Only loaded when accessed
```

### 2. **Connection Pooling**

```python
# Reuse HTTP connections for DroidCam
self.client = httpx.AsyncClient()  # Keeps connection pool
```

### 3. **Async I/O**

```python
# Don't block while waiting for camera
async def capture_frame(self) -> bytes:
    response = await self.client.get(...)  # Non-blocking
    return response.content
```

### 4. **Database Indexing**

```sql
CREATE INDEX idx_camera_status ON camera_devices(status);
CREATE INDEX idx_camera_type ON camera_devices(type);
CREATE INDEX idx_photos_camera_id ON photos(camera_id);
```

### 5. **Caching Strategy** (Future)

```python
from functools import lru_cache

@lru_cache(maxsize=100)
def get_camera_capabilities(camera_id: int) -> Dict[str, Any]:
    # Cache capabilities to avoid repeated queries
    pass
```

### 6. **Horizontal Scaling**

```
                 ┌─────────────┐
      ┌─────────>│  Backend 1  │
      │          └─────────────┘
Load  │          ┌─────────────┐
Balancer ───────>│  Backend 2  │
      │          └─────────────┘
      │          ┌─────────────┐
      └─────────>│  Backend 3  │
                 └─────────────┘
                       ↓
              ┌──────────────────┐
              │ Shared Database  │
              │ & MinIO Storage  │
              └──────────────────┘
```

---

## Error Handling Strategy

### 1. **Graceful Degradation**

```typescript
// Frontend: If camera fails, show file upload option
if (cameraError) {
    return <FileUploadFallback />;
}
```

### 2. **Specific Error Types**

```python
class CameraConnectionError(Exception):
    """Raised when camera connection fails"""
    pass

class CameraNotFoundError(Exception):
    """Raised when camera doesn't exist"""
    pass

# Handle specifically
try:
    await adapter.connect()
except CameraConnectionError:
    return {"error": "Camera offline", "suggestion": "Check connection"}
```

### 3. **User-Friendly Messages**

```python
# Don't expose internal errors to users
try:
    photo = await capture_photo()
except Exception as e:
    logger.error(f"Capture failed: {str(e)}", exc_info=True)  # Log details
    raise HTTPException(
        status_code=500,
        detail="Failed to capture photo. Please try again."  # User message
    )
```

### 4. **Retry Logic**

```python
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=10)
)
async def capture_with_retry(camera_id: int):
    return await camera_service.capture_photo(camera_id)
```

---

## Summary: Key Architectural Strengths

| Aspect | Pattern/Decision | Benefit |
|--------|-----------------|---------|
| **Extensibility** | Adapter Pattern | Add camera types without changing core code |
| **Testability** | Service Layer + DI | Test business logic in isolation |
| **Maintainability** | Separation of Concerns | Each layer has clear responsibility |
| **Performance** | Client-side capture | Low bandwidth, low latency |
| **Reliability** | Error handling + retries | Graceful failure recovery |
| **Security** | Authentication + validation | Protected against common vulnerabilities |
| **Scalability** | Async I/O + stateless API | Handle concurrent users efficiently |
| **User Experience** | Real-time updates (WebSocket) | Instant feedback on actions |

---

## Design Principles Applied

### SOLID Principles

1. **S - Single Responsibility**: Each class has one reason to change
   - `CameraService` → camera operations
   - `PhotoService` → photo operations
   - `CameraAdapter` → hardware abstraction

2. **O - Open/Closed**: Open for extension, closed for modification
   - New camera types added via new adapters, not modifying existing code

3. **L - Liskov Substitution**: Adapters interchangeable
   - Any `CameraAdapter` can replace another without breaking code

4. **I - Interface Segregation**: Clients don't depend on unused methods
   - Browser adapter doesn't implement server-side streaming methods

5. **D - Dependency Inversion**: Depend on abstractions, not concretions
   - Services depend on `CameraAdapter` interface, not specific implementations

---

## Recommended Reading

- **Design Patterns**: "Design Patterns" by Gang of Four
- **Clean Architecture**: "Clean Architecture" by Robert C. Martin
- **Domain-Driven Design**: "Domain-Driven Design" by Eric Evans
- **Microservices Patterns**: "Microservices Patterns" by Chris Richardson
- **API Design**: "RESTful Web APIs" by Leonard Richardson

---

**Document Version:** 1.0
**Last Updated:** March 11, 2026
**Maintained By:** QC Vision Development Team

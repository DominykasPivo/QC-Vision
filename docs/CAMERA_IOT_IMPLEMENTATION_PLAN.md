# IoT Camera Integration - Implementation Plan

**Date:** March 11, 2026
**Feature:** Direct camera control and IoT camera integration for QC Vision

---

## Executive Summary

This document outlines the implementation plan for adding IoT camera functionality to QC Vision, enabling:
- Direct camera control through the application interface
- Live preview with manual adjustments (focus, zoom, grid overlay)
- Support for multiple camera types (smartphone, WiFi, web cameras)
- Automatic photo capture when design is visible in field of view

---

## Current State Analysis

### Existing Photo System
- **Frontend**: File upload via `<input type="file">` with camera/gallery selection
- **Backend**: FastAPI endpoint `/api/v1/photos/upload` accepts multipart form data
- **Storage**: MinIO object storage for photo persistence
- **Processing**: Server-side image validation, resizing, and optimization
- **Architecture**: Service Layer Pattern with clear separation of concerns

### Current Flow
```
User → File Input → Browser Upload → Backend Validation → MinIO Storage → Database Metadata
```

---

## Target Architecture

### New Camera System Flow
```
Camera Device → WebSocket/WebRTC Stream → Frontend Preview →
Capture Command → Backend Processing → MinIO Storage → Database Metadata
```

### Components to Add

1. **Backend Camera Module** (`backend/app/modules/camera/`)
2. **Frontend Camera Interface** (`frontend/src/components/camera/`)
3. **Communication Layer** (WebSocket for streaming, REST for control)
4. **Camera Adapter Layer** (abstract different camera types)

---

## Implementation Phases

### PHASE 1: Foundation & Local Camera Support (Week 1-2)

**Goal**: Enable direct browser camera access with live preview and basic controls

#### Backend Tasks
- [ ] Create `backend/app/modules/camera/` module structure
  - `models.py` - Camera device registration model
  - `schemas.py` - Request/response schemas
  - `service.py` - Camera management service
  - `router.py` - REST endpoints for camera management
  - `__init__.py` - Module exports

- [ ] Database schema for camera devices
  ```python
  class CameraDevice(Base):
      id: int
      name: str
      type: str  # 'browser', 'droidcam', 'wifi', 'rtsp'
      connection_url: Optional[str]
      status: str  # 'online', 'offline', 'error'
      capabilities: JSON  # focus, zoom, resolution options
      last_seen: datetime
      created_at: datetime
  ```

- [ ] REST API endpoints:
  - `POST /api/v1/cameras/register` - Register a new camera device
  - `GET /api/v1/cameras` - List available cameras
  - `GET /api/v1/cameras/{id}` - Get camera details
  - `DELETE /api/v1/cameras/{id}` - Remove camera
  - `POST /api/v1/cameras/{id}/capture` - Trigger photo capture
  - `PATCH /api/v1/cameras/{id}/settings` - Update camera settings

#### Frontend Tasks
- [ ] Create camera components:
  - `CameraSelector.tsx` - Dropdown to select camera device
  - `CameraPreview.tsx` - Live camera preview component
  - `CameraControls.tsx` - Focus, zoom, capture controls
  - `CameraGridOverlay.tsx` - Composition grid overlay
  - `CameraCapturePage.tsx` - Full camera capture interface

- [ ] Implement browser MediaStream API integration
  ```typescript
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: 'environment',
      width: { ideal: 1920 },
      height: { ideal: 1080 }
    }
  });
  ```

- [ ] Camera capability detection
  - Check for focus control support
  - Check for zoom support
  - List available cameras (front/back on mobile)

- [ ] Create hook: `useCameraCapture.ts`
  - Manage camera stream lifecycle
  - Handle capture to blob/file
  - Apply settings (focus, zoom)

#### Integration Points
- [ ] Add route: `/tests/:id/camera` - Camera capture page
- [ ] Update photo upload flow to support camera capture
- [ ] Modify `PhotoUploadModal.tsx` to include "Use Camera" option

**Deliverables**:
- Browser camera access with live preview
- Capture photo from camera feed
- Basic zoom and focus controls
- Captured photos integrated into existing upload flow

---

### PHASE 2: Advanced Camera Controls & Grid Overlay (Week 3)

**Goal**: Add professional camera controls for quality composition

#### Frontend Tasks
- [ ] Implement advanced controls:
  - **Digital Zoom**: Pinch-to-zoom or slider control
  - **Manual Focus**: Tap-to-focus or slider control
  - **Exposure Control**: Brightness adjustment
  - **Grid Overlay**: Rule of thirds, center cross, golden ratio options

- [ ] Create `CameraSettings.tsx`:
  - Resolution selector (1080p, 4K)
  - Aspect ratio selector (16:9, 4:3, 1:1)
  - Flash control (if available)
  - Grid type selector

- [ ] Add visual feedback:
  - Focus indicator (box/circle on tap)
  - Zoom level indicator
  - Exposure indicator
  - Grid toggle button

- [ ] Implement camera constraints API:
  ```typescript
  const track = stream.getVideoTracks()[0];
  const capabilities = track.getCapabilities();

  // Apply zoom
  await track.applyConstraints({
    advanced: [{ zoom: 2.0 }]
  });

  // Apply focus
  await track.applyConstraints({
    advanced: [{ focusMode: 'manual', focusDistance: 0.5 }]
  });
  ```

#### Backend Tasks
- [ ] Create camera settings schema
- [ ] Store camera presets per user/test type
- [ ] API for saving/loading camera presets

**Deliverables**:
- Professional camera controls
- Multiple grid overlay options
- User-configurable camera settings
- Preset management

---

### PHASE 3: Smartphone Camera Integration (DroidCam/Similar) (Week 4-5)

**Goal**: Enable wireless smartphone camera usage via third-party bridges

#### Research & Selection
- [ ] Evaluate camera bridge solutions:
  - **DroidCam** - Popular, supports WiFi/USB
  - **IP Webcam** - Android app with web interface
  - **EpocCam** - iOS solution
  - **OBS VirtualCam** - Advanced streaming solution

#### Backend Tasks
- [ ] Create camera adapter interface:
  ```python
  class CameraAdapter(ABC):
      @abstractmethod
      async def connect(self, connection_url: str) -> bool:
          pass

      @abstractmethod
      async def capture_frame(self) -> bytes:
          pass

      @abstractmethod
      async def get_stream_url(self) -> str:
          pass

      @abstractmethod
      async def set_settings(self, settings: dict) -> bool:
          pass
  ```

- [ ] Implement adapters:
  - `DroidCamAdapter` - HTTP/RTSP connection
  - `IPWebcamAdapter` - HTTP connection
  - `RTSPAdapter` - Generic RTSP support

- [ ] Add camera discovery service (optional):
  - mDNS/Bonjour discovery
  - Manual IP entry fallback

#### Frontend Tasks
- [ ] Camera connection wizard:
  - Step 1: Select camera type
  - Step 2: Enter connection details (IP, port)
  - Step 3: Test connection
  - Step 4: Save camera

- [ ] Create `CameraConnectionModal.tsx`
- [ ] Add camera status indicators (online/offline)
- [ ] Implement reconnection logic

#### Integration
- [ ] Proxy camera stream through backend (security)
- [ ] Handle authentication tokens
- [ ] Implement connection timeout handling

**Deliverables**:
- Smartphone camera support via DroidCam
- Camera discovery and manual entry
- Connection management UI
- Stream proxy for security

---

### PHASE 4: WiFi Industrial/Web Cameras (Week 6)

**Goal**: Support direct WiFi-enabled cameras (ONVIF, RTSP, HTTP)

#### Backend Tasks
- [ ] Implement ONVIF protocol support:
  ```python
  from onvif import ONVIFCamera

  class ONVIFAdapter(CameraAdapter):
      async def connect(self, ip: str, port: int, user: str, password: str):
          self.camera = ONVIFCamera(ip, port, user, password)
          await self.camera.devicemgmt.GetCapabilities()
  ```

- [ ] Support RTSP streams:
  - Direct RTSP → HLS conversion
  - Use FFmpeg for transcoding
  - Serve HLS stream to frontend

- [ ] HTTP/MJPEG support:
  - Direct image stream from IP cameras
  - Frame extraction endpoint

#### Frontend Tasks
- [ ] Add camera type detection UI
- [ ] Support for multiple simultaneous cameras
- [ ] Camera grid view (2x2, 3x3 layouts)
- [ ] Multi-camera capture (capture from all cameras)

#### Infrastructure
- [ ] Add FFmpeg to Docker container
- [ ] Add streaming service:
  ```yaml
  streaming:
    image: aler9/rtsp-simple-server
    ports:
      - "8554:8554"
  ```

**Deliverables**:
- ONVIF camera support
- RTSP streaming support
- Multi-camera management
- Grid view for multiple cameras

---

### PHASE 5: AI-Powered Auto-Capture (Week 7-8) [ADVANCED]

**Goal**: Automatically capture when design/product is detected in FOV

#### Backend Tasks
- [ ] Integrate AI model for object detection:
  - TensorFlow Lite
  - YOLO (You Only Look Once)
  - MobileNet for edge devices

- [ ] Create detection service:
  ```python
  class AutoCaptureService:
      async def analyze_frame(self, frame: bytes) -> DetectionResult:
          # Run object detection
          # Check if target object in FOV
          # Return confidence score
          pass

      async def should_capture(self, detection: DetectionResult) -> bool:
          return detection.confidence > 0.85
  ```

- [ ] WebSocket endpoint for real-time frame analysis
  - Client sends frame → Server analyzes → Returns detection result

#### Frontend Tasks
- [ ] Create `AutoCaptureToggle.tsx`
- [ ] Visual indicators for detection:
  - Bounding box around detected object
  - Confidence meter
  - Auto-capture countdown

- [ ] Implement frame sampling:
  - Send frames at 2-5 FPS for analysis (reduce load)
  - Skip analysis if previous frame was recent

#### ML Model
- [ ] Train/fine-tune model for specific products
- [ ] Create dataset of "good" vs "bad" compositions
- [ ] Export model to TensorFlow Lite format
- [ ] Model versioning and updates

**Deliverables**:
- Automatic capture on object detection
- Visual detection feedback
- Configurable sensitivity/confidence threshold
- Product-specific model support

---

## Technical Specifications

### Frontend Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Camera API | MediaStream API | Browser camera access |
| Real-time Streaming | WebRTC / HLS | Live video preview |
| Image Capture | Canvas API | Frame capture from video stream |
| State Management | React hooks | Camera state and settings |
| UI Components | Radix UI + Custom | Camera controls interface |

### Backend Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Camera Management | FastAPI + SQLAlchemy | Device registration and control |
| Streaming | WebSocket / Server-Sent Events | Real-time communication |
| Video Processing | FFmpeg | RTSP → HLS conversion |
| Object Detection | TensorFlow Lite / YOLO | Auto-capture AI |
| Storage | MinIO | Captured photo storage |

### Communication Protocols

**REST API**:
- Camera registration/management
- Settings configuration
- Manual capture trigger

**WebSocket**:
- Live camera status updates
- Frame analysis results (auto-capture)
- Real-time notifications

**WebRTC** (optional for peer-to-peer):
- Direct browser-to-browser streaming
- Lower latency for local cameras

**RTSP/ONVIF**:
- Industrial camera integration
- WiFi camera support

---

## Database Schema Changes

### New Tables

```sql
-- Camera devices table
CREATE TABLE camera_devices (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,  -- 'browser', 'droidcam', 'wifi', 'rtsp', 'onvif'
    connection_url TEXT,
    username VARCHAR(255),
    password_hash VARCHAR(255),
    status VARCHAR(50) DEFAULT 'offline',
    capabilities JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP
);

-- Camera settings presets
CREATE TABLE camera_presets (
    id SERIAL PRIMARY KEY,
    camera_id INTEGER REFERENCES camera_devices(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    settings JSONB NOT NULL,  -- zoom, focus, exposure, resolution, etc.
    is_default BOOLEAN DEFAULT false,
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Camera capture sessions (for auto-capture)
CREATE TABLE camera_sessions (
    id SERIAL PRIMARY KEY,
    camera_id INTEGER REFERENCES camera_devices(id),
    test_id INTEGER REFERENCES tests(id),
    mode VARCHAR(50),  -- 'manual', 'auto'
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    photos_captured INTEGER DEFAULT 0
);

-- Modify photos table to track camera source
ALTER TABLE photos ADD COLUMN camera_id INTEGER REFERENCES camera_devices(id);
ALTER TABLE photos ADD COLUMN capture_mode VARCHAR(50) DEFAULT 'upload';  -- 'upload', 'camera_manual', 'camera_auto'
ALTER TABLE photos ADD COLUMN camera_settings JSONB;
```

---

## API Specification

### Camera Management Endpoints

#### Register Camera
```http
POST /api/v1/cameras/register
Content-Type: application/json

{
  "name": "Warehouse Camera 1",
  "type": "rtsp",
  "connection_url": "rtsp://192.168.1.100:554/stream",
  "username": "admin",
  "password": "password123",
  "capabilities": {
    "zoom": true,
    "focus": true,
    "ptz": false
  }
}

Response: 201 Created
{
  "id": 1,
  "name": "Warehouse Camera 1",
  "type": "rtsp",
  "status": "online",
  "stream_url": "/api/v1/cameras/1/stream",
  "created_at": "2026-03-11T10:00:00Z"
}
```

#### List Cameras
```http
GET /api/v1/cameras

Response: 200 OK
{
  "cameras": [
    {
      "id": 1,
      "name": "Warehouse Camera 1",
      "type": "rtsp",
      "status": "online",
      "last_seen": "2026-03-11T10:05:00Z"
    },
    {
      "id": 2,
      "name": "My Phone (DroidCam)",
      "type": "droidcam",
      "status": "online",
      "last_seen": "2026-03-11T10:04:00Z"
    }
  ]
}
```

#### Capture Photo
```http
POST /api/v1/cameras/{camera_id}/capture
Content-Type: application/json

{
  "test_id": 42,
  "settings": {
    "zoom": 1.5,
    "focus": 0.8,
    "resolution": "1920x1080"
  }
}

Response: 201 Created
{
  "photo_id": 123,
  "file_path": "photos/20260311/abc123.jpg",
  "thumbnail_url": "/api/v1/photos/123/thumbnail",
  "captured_at": "2026-03-11T10:06:00Z"
}
```

#### Get Camera Stream
```http
GET /api/v1/cameras/{camera_id}/stream

Response: 200 OK (HLS playlist or MJPEG stream)
Content-Type: application/vnd.apple.mpegurl

#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXTINF:10.0,
stream0.ts
#EXTINF:10.0,
stream1.ts
```

### WebSocket Events

#### Connection
```
ws://localhost:8000/ws/camera/{camera_id}
```

#### Events
```json
// Server → Client: Camera status update
{
  "type": "status",
  "camera_id": 1,
  "status": "online"
}

// Server → Client: Detection result (auto-capture)
{
  "type": "detection",
  "camera_id": 1,
  "detected": true,
  "confidence": 0.92,
  "bounding_box": {"x": 100, "y": 200, "width": 300, "height": 400}
}

// Client → Server: Request capture
{
  "type": "capture",
  "test_id": 42,
  "settings": {"zoom": 1.5}
}

// Server → Client: Capture complete
{
  "type": "capture_complete",
  "photo_id": 123,
  "thumbnail_url": "/api/v1/photos/123/thumbnail"
}
```

---

## Frontend Component Structure

```
frontend/src/
├── components/
│   ├── camera/
│   │   ├── CameraSelector.tsx          # Select camera device
│   │   ├── CameraPreview.tsx           # Live preview component
│   │   ├── CameraControls.tsx          # Zoom, focus, capture controls
│   │   ├── CameraGridOverlay.tsx       # Composition grids
│   │   ├── CameraSettings.tsx          # Resolution, aspect ratio settings
│   │   ├── CameraConnectionWizard.tsx  # Setup new camera
│   │   ├── CameraStatusIndicator.tsx   # Online/offline/error status
│   │   ├── MultiCameraGrid.tsx         # Grid view for multiple cameras
│   │   └── AutoCaptureToggle.tsx       # Enable/disable auto-capture
│   └── tests/
│       ├── CameraCapturePage.tsx       # Full camera capture interface
│       └── PhotoSourceModal.tsx        # Choose: Upload, Camera, or Multi-camera
├── hooks/
│   ├── useCameraCapture.ts             # Camera stream management
│   ├── useCameraControls.ts            # Zoom, focus, exposure controls
│   ├── useCameraDevices.ts             # List and manage cameras
│   ├── useCameraStream.ts              # WebSocket/WebRTC streaming
│   └── useAutoCaptureDetection.ts      # AI detection integration
├── lib/
│   ├── camera/
│   │   ├── mediastream.ts              # MediaStream API helpers
│   │   ├── capture.ts                  # Capture frame to file
│   │   ├── constraints.ts              # Camera constraint helpers
│   │   └── adapters.ts                 # Camera adapter utilities
│   └── api/
│       └── camera.ts                   # API client for camera endpoints
└── pages/
    └── CameraCapture.tsx               # Route: /tests/:id/camera
```

---

## Backend Module Structure

```
backend/app/modules/camera/
├── __init__.py                      # Module exports
├── models.py                        # SQLAlchemy models (CameraDevice, CameraPreset, CameraSession)
├── schemas.py                       # Pydantic schemas (requests/responses)
├── service.py                       # CameraService - business logic
├── router.py                        # FastAPI endpoints
├── websocket.py                     # WebSocket handlers
├── adapters/
│   ├── __init__.py
│   ├── base.py                      # CameraAdapter abstract class
│   ├── browser.py                   # Browser camera (no backend needed)
│   ├── droidcam.py                  # DroidCam adapter
│   ├── rtsp.py                      # RTSP/generic IP camera
│   ├── onvif.py                     # ONVIF protocol adapter
│   └── ipwebcam.py                  # IP Webcam app adapter
├── streaming/
│   ├── __init__.py
│   ├── hls.py                       # HLS streaming service
│   ├── mjpeg.py                     # MJPEG streaming
│   └── ffmpeg.py                    # FFmpeg wrapper
└── detection/
    ├── __init__.py
    ├── service.py                   # AutoCaptureService
    ├── models.py                    # AI model loading
    └── utils.py                     # Frame preprocessing
```

---

## Security Considerations

### Authentication & Authorization
- [ ] Camera credentials encrypted at rest
- [ ] User permissions for camera access (only assigned QC inspectors)
- [ ] API token rotation for camera authentication

### Network Security
- [ ] HTTPS/WSS for all camera streams
- [ ] Backend proxy for camera streams (no direct frontend → camera)
- [ ] IP whitelist for camera device registration
- [ ] VPN requirement for remote camera access

### Data Privacy
- [ ] No long-term storage of stream data
- [ ] Captured photos follow existing MinIO security
- [ ] Audit log for camera access and captures

---

## Performance Considerations

### Streaming Optimization
- [ ] Adaptive bitrate streaming (HLS)
- [ ] Client-side frame throttling (send frames at 2-5 FPS for analysis)
- [ ] WebWorker for heavy frontend processing
- [ ] Backend frame buffering to prevent memory leaks

### Resource Management
- [ ] Camera connection pooling
- [ ] Automatic stream cleanup on disconnect
- [ ] Maximum concurrent streams limit
- [ ] Graceful degradation if camera unavailable

### Caching
- [ ] Cache camera capabilities on first connect
- [ ] Cache thumbnail previews
- [ ] Redis for WebSocket session state

---

## Testing Strategy

### Unit Tests
- [ ] Camera adapter implementations
- [ ] Stream handling logic
- [ ] Capture request validation
- [ ] Detection algorithm accuracy

### Integration Tests
- [ ] End-to-end capture flow
- [ ] Multi-camera simultaneous capture
- [ ] WebSocket connection stability
- [ ] Stream proxy functionality

### Manual Testing Checklist
- [ ] Browser camera on desktop
- [ ] Browser camera on mobile (iOS/Android)
- [ ] DroidCam connection and capture
- [ ] RTSP camera connection and capture
- [ ] Multi-camera grid view
- [ ] Auto-capture with test object
- [ ] Grid overlay visibility
- [ ] Zoom/focus controls
- [ ] Network disconnection recovery

---

## Deployment Considerations

### Docker Updates

**Backend Dockerfile additions**:
```dockerfile
# Add FFmpeg for video processing
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsm6 \
    libxext6 \
    && rm -rf /var/lib/apt/lists/*

# Install additional Python packages
RUN pip install \
    opencv-python-headless \
    onvif-zeep \
    python-socketio \
    pillow
```

**New Service in docker-compose.yml**:
```yaml
streaming:
  image: aler9/rtsp-simple-server
  container_name: qc_vision_streaming
  ports:
    - "8554:8554"
    - "1935:1935"
    - "8888:8888"
  networks:
    - qc-network
  restart: unless-stopped
```

### Environment Variables
```env
# Camera Configuration
ENABLE_CAMERA_MODULE=true
MAX_CONCURRENT_STREAMS=10
STREAM_QUALITY=high
AUTO_CAPTURE_ENABLED=false

# Camera Discovery
ENABLE_CAMERA_DISCOVERY=true
CAMERA_DISCOVERY_INTERVAL=30

# Streaming
HLS_SEGMENT_DURATION=6
HLS_PLAYLIST_LENGTH=5
RTSP_SERVER_URL=rtsp://streaming:8554

# AI Detection (Phase 5)
AI_MODEL_PATH=/app/models/detection_model.tflite
AI_CONFIDENCE_THRESHOLD=0.85
AI_DETECTION_FPS=3
```

---

## Migration Path

For existing installations:

1. **Database Migration**:
   ```bash
   alembic revision --autogenerate -m "Add camera support"
   alembic upgrade head
   ```

2. **Gradual Rollout**:
   - Phase 1: Enable for beta users
   - Phase 2: Enable for all users with opt-in
   - Phase 3: Make default with file upload fallback

3. **Feature Flag**:
   ```typescript
   const ENABLE_CAMERA_FEATURE = process.env.VITE_ENABLE_CAMERA === 'true';
   ```

---

## Alternative Approaches Considered

### Approach 1: Client-Side Only (Rejected)
**Pros**: Simpler backend, faster initial development
**Cons**: Limited camera type support, no server-side processing, security concerns
**Decision**: Rejected - need backend for WiFi cameras and auto-capture

### Approach 2: Third-Party Service (Evaluated)
**Options**: Agora.io, Twilio Video, Amazon Kinesis Video Streams
**Pros**: Managed infrastructure, proven reliability
**Cons**: Ongoing costs, vendor lock-in, data privacy concerns
**Decision**: Defer - use native solution first, consider if scale demands

### Approach 3: Electron App with Native Camera Access (Evaluated)
**Pros**: More control, native performance
**Cons**: Deployment complexity, loses web simplicity
**Decision**: Keep as web app - browser APIs sufficient for PoC

---

## Success Metrics

- [ ] Camera connection success rate > 95%
- [ ] Average capture latency < 2 seconds
- [ ] Stream lag < 500ms
- [ ] User satisfaction with camera controls (survey)
- [ ] Auto-capture accuracy > 85% (Phase 5)
- [ ] Reduction in manual photo uploads by 60%

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Browser compatibility issues | High | Extensive browser testing, provide fallback |
| Network latency for WiFi cameras | Medium | Buffer management, quality adaptation |
| Camera discovery unreliable | Medium | Manual IP entry option |
| Auto-capture false positives | Medium | Adjustable confidence threshold, manual override |
| Limited mobile browser camera API support | High | Test on all target devices early |
| FFmpeg transcoding performance bottleneck | High | Hardware acceleration, scale with more instances |

---

## Open Questions

1. **User Management**: Should cameras be shared across users or per-user?
   - **Recommendation**: Shared with role-based access

2. **Offline Support**: Should captured photos be cached if network fails?
   - **Recommendation**: Yes, implement IndexedDB caching

3. **Bandwidth**: What's acceptable stream quality vs bandwidth tradeoff?
   - **Recommendation**: 720p default, configurable to 1080p/4K

4. **Multi-tenancy**: How to handle multiple teams using same camera?
   - **Recommendation**: Camera reservation system (Phase 6+)

---

## Next Steps

1. **Immediate**:
   - [ ] Review and approve this plan
   - [ ] Set up development environment with camera test devices
   - [ ] Create GitHub project board for tracking

2. **Week 1**:
   - [ ] Begin Phase 1 implementation (Foundation & Local Camera)
   - [ ] Set up CI/CD for camera module testing
   - [ ] Create initial wireframes for camera UI

3. **Stakeholder Communication**:
   - [ ] Demo Phase 1 to team after Week 2
   - [ ] Gather user feedback on camera controls
   - [ ] Adjust roadmap based on feedback

---

## Resources & Documentation

- [MediaStream API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream_API)
- [WebRTC for Real-time Communication](https://webrtc.org/)
- [ONVIF Protocol Specification](https://www.onvif.org/)
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)
- [DroidCam API Documentation](https://www.dev47apps.com/droidcam/connect/)
- [IP Webcam Developer Info](https://ip-webcam.appspot.com/)

---

**Plan Version**: 1.0
**Last Updated**: March 11, 2026
**Owner**: QC Vision Development Team

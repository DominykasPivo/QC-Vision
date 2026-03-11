# Camera IoT Quick Start Guide - Phase 1

**Goal**: Get local browser camera working with live preview and basic controls

**Timeline**: 2-3 days for basic implementation

---

## Prerequisites

- [x] QC Vision app running (backend + frontend)
- [x] Modern browser (Chrome 90+, Firefox 88+, Safari 14+)
- [x] Camera permission when prompted
- [x] HTTPS enabled (required for camera API) OR localhost

---

## Step 1: Create Backend Camera Module (Day 1 Morning)

### 1.1 Create Module Structure

```bash
cd backend/app/modules
mkdir camera
cd camera
```

Create these files:

**`__init__.py`**
```python
from .router import router as camera_router

__all__ = ["camera_router"]
```

**`models.py`**
```python
from sqlalchemy import Column, Integer, String, DateTime, JSON, Boolean
from sqlalchemy.sql import func
from app.database import Base

class CameraDevice(Base):
    __tablename__ = "camera_devices"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    type = Column(String(50), nullable=False)  # 'browser', 'droidcam', 'wifi', 'rtsp'
    status = Column(String(50), default='offline')  # 'online', 'offline', 'error'
    capabilities = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_seen = Column(DateTime(timezone=True), nullable=True)
```

**`schemas.py`**
```python
from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field

class CameraCapabilities(BaseModel):
    zoom: bool = False
    focus: bool = False
    flash: bool = False
    resolution: list[str] = Field(default_factory=lambda: ["1920x1080"])

class CameraDeviceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    type: str = Field(..., pattern="^(browser|droidcam|wifi|rtsp)$")
    capabilities: Optional[CameraCapabilities] = None

class CameraDeviceResponse(BaseModel):
    id: int
    name: str
    type: str
    status: str
    capabilities: Optional[Dict[str, Any]]
    created_at: datetime
    last_seen: Optional[datetime]

    class Config:
        from_attributes = True

class CameraListResponse(BaseModel):
    cameras: list[CameraDeviceResponse]
    total: int

class CaptureRequest(BaseModel):
    test_id: int
    settings: Optional[Dict[str, Any]] = None
```

**`service.py`**
```python
import logging
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.orm import Session
from .models import CameraDevice
from .schemas import CameraDeviceCreate

logger = logging.getLogger("backend_camera_service")

class CameraService:
    """Service layer for camera device management"""

    def register_camera(
        self, db: Session, camera_data: CameraDeviceCreate, username: str
    ) -> CameraDevice:
        """Register a new camera device"""
        camera = CameraDevice(
            name=camera_data.name,
            type=camera_data.type,
            status='online',
            capabilities=camera_data.capabilities.model_dump() if camera_data.capabilities else None,
            last_seen=datetime.now(timezone.utc)
        )
        db.add(camera)
        db.commit()
        db.refresh(camera)
        logger.info(f"Registered camera: {camera.name} (type: {camera.type})")
        return camera

    def list_cameras(self, db: Session) -> List[CameraDevice]:
        """List all registered cameras"""
        return db.query(CameraDevice).all()

    def get_camera(self, db: Session, camera_id: int) -> Optional[CameraDevice]:
        """Get camera by ID"""
        return db.query(CameraDevice).filter(CameraDevice.id == camera_id).first()

    def delete_camera(self, db: Session, camera_id: int) -> bool:
        """Delete a camera device"""
        camera = self.get_camera(db, camera_id)
        if camera:
            db.delete(camera)
            db.commit()
            return True
        return False

    def update_camera_status(
        self, db: Session, camera_id: int, status: str
    ) -> Optional[CameraDevice]:
        """Update camera status"""
        camera = self.get_camera(db, camera_id)
        if camera:
            camera.status = status
            camera.last_seen = datetime.now(timezone.utc)
            db.commit()
            db.refresh(camera)
        return camera

camera_service = CameraService()
```

**`router.py`**
```python
import logging
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.security import get_actor
from app.modules.audit.service import log_action

from .schemas import (
    CameraDeviceCreate,
    CameraDeviceResponse,
    CameraListResponse,
)
from .service import camera_service

logger = logging.getLogger("backend_camera_router")
router = APIRouter(prefix="/cameras", tags=["cameras"])

@router.post("/register", response_model=CameraDeviceResponse, status_code=status.HTTP_201_CREATED)
async def register_camera(
    camera_data: CameraDeviceCreate,
    db: Session = Depends(get_db),
    actor: dict = Depends(get_actor),
):
    """Register a new camera device"""
    username = actor["username"]

    try:
        camera = camera_service.register_camera(db, camera_data, username)

        log_action(
            db,
            action="REGISTER",
            entity_type="Camera",
            entity_id=camera.id,
            username=username,
            meta={"name": camera.name, "type": camera.type}
        )

        return camera
    except Exception as e:
        logger.error(f"Failed to register camera: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to register camera"
        )

@router.get("/", response_model=CameraListResponse)
async def list_cameras(
    db: Session = Depends(get_db),
    actor: dict = Depends(get_actor),
):
    """List all registered cameras"""
    cameras = camera_service.list_cameras(db)
    return CameraListResponse(cameras=cameras, total=len(cameras))

@router.get("/{camera_id}", response_model=CameraDeviceResponse)
async def get_camera(
    camera_id: int,
    db: Session = Depends(get_db),
    actor: dict = Depends(get_actor),
):
    """Get camera details"""
    camera = camera_service.get_camera(db, camera_id)
    if not camera:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Camera not found"
        )
    return camera

@router.delete("/{camera_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_camera(
    camera_id: int,
    db: Session = Depends(get_db),
    actor: dict = Depends(get_actor),
):
    """Delete a camera device"""
    username = actor["username"]

    if not camera_service.delete_camera(db, camera_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Camera not found"
        )

    log_action(
        db,
        action="DELETE",
        entity_type="Camera",
        entity_id=camera_id,
        username=username,
    )

    return None
```

### 1.2 Register Camera Router in Main App

Edit `backend/app/main.py`:

```python
# Add to imports
from app.modules.camera import camera_router

# Add to router registration (after other routers)
app.include_router(camera_router, prefix="/api/v1")
```

### 1.3 Create Database Migration

```bash
cd backend

# Create migration
alembic revision --autogenerate -m "Add camera_devices table"

# Apply migration
alembic upgrade head
```

### 1.4 Test Backend API

Start backend:
```bash
cd backend
python -m uvicorn app.main:app --reload
```

Test with curl:
```bash
# Register a browser camera
curl -X POST http://localhost:8000/api/v1/cameras/register \
  -H "Content-Type: application/json" \
  -H "X-User: testuser" \
  -H "X-Role: admin" \
  -d '{
    "name": "My Browser Camera",
    "type": "browser",
    "capabilities": {
      "zoom": true,
      "focus": false,
      "resolution": ["1920x1080", "1280x720"]
    }
  }'

# List cameras
curl http://localhost:8000/api/v1/cameras \
  -H "X-User: testuser" \
  -H "X-Role: admin"
```

---

## Step 2: Create Frontend Camera Components (Day 1 Afternoon)

### 2.1 Create Camera API Client

**`frontend/src/lib/api/camera.ts`**
```typescript
export interface CameraCapabilities {
  zoom: boolean;
  focus: boolean;
  flash: boolean;
  resolution: string[];
}

export interface CameraDevice {
  id: number;
  name: string;
  type: 'browser' | 'droidcam' | 'wifi' | 'rtsp';
  status: 'online' | 'offline' | 'error';
  capabilities?: CameraCapabilities;
  created_at: string;
  last_seen?: string;
}

export interface CameraListResponse {
  cameras: CameraDevice[];
  total: number;
}

const BASE_URL = '/api/v1/cameras';

export async function registerCamera(
  name: string,
  type: string,
  capabilities?: CameraCapabilities
): Promise<CameraDevice> {
  const response = await fetch(`${BASE_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, type, capabilities }),
  });

  if (!response.ok) {
    throw new Error('Failed to register camera');
  }

  return response.json();
}

export async function listCameras(): Promise<CameraListResponse> {
  const response = await fetch(BASE_URL);

  if (!response.ok) {
    throw new Error('Failed to list cameras');
  }

  return response.json();
}

export async function deleteCamera(id: number): Promise<void> {
  const response = await fetch(`${BASE_URL}/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete camera');
  }
}
```

### 2.2 Create Camera Hook

**`frontend/src/hooks/useCameraStream.ts`**
```typescript
import { useState, useEffect, useRef } from 'react';

export interface CameraStreamOptions {
  facingMode?: 'environment' | 'user';
  width?: number;
  height?: number;
}

export function useCameraStream(options: CameraStreamOptions = {}) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const startCamera = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: options.facingMode || 'environment',
          width: { ideal: options.width || 1920 },
          height: { ideal: options.height || 1080 },
        },
      });

      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to access camera');
      console.error('Camera error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const captureFrame = (): Blob | null => {
    if (!videoRef.current) return null;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(videoRef.current, 0, 0);

    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9);
    });
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return {
    videoRef,
    stream,
    error,
    isLoading,
    startCamera,
    stopCamera,
    captureFrame,
  };
}
```

### 2.3 Create Camera Preview Component

**`frontend/src/components/camera/CameraPreview.tsx`**
```typescript
import { useEffect } from 'react';
import { useCameraStream } from '@/hooks/useCameraStream';
import { Camera, CameraOff, Loader2 } from 'lucide-react';

interface CameraPreviewProps {
  onCapture?: (blob: Blob) => void;
  facingMode?: 'environment' | 'user';
}

export function CameraPreview({ onCapture, facingMode = 'environment' }: CameraPreviewProps) {
  const { videoRef, stream, error, isLoading, startCamera, stopCamera, captureFrame } =
    useCameraStream({ facingMode });

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [facingMode]);

  const handleCapture = async () => {
    const blob = await captureFrame();
    if (blob && onCapture) {
      onCapture(blob);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center bg-gray-900 rounded-lg">
        <Loader2 className="h-12 w-12 animate-spin text-white" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-96 flex-col items-center justify-center bg-gray-900 rounded-lg text-white">
        <CameraOff className="h-16 w-16 mb-4 text-red-400" />
        <p className="text-lg font-semibold">Camera Error</p>
        <p className="text-sm text-gray-400 mt-2">{error}</p>
        <button
          onClick={startCamera}
          className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full rounded-lg bg-black"
      />

      {stream && (
        <button
          onClick={handleCapture}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-white shadow-lg hover:bg-blue-700"
        >
          <Camera className="h-5 w-5" />
          Capture Photo
        </button>
      )}
    </div>
  );
}
```

### 2.4 Create Camera Capture Page

**`frontend/src/pages/CameraCapture.tsx`**
```typescript
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CameraPreview } from '@/components/camera/CameraPreview';
import { ArrowLeft, Check } from 'lucide-react';

export function CameraCapture() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleCapture = (blob: Blob) => {
    setCapturedBlob(blob);
    setPreviewUrl(URL.createObjectURL(blob));
  };

  const handleRetake = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setCapturedBlob(null);
    setPreviewUrl(null);
  };

  const handleUpload = async () => {
    if (!capturedBlob || !testId) return;

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', capturedBlob, 'camera-capture.jpg');

      const response = await fetch(`/api/v1/photos/upload?test_id=${testId}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      // Navigate back to test detail
      navigate(`/tests/${testId}`);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload photo');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={() => navigate(`/tests/${testId}`)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Test
          </button>
          <h1 className="text-xl font-bold">Camera Capture</h1>
        </div>

        {/* Camera or Preview */}
        <div className="rounded-lg bg-white p-4 shadow">
          {!capturedBlob ? (
            <CameraPreview onCapture={handleCapture} />
          ) : (
            <div className="relative">
              <img
                src={previewUrl || ''}
                alt="Captured"
                className="w-full rounded-lg"
              />
              <div className="mt-4 flex gap-3">
                <button
                  onClick={handleRetake}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-700 hover:bg-gray-50"
                >
                  Retake
                </button>
                <button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isUploading ? (
                    'Uploading...'
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Use This Photo
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

### 2.5 Add Route

Edit `frontend/src/routes.tsx`:

```typescript
import { CameraCapture } from './pages/CameraCapture';

// Add to routes array
{
  path: "/tests/:testId/camera",
  element: <CameraCapture />,
}
```

### 2.6 Add Button to Test Detail Page

Find the test detail page (likely `frontend/src/pages/TestDetail.tsx`) and add a camera button:

```typescript
import { Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Inside component
const navigate = useNavigate();

// Add button near photo upload section
<button
  onClick={() => navigate(`/tests/${testId}/camera`)}
  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
>
  <Camera className="h-5 w-5" />
  Use Camera
</button>
```

---

## Step 3: Test End-to-End (Day 2 Morning)

### 3.1 Start Application

```bash
# Terminal 1: Backend
cd backend
python -m uvicorn app.main:app --reload

# Terminal 2: Frontend
cd frontend
npm run dev
```

### 3.2 Testing Checklist

- [ ] Navigate to a test detail page
- [ ] Click "Use Camera" button
- [ ] Allow camera permissions when prompted
- [ ] See live camera preview
- [ ] Click "Capture Photo" button
- [ ] See captured photo preview
- [ ] Click "Use This Photo" to upload
- [ ] Verify photo appears in test detail page
- [ ] Check photo is stored in MinIO
- [ ] Check database has photo record

### 3.3 Troubleshooting

**Camera not starting:**
- Ensure HTTPS or localhost (camera API requires secure context)
- Check browser permissions
- Try different browser

**Upload failing:**
- Check network tab for error details
- Verify backend is running
- Check MinIO is accessible

---

## Step 4: Add Basic Controls (Day 2 Afternoon)

### 4.1 Add Zoom Control

Update `useCameraStream.ts`:

```typescript
const [zoom, setZoom] = useState(1);

const applyZoom = async (zoomLevel: number) => {
  if (!stream) return;

  const track = stream.getVideoTracks()[0];
  const capabilities = track.getCapabilities() as any;

  if (capabilities.zoom) {
    await track.applyConstraints({
      advanced: [{ zoom: zoomLevel }] as any,
    });
    setZoom(zoomLevel);
  }
};

// Return in hook
return {
  // ... existing returns
  zoom,
  applyZoom,
};
```

Update `CameraPreview.tsx`:

```typescript
import { ZoomIn, ZoomOut } from 'lucide-react';

// Add zoom controls to preview
<div className="absolute top-4 right-4 flex flex-col gap-2">
  <button
    onClick={() => applyZoom(Math.min(zoom + 0.5, 3))}
    className="rounded-full bg-white/80 p-2 shadow hover:bg-white"
  >
    <ZoomIn className="h-5 w-5" />
  </button>
  <button
    onClick={() => applyZoom(Math.max(zoom - 0.5, 1))}
    className="rounded-full bg-white/80 p-2 shadow hover:bg-white"
  >
    <ZoomOut className="h-5 w-5" />
  </button>
</div>
```

### 4.2 Add Grid Overlay

Create `frontend/src/components/camera/GridOverlay.tsx`:

```typescript
interface GridOverlayProps {
  type: 'none' | 'thirds' | 'center';
}

export function GridOverlay({ type }: GridOverlayProps) {
  if (type === 'none') return null;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {type === 'thirds' && (
        <svg className="h-full w-full">
          {/* Vertical lines */}
          <line x1="33.33%" y1="0" x2="33.33%" y2="100%" stroke="white" strokeWidth="1" opacity="0.5" />
          <line x1="66.66%" y1="0" x2="66.66%" y2="100%" stroke="white" strokeWidth="1" opacity="0.5" />
          {/* Horizontal lines */}
          <line x1="0" y1="33.33%" x2="100%" y2="33.33%" stroke="white" strokeWidth="1" opacity="0.5" />
          <line x1="0" y1="66.66%" x2="100%" y2="66.66%" stroke="white" strokeWidth="1" opacity="0.5" />
        </svg>
      )}

      {type === 'center' && (
        <svg className="h-full w-full">
          <line x1="50%" y1="0" x2="50%" y2="100%" stroke="white" strokeWidth="1" opacity="0.5" />
          <line x1="0" y1="50%" x2="100%" y2="50%" stroke="white" strokeWidth="1" opacity="0.5" />
        </svg>
      )}
    </div>
  );
}
```

Add to `CameraPreview.tsx`:

```typescript
import { GridOverlay } from './GridOverlay';

const [gridType, setGridType] = useState<'none' | 'thirds' | 'center'>('none');

// Add to preview container
<div className="relative">
  <video ... />
  <GridOverlay type={gridType} />

  {/* Grid toggle button */}
  <button
    onClick={() => setGridType(gridType === 'none' ? 'thirds' : gridType === 'thirds' ? 'center' : 'none')}
    className="absolute top-4 left-4 rounded-full bg-white/80 px-3 py-1 text-sm shadow"
  >
    Grid: {gridType}
  </button>

  {/* ... rest of buttons */}
</div>
```

---

## Step 5: Polish & Test (Day 3)

### 5.1 Add Loading States

Add spinner while camera initializes, uploading feedback, etc.

### 5.2 Add Error Handling

Graceful error messages for:
- Camera permission denied
- No camera available
- Upload failures

### 5.3 Mobile Testing

Test on real mobile devices:
- iOS Safari
- Android Chrome
- Check camera orientation
- Test front/back camera switching

### 5.4 Documentation

Update project README with camera feature usage.

---

## Next Steps After Phase 1

Once Phase 1 is complete and stable:

1. **Phase 2**: Advanced controls (manual focus, exposure)
2. **Phase 3**: DroidCam integration
3. **Phase 4**: WiFi IP camera support
4. **Phase 5**: AI auto-capture

---

## Verification Checklist

✅ **Backend**:
- [ ] Camera module structure created
- [ ] Database migration applied
- [ ] API endpoints working (test with curl)
- [ ] Camera registration working

✅ **Frontend**:
- [ ] Camera permission requested
- [ ] Live preview displays
- [ ] Capture works
- [ ] Upload to backend succeeds
- [ ] Photo appears in test
- [ ] Zoom controls work
- [ ] Grid overlay displays

✅ **Integration**:
- [ ] End-to-end flow works
- [ ] Error handling graceful
- [ ] Mobile devices tested
- [ ] Performance acceptable

---

## Useful Resources

- [MediaStream API Docs](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream_API)
- [getUserMedia Constraints](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
- [Camera API Browser Compatibility](https://caniuse.com/stream)

---

**Quick Start Version**: 1.0
**Last Updated**: March 11, 2026

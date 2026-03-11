# Dual Camera Setup Guide - Webcam + Smartphone Support

**Date:** March 11, 2026
**Use Case:** Flexible booth camera - USB webcam OR smartphone
**Timeline:** 2-3 days for demo with BOTH options
**Key Insight:** DroidCam makes phones work as webcams - same code!

---

## 🎯 Your Setup: Best of Both Worlds

### Strategy: Implement Once, Support Both

**The Good News:** With DroidCam, you don't need separate implementations!

```
┌─────────────────────────────────────────────────────┐
│  Your QC Vision App (Browser)                       │
│  ↓ MediaStream API                                  │
│  "Select Camera" dropdown                           │
├─────────────────────────────────────────────────────┤
│  Option 1: Built-in Webcam                         │
│  Option 2: USB Webcam (Logitech C920)              │
│  Option 3: DroidCam Virtual Camera ← Smartphone    │
└─────────────────────────────────────────────────────┘
```

**Same code handles all three!** No extra development needed beyond Phase 1.

---

## 📱 Understanding DroidCam

### What DroidCam Does:

1. **On Phone:** Streams camera feed over WiFi/USB
2. **On Computer:** Creates "virtual webcam" driver
3. **To Browser:** Appears as regular webcam device
4. **To Your App:** No difference vs USB webcam!

### DroidCam Modes:

| Mode | Connection | Pros | Cons |
|------|------------|------|------|
| **WiFi** | Wireless over local network | No cables, flexible positioning | Requires stable WiFi, slight latency |
| **USB** | Phone plugged into computer | Stable, no WiFi needed | Cable management in booth |
| **Browser** | Direct IP access | No client software | More complex to implement |

**Recommended for booth:** WiFi mode or USB mode

---

## 🏗️ Implementation Plan (2-3 Days)

### Day 1: Backend (3-4 hours) - Universal for All Cameras

**Follow Quick Start Guide exactly** - no changes needed!

```bash
# Create camera module
cd backend/app/modules
mkdir camera
```

Files to create:
- `models.py` - Camera device model
- `schemas.py` - API schemas
- `service.py` - Camera service
- `router.py` - API endpoints

**Key:** This backend works for webcam, DroidCam, or future IP cameras!

---

### Day 2: Frontend (4-5 hours) - With Camera Selection

#### Step 1: Camera Selection Hook

Create `frontend/src/hooks/useCameraDevices.ts`:

```typescript
import { useState, useEffect } from 'react';

export interface CameraDeviceInfo {
  deviceId: string;
  label: string;
  kind: 'videoinput';
}

export function useCameraDevices() {
  const [devices, setDevices] = useState<CameraDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDevices() {
      try {
        // Request permission first
        await navigator.mediaDevices.getUserMedia({ video: true });

        // Get all video input devices
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = allDevices
          .filter((device) => device.kind === 'videoinput')
          .map((device) => ({
            deviceId: device.deviceId,
            label: device.label || `Camera ${device.deviceId.slice(0, 5)}`,
            kind: 'videoinput' as const,
          }));

        setDevices(videoDevices);

        // Auto-select first device or DroidCam if available
        const droidcam = videoDevices.find((d) =>
          d.label.toLowerCase().includes('droidcam')
        );
        const selected = droidcam || videoDevices[0];

        if (selected) {
          setSelectedDeviceId(selected.deviceId);
        }
      } catch (error) {
        console.error('Failed to enumerate devices:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadDevices();
  }, []);

  return {
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
    isLoading,
  };
}
```

#### Step 2: Enhanced Camera Stream Hook

Update `frontend/src/hooks/useCameraStream.ts`:

```typescript
import { useState, useEffect, useRef } from 'react';

export interface CameraStreamOptions {
  deviceId?: string;
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
      // Stop existing stream if any
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: options.width || 1920 },
          height: { ideal: options.height || 1080 },
        },
      };

      // Use specific device if provided
      if (options.deviceId) {
        (constraints.video as MediaTrackConstraints).deviceId = {
          exact: options.deviceId
        };
      } else if (options.facingMode) {
        (constraints.video as MediaTrackConstraints).facingMode =
          options.facingMode;
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to access camera';
      setError(errorMessage);
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

  const captureFrame = async (): Promise<Blob | null> => {
    if (!videoRef.current) return null;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(videoRef.current, 0, 0);

    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob(
        (blob) => resolve(blob),
        'image/jpeg',
        0.92 // High quality
      );
    });
  };

  // Get camera capabilities for zoom support
  const getCapabilities = () => {
    if (!stream) return null;
    const track = stream.getVideoTracks()[0];
    return track.getCapabilities();
  };

  // Apply zoom if supported
  const applyZoom = async (zoomLevel: number) => {
    if (!stream) return;

    const track = stream.getVideoTracks()[0];
    const capabilities = track.getCapabilities() as any;

    if (capabilities.zoom) {
      try {
        await track.applyConstraints({
          advanced: [{ zoom: zoomLevel }] as any,
        });
      } catch (error) {
        console.error('Zoom not supported:', error);
      }
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Restart camera when deviceId changes
  useEffect(() => {
    if (options.deviceId) {
      startCamera();
    }
  }, [options.deviceId]);

  return {
    videoRef,
    stream,
    error,
    isLoading,
    startCamera,
    stopCamera,
    captureFrame,
    getCapabilities,
    applyZoom,
  };
}
```

#### Step 3: Camera Selector Component

Create `frontend/src/components/camera/CameraSelector.tsx`:

```typescript
import { Camera } from 'lucide-react';

interface CameraSelectorProps {
  devices: Array<{ deviceId: string; label: string }>;
  selectedDeviceId: string;
  onChange: (deviceId: string) => void;
  disabled?: boolean;
}

export function CameraSelector({
  devices,
  selectedDeviceId,
  onChange,
  disabled = false,
}: CameraSelectorProps) {
  if (devices.length === 0) {
    return null;
  }

  // Highlight if DroidCam is selected
  const isDroidCam = devices
    .find((d) => d.deviceId === selectedDeviceId)
    ?.label.toLowerCase()
    .includes('droidcam');

  return (
    <div className="flex items-center gap-3">
      <Camera className="h-5 w-5 text-gray-600" />
      <div className="flex-1">
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Select Camera
        </label>
        <select
          value={selectedDeviceId}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-base font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
        >
          {devices.map((device) => {
            const isDroidCamDevice = device.label.toLowerCase().includes('droidcam');
            return (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label}
                {isDroidCamDevice ? ' 📱' : ''}
              </option>
            );
          })}
        </select>
      </div>
      {isDroidCam && (
        <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
          📱 Smartphone
        </span>
      )}
    </div>
  );
}
```

#### Step 4: Enhanced Booth Capture Page

Create `frontend/src/pages/BoothCapture.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCameraStream } from '@/hooks/useCameraStream';
import { useCameraDevices } from '@/hooks/useCameraDevices';
import { CameraSelector } from '@/components/camera/CameraSelector';
import { Camera, ZoomIn, ZoomOut, Grid3x3, Check, RotateCcw } from 'lucide-react';

export function BoothCapture() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();

  // Camera device selection
  const { devices, selectedDeviceId, setSelectedDeviceId, isLoading: devicesLoading } =
    useCameraDevices();

  // Camera stream with selected device
  const {
    videoRef,
    stream,
    error,
    isLoading: streamLoading,
    startCamera,
    stopCamera,
    captureFrame,
    applyZoom
  } = useCameraStream({
    deviceId: selectedDeviceId,
    width: 1920,
    height: 1080,
  });

  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [gridEnabled, setGridEnabled] = useState(true);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (selectedDeviceId) {
      startCamera();
    }
    return () => stopCamera();
  }, [selectedDeviceId]);

  const handleCameraChange = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
  };

  const handleCapture = async () => {
    const blob = await captureFrame();
    if (blob) {
      setCapturedBlob(blob);
      setPreviewUrl(URL.createObjectURL(blob));
      stopCamera(); // Stop preview after capture
    }
  };

  const handleRetake = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setCapturedBlob(null);
    setPreviewUrl(null);
    startCamera(); // Restart camera
  };

  const handleZoomChange = (delta: number) => {
    const newZoom = Math.max(1, Math.min(3, zoom + delta));
    setZoom(newZoom);
    applyZoom(newZoom);
  };

  const handleUpload = async () => {
    if (!capturedBlob || !testId) return;
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', capturedBlob, 'booth-capture.jpg');

      const response = await fetch(`/api/v1/photos/upload?test_id=${testId}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      navigate(`/tests/${testId}`, {
        state: { message: 'Photo captured successfully!' }
      });
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload photo. Please try again.');
      setIsUploading(false);
    }
  };

  const isLoading = devicesLoading || streamLoading;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900">
        <div className="text-center text-white">
          <div className="mb-4 text-6xl">📷</div>
          <p className="text-2xl font-bold">Initializing Camera...</p>
          <p className="mt-2 text-gray-400">Detecting available cameras</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900">
        <div className="max-w-md text-center text-white">
          <div className="mb-4 text-6xl">⚠️</div>
          <p className="text-2xl font-bold mb-2">Camera Error</p>
          <p className="text-lg text-gray-400 mb-6">{error}</p>

          {devices.length > 0 && (
            <div className="mb-6 text-left bg-gray-800 p-4 rounded-lg">
              <p className="text-sm text-gray-300 mb-3">Try selecting a different camera:</p>
              <CameraSelector
                devices={devices}
                selectedDeviceId={selectedDeviceId}
                onChange={handleCameraChange}
              />
            </div>
          )}

          <button
            onClick={startCamera}
            className="rounded-lg bg-blue-600 px-8 py-4 text-xl font-bold text-white hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4 sm:p-6">
      <div className="mx-auto max-w-6xl">
        {/* Header with Camera Selector */}
        <div className="mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Camera Booth
          </h1>

          {!capturedBlob && devices.length > 1 && (
            <div className="bg-gray-800 rounded-lg p-4">
              <CameraSelector
                devices={devices}
                selectedDeviceId={selectedDeviceId}
                onChange={handleCameraChange}
                disabled={!!capturedBlob}
              />
              <p className="mt-2 text-sm text-gray-400">
                {devices.length} camera(s) available
                {devices.some(d => d.label.toLowerCase().includes('droidcam')) &&
                  ' • DroidCam smartphone detected 📱'}
              </p>
            </div>
          )}
        </div>

        {/* Camera/Preview Area */}
        {!capturedBlob ? (
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full rounded-2xl bg-black shadow-2xl"
              style={{ minHeight: '400px' }}
            />

            {/* Grid Overlay */}
            {gridEnabled && stream && (
              <div className="absolute inset-0 pointer-events-none rounded-2xl overflow-hidden">
                <svg className="h-full w-full">
                  <line x1="33.33%" y1="0" x2="33.33%" y2="100%" stroke="white" strokeWidth="2" opacity="0.6" />
                  <line x1="66.66%" y1="0" x2="66.66%" y2="100%" stroke="white" strokeWidth="2" opacity="0.6" />
                  <line x1="0" y1="33.33%" x2="100%" y2="33.33%" stroke="white" strokeWidth="2" opacity="0.6" />
                  <line x1="0" y1="66.66%" x2="100%" y2="66.66%" stroke="white" strokeWidth="2" opacity="0.6" />
                </svg>
              </div>
            )}

            {/* Controls Overlay */}
            <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-4 px-4">
              {/* Capture Button - LARGE */}
              <button
                onClick={handleCapture}
                disabled={!stream}
                className="flex items-center gap-3 rounded-full bg-blue-600 px-8 sm:px-12 py-5 sm:py-6 text-xl sm:text-2xl font-bold text-white shadow-2xl hover:bg-blue-700 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Camera className="h-7 w-7 sm:h-8 sm:w-8" />
                CAPTURE PHOTO
              </button>

              {/* Secondary Controls */}
              <div className="flex flex-wrap items-center justify-center gap-3 rounded-full bg-black/70 px-4 sm:px-6 py-3 backdrop-blur">
                <button
                  onClick={() => setGridEnabled(!gridEnabled)}
                  className={`flex items-center gap-2 rounded-lg px-3 sm:px-4 py-2 text-base sm:text-lg font-semibold transition-colors ${
                    gridEnabled ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <Grid3x3 className="h-5 w-5" />
                  <span className="hidden sm:inline">Grid</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleZoomChange(-0.5)}
                    disabled={zoom <= 1}
                    className="rounded-lg bg-gray-700 p-2 text-white hover:bg-gray-600 disabled:opacity-30"
                  >
                    <ZoomOut className="h-5 w-5" />
                  </button>
                  <span className="text-base sm:text-lg font-semibold text-white min-w-[60px] text-center">
                    {zoom.toFixed(1)}x
                  </span>
                  <button
                    onClick={() => handleZoomChange(0.5)}
                    disabled={zoom >= 3}
                    className="rounded-lg bg-gray-700 p-2 text-white hover:bg-gray-600 disabled:opacity-30"
                  >
                    <ZoomIn className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <img
              src={previewUrl || ''}
              alt="Captured"
              className="w-full rounded-2xl shadow-2xl"
            />

            {/* Action Buttons - LARGE */}
            <div className="mt-6 flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleRetake}
                disabled={isUploading}
                className="flex items-center justify-center gap-3 rounded-xl bg-gray-700 px-6 sm:px-8 py-5 sm:py-6 text-xl sm:text-2xl font-bold text-white hover:bg-gray-600 disabled:opacity-50"
              >
                <RotateCcw className="h-6 w-6 sm:h-7 sm:w-7" />
                RETAKE
              </button>
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className="flex flex-1 items-center justify-center gap-3 rounded-xl bg-green-600 px-6 sm:px-8 py-5 sm:py-6 text-xl sm:text-2xl font-bold text-white hover:bg-green-700 disabled:opacity-50"
              >
                {isUploading ? (
                  'UPLOADING...'
                ) : (
                  <>
                    <Check className="h-6 w-6 sm:h-7 sm:w-7" />
                    USE THIS PHOTO
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

Add route in `frontend/src/routes.tsx`:
```typescript
{
  path: "/tests/:testId/camera",
  element: <BoothCapture />,
}
```

---

### Day 3: Hardware Setup & Testing

#### Option A: USB Webcam Setup (10 minutes)
1. Plug USB webcam into booth computer
2. Mount to position
3. Open app, camera appears in dropdown
4. ✅ Done!

#### Option B: DroidCam Smartphone Setup (20 minutes)

**Step 1: Install DroidCam on Phone**
- Android: [Google Play Store](https://play.google.com/store/apps/details?id=com.dev47apps.droidcam)
- iOS: [DroidCam on App Store](https://apps.apple.com/app/droidcam-webcam-obs-camera/id1510258102)
- Free version works fine; Pro ($5) adds HD and removes ads

**Step 2: Install DroidCam Client on Booth Computer**
- Download from [https://www.dev47apps.com/](https://www.dev47apps.com/)
- Install for Windows/Mac/Linux
- Run DroidCam client

**Step 3: Connect Phone to Computer**

**WiFi Mode (Recommended for booth):**
1. Ensure phone and computer on same network
2. Open DroidCam app on phone
3. Note the WiFi IP shown (e.g., 192.168.1.100)
4. Open DroidCam client on computer
5. Select "WiFi", enter IP address
6. Click "Start"
7. ✅ "DroidCam Video" now appears as webcam!

**USB Mode (More stable):**
1. Enable USB debugging on phone (Android)
2. Connect phone via USB cable
3. Open DroidCam client
4. Select "USB"
5. Click "Start"
6. ✅ Connected!

**Step 4: Mount Phone in Booth**
- Use phone mount/tripod
- Position camera to capture product area
- Keep phone plugged in for power (USB mode) or charger (WiFi mode)

**Step 5: Test in Browser**
1. Open your QC Vision app
2. Navigate to camera capture page
3. Click camera dropdown
4. Select "DroidCam Video" or "DroidCam Source"
5. See phone camera feed
6. ✅ Ready to capture!

---

## 🎉 What You Get

### Single Implementation, Multiple Cameras

Your users see:
```
┌────────────────────────────────────┐
│  Select Camera ▼                   │
│  ├─ Built-in Camera                │
│  ├─ Logitech C920 (Booth 1)        │
│  └─ DroidCam Video 📱 (Booth 2)    │
└────────────────────────────────────┘
```

They just pick the camera they want to use. **The app doesn't care which type it is!**

### Flexibility

- **Booth 1:** USB webcam (simple, cheap)
- **Booth 2:** DroidCam smartphone (better quality)
- **Booth 3:** Both available as fallback
- **Home/Remote:** Worker uses laptop webcam

---

## 📊 Comparison Table

| Feature | USB Webcam | DroidCam Smartphone |
|---------|------------|---------------------|
| **Setup Time** | 2 minutes | 20 minutes |
| **Cost** | $30-100 | $0-5 (app) + old phone |
| **Image Quality** | 720p-1080p | 1080p-4K (depends on phone) |
| **Connection** | USB (wired) | WiFi or USB |
| **Reliability** | Very high | High (WiFi dependent) |
| **Zoom Quality** | Digital (basic) | Digital + optical (better) |
| **Low Light** | Depends on model | Usually excellent |
| **Flash/Light** | Some models | Phone flash available |
| **Maintenance** | None (dedicated) | Keep app updated |
| **Portability** | Fixed | Easy to reposition |
| **Implementation** | ✅ Day 1-2 | ✅ Day 1-2 (same code!) |

---

## 🔧 Troubleshooting

### DroidCam Issues

**Problem:** DroidCam doesn't appear in camera list

**Solutions:**
1. Ensure DroidCam client is running on computer
2. Check "Start" is clicked in client
3. Restart browser
4. Check System Preferences → Camera permissions (Mac)
5. For WiFi: verify same network, check firewall

**Problem:** "No camera found" in DroidCam client

**Solutions:**
- WiFi: Verify IP address, check phone shows "Ready" status
- USB: Enable USB debugging (Android Settings → Developer Options)
- Try different USB cable/port
- Restart DroidCam app on phone

**Problem:** Poor quality or lag

**Solutions:**
- Use USB mode instead of WiFi (more stable)
- Upgrade to DroidCam Pro for HD
- Reduce resolution in DroidCam settings
- Ensure strong WiFi signal
- Close other apps on phone

### Webcam Issues

**Problem:** Webcam not detected

**Solutions:**
1. Check USB connection
2. Try different USB port (prefer USB 3.0)
3. Restart browser
4. Check Windows Device Manager / Mac System Report
5. Update webcam drivers

---

## 💰 Cost Comparison

### Budget Booth (<$50)
- Basic USB webcam: $30
- Desktop tripod: $15
- **Total: $45**

### Quality Booth (~$100)
- Logitech C920 webcam: $70
- Adjustable clamp mount: $20
- USB extension cable: $10
- **Total: $100**

### Smartphone Booth ($0-$50)
- Old/spare smartphone: $0
- DroidCam app: Free or $5 (Pro)
- Phone mount: $15-30
- Long USB cable (if USB mode): $10
- **Total: $5-45**

### Hybrid Booth (Recommended: $100-150)
- Logitech C920 webcam: $70
- Spare smartphone: $0
- DroidCam Pro: $5
- Phone mount: $20
- Desktop tripod: $15
- **Total: $110**
**Benefit:** Two cameras as fallback + quality options

---

## 🎯 Recommended Approach

### For 2-3 Day Demo:

**Day 1-2:** Implement Phase 1 (works for both)
**Day 3 Morning:** Test with USB webcam first (quickest)
**Day 3 Afternoon:** Set up DroidCam as alternative
**Demo:** Show both options, let stakeholders choose

### Best Booth Strategy:

**Primary:** USB Webcam (Logitech C920)
- Simple, reliable, always works
- Good enough quality for QC photos

**Backup:** DroidCam Smartphone
- Available if webcam fails
- Better quality for critical inspections
- Easy to reposition for different angles

**Result:** Flexible, reliable, cost-effective booth

---

## 📱 Pro Tips

### For USB Webcam:
1. Position ~2-3 feet from product
2. Angle slightly downward
3. Use even lighting (LED panel)
4. Keep lens clean
5. Label USB port for easy reconnection

### For DroidCam:
1. Keep phone charged (plugged in)
2. Use dedicated old phone (not daily driver)
3. Disable phone auto-lock/sleep
4. Set DroidCam to auto-start on boot
5. Use USB mode if WiFi unreliable
6. Keep phone in airplane mode + WiFi on (reduces interference)

### For Both:
1. Test focus point with actual products
2. Save camera preferences
3. Train workers on both systems
4. Keep backup USB webcam handy
5. Document setup for IT support

---

## ✅ Testing Checklist

### Before Demo:

**USB Webcam:**
- [ ] Webcam plugged in and mounted
- [ ] Appears in browser camera list
- [ ] Focus is clear
- [ ] Lighting is adequate
- [ ] Capture works end-to-end

**DroidCam:**
- [ ] Phone has DroidCam app installed
- [ ] DroidCam client installed on computer
- [ ] Connection works (WiFi or USB)
- [ ] Appears as "DroidCam" in camera list
- [ ] Image quality is good
- [ ] Capture works end-to-end

**Application:**
- [ ] Camera selector shows both cameras
- [ ] Can switch between cameras
- [ ] Capture button works
- [ ] Upload successful
- [ ] Photos appear in test
- [ ] Error handling graceful

---

## 🚀 Next Steps After Demo

### If USB Webcam is Sufficient ✅
- Deploy to production
- Buy webcams for all booths
- Skip DroidCam complexity
- Focus on other features

### If DroidCam Quality is Better ✅
- Procure dedicated phones for booths
- Standardize on DroidCam setup
- Create setup guide for new booths
- Train IT support staff

### If Both Are Needed ✅
- Keep both options available
- Let each booth choose based on needs
- Maintain fallback capability
- Consider IP cameras for Phase 4

---

## 📚 Resources

### DroidCam:
- Official Site: https://www.dev47apps.com/
- Setup Guide: https://www.dev47apps.com/droidcam/connect/
- Troubleshooting: https://www.dev47apps.com/droidcam/faq/

### USB Webcams:
- Logitech C920 Manual: https://support.logi.com/hc/en-us/articles/360024846573
- Webcam Comparison: https://www.rtings.com/webcam

### Browser APIs:
- MediaDevices: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices
- getUserMedia: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia

---

## Summary

**You get both webcam AND smartphone camera support with the same implementation!**

### Key Insights:
1. ✅ DroidCam creates a virtual webcam
2. ✅ Browser treats it as a regular camera device
3. ✅ Your Phase 1 code handles both automatically
4. ✅ No extra development needed beyond camera selection dropdown
5. ✅ Workers can choose best camera for their booth

### Timeline Confirmed:
- **Day 1:** Backend (same for all cameras)
- **Day 2:** Frontend with camera selection
- **Day 3:** Test both hardware setups

**You're ready to start!** 🎉

---

**Document Version:** 1.0
**Last Updated:** March 11, 2026
**Status:** Ready for Implementation

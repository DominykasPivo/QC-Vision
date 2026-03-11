# Camera IoT Architecture Diagram

## High-Level Architecture

```mermaid
flowchart TB
    subgraph USER["User Devices"]
        WEB["Web Browser<br/>(Desktop/Mobile)"]
        MOBILE["Smartphone<br/>(DroidCam App)"]
        IPCAM["WiFi IP Camera"]
    end

    subgraph FRONTEND["Frontend Layer"]
        PREVIEW["Camera Preview<br/>Component"]
        CONTROLS["Camera Controls<br/>(Zoom/Focus/Grid)"]
        CAPTURE["Capture Button"]
        SELECTOR["Camera Selector"]
    end

    subgraph BACKEND["Backend Layer"]
        ROUTER["Camera Router<br/>/api/v1/cameras"]
        SERVICE["Camera Service"]
        WS["WebSocket Handler"]
        ADAPTERS["Camera Adapters"]
    end

    subgraph STREAMING["Streaming Layer"]
        FFMPEG["FFmpeg<br/>Transcoder"]
        HLS["HLS Server"]
        RTSP["RTSP Server"]
    end

    subgraph DATA["Data & Storage"]
        DB[("PostgreSQL<br/>Camera Metadata")]
        MINIO[("MinIO<br/>Captured Photos")]
    end

    subgraph AI["AI Layer (Phase 5)"]
        DETECTION["Object Detection<br/>Service"]
        MODEL["ML Model<br/>(TensorFlow Lite)"]
    end

    WEB -->|MediaStream API| PREVIEW
    MOBILE -->|HTTP/RTSP Stream| ADAPTERS
    IPCAM -->|RTSP/ONVIF| ADAPTERS

    PREVIEW --> CONTROLS
    CONTROLS --> CAPTURE
    SELECTOR --> ROUTER

    CAPTURE -->|REST API| ROUTER
    ROUTER --> SERVICE
    SERVICE --> ADAPTERS
    WS -->|Live Status| PREVIEW

    ADAPTERS -->|Raw Stream| FFMPEG
    FFMPEG --> HLS
    HLS -->|HLS Stream| PREVIEW
    ADAPTERS -->|RTSP| RTSP
    RTSP -->|Relay| PREVIEW

    SERVICE -->|Save Metadata| DB
    SERVICE -->|Store Photo| MINIO

    PREVIEW -.->|Frame Sampling| DETECTION
    DETECTION --> MODEL
    MODEL -.->|Detection Result| WS
    WS -.->|Auto Trigger| CAPTURE

    style AI stroke-dasharray: 5 5
```

## Component Interaction Flow

### Flow 1: Browser Camera Capture (Phase 1)
```mermaid
sequenceDiagram
    actor User
    participant Browser
    participant Frontend
    participant Backend
    participant MinIO
    participant DB

    User->>Browser: Click "Use Camera"
    Browser->>Browser: Request camera permission
    Browser->>Frontend: MediaStream active
    Frontend->>Frontend: Display live preview
    User->>Frontend: Adjust zoom/focus
    User->>Frontend: Click "Capture"
    Frontend->>Frontend: Capture frame from video
    Frontend->>Backend: POST /api/v1/cameras/capture
    Backend->>Backend: Validate & process image
    Backend->>MinIO: Store photo
    Backend->>DB: Save photo metadata
    Backend->>Frontend: Return photo ID
    Frontend->>User: Show success + thumbnail
```

### Flow 2: WiFi Camera Capture (Phase 4)
```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant Backend
    participant Adapter
    participant IPCamera
    participant FFmpeg
    participant MinIO

    User->>Frontend: Select "Warehouse Camera 1"
    Frontend->>Backend: GET /api/v1/cameras/1/stream
    Backend->>Adapter: Request stream URL
    Adapter->>IPCamera: RTSP connection
    IPCamera->>Adapter: RTSP stream
    Adapter->>FFmpeg: Transcode to HLS
    FFmpeg->>Frontend: HLS stream
    Frontend->>User: Display live preview
    User->>Frontend: Click "Capture"
    Frontend->>Backend: POST /api/v1/cameras/1/capture
    Backend->>Adapter: Request snapshot
    Adapter->>IPCamera: Capture frame
    IPCamera->>Adapter: JPEG/PNG data
    Adapter->>Backend: Image bytes
    Backend->>MinIO: Store photo
    Backend->>Frontend: Photo metadata
```

### Flow 3: Auto-Capture with AI Detection (Phase 5)
```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant WebSocket
    participant Backend
    participant Detection
    participant Model
    participant Capture

    User->>Frontend: Enable "Auto-Capture"
    Frontend->>WebSocket: Connect ws://camera/1
    loop Every 500ms
        Frontend->>Frontend: Extract video frame
        Frontend->>WebSocket: Send frame for analysis
        WebSocket->>Detection: Frame bytes
        Detection->>Model: Run inference
        Model->>Detection: Detection result
        Detection->>WebSocket: Confidence score
        WebSocket->>Frontend: Show detection box
        alt Confidence > 85%
            Detection->>Capture: Trigger auto-capture
            Capture->>Backend: Save photo
            Backend->>WebSocket: Capture complete
            WebSocket->>Frontend: Show notification
        end
    end
```

## Camera Adapter Architecture

```mermaid
classDiagram
    class CameraAdapter {
        <<abstract>>
        +connect(connection_url) bool
        +disconnect() bool
        +get_stream_url() str
        +capture_frame() bytes
        +set_settings(settings) bool
        +get_capabilities() dict
    }

    class BrowserAdapter {
        +type: "browser"
        +use_mediastream_api()
    }

    class DroidCamAdapter {
        +type: "droidcam"
        +base_url: str
        +port: int
        +connect_http()
        +get_mjpeg_stream()
    }

    class RTSPAdapter {
        +type: "rtsp"
        +rtsp_url: str
        +use_ffmpeg_proxy()
    }

    class ONVIFAdapter {
        +type: "onvif"
        +ip: str
        +credentials: dict
        +use_onvif_protocol()
        +ptz_control()
    }

    CameraAdapter <|-- BrowserAdapter
    CameraAdapter <|-- DroidCamAdapter
    CameraAdapter <|-- RTSPAdapter
    CameraAdapter <|-- ONVIFAdapter
```

## Frontend State Management

```mermaid
stateDiagram-v2
    [*] --> NoCameraSelected
    NoCameraSelected --> Connecting: Select Camera
    Connecting --> StreamActive: Connection Success
    Connecting --> ConnectionError: Connection Failed
    ConnectionError --> Connecting: Retry
    StreamActive --> Capturing: Click Capture
    Capturing --> StreamActive: Capture Success
    Capturing --> CaptureError: Capture Failed
    CaptureError --> StreamActive: Dismiss Error
    StreamActive --> Disconnecting: Close Camera
    Disconnecting --> NoCameraSelected: Cleanup Complete

    StreamActive --> AutoCapture: Enable Auto-Capture
    AutoCapture --> StreamActive: Disable Auto-Capture
    AutoCapture --> Capturing: Object Detected
```

## Data Model Relationships

```mermaid
erDiagram
    CAMERA_DEVICES ||--o{ CAMERA_PRESETS : has
    CAMERA_DEVICES ||--o{ CAMERA_SESSIONS : creates
    CAMERA_DEVICES ||--o{ PHOTOS : captures
    CAMERA_SESSIONS ||--o{ PHOTOS : contains
    PHOTOS }o--|| TESTS : belongs_to

    CAMERA_DEVICES {
        int id PK
        string name
        string type
        string connection_url
        string status
        jsonb capabilities
        timestamp last_seen
    }

    CAMERA_PRESETS {
        int id PK
        int camera_id FK
        string name
        jsonb settings
        bool is_default
    }

    CAMERA_SESSIONS {
        int id PK
        int camera_id FK
        int test_id FK
        string mode
        timestamp started_at
        int photos_captured
    }

    PHOTOS {
        int id PK
        int test_id FK
        int camera_id FK "nullable"
        string file_path
        string capture_mode
        jsonb camera_settings
    }

    TESTS {
        int id PK
        string jira_id
        string product_name
    }
```

## Technology Stack Overview

```mermaid
graph LR
    subgraph Frontend["Frontend Stack"]
        A[React + TypeScript]
        B[MediaStream API]
        C[Canvas API]
        D[WebSocket Client]
    end

    subgraph Backend["Backend Stack"]
        E[FastAPI]
        F[SQLAlchemy]
        G[WebSocket Server]
        H[Python Adapters]
    end

    subgraph Streaming["Streaming Stack"]
        I[FFmpeg]
        J[HLS Server]
        K[RTSP Relay]
    end

    subgraph AI["AI Stack - Phase 5"]
        L[TensorFlow Lite]
        M[OpenCV]
        N[YOLO/MobileNet]
    end

    Frontend --> Backend
    Backend --> Streaming
    Streaming --> Frontend
    Frontend -.-> AI
    AI -.-> Backend

    style AI stroke-dasharray: 5 5
    style Frontend fill:#e1f5ff
    style Backend fill:#fff4e1
    style Streaming fill:#f0e1ff
    style AI fill:#e1ffe1
```

---

## Phase-wise Architecture Evolution

### Phase 1: Browser Camera Only
```
User Browser → MediaStream API → React Preview → Canvas Capture → Backend Upload → MinIO
```

### Phase 3: + Smartphone Integration
```
                        ┌→ Browser Camera (above)
User Device Selection → │
                        └→ DroidCam → HTTP Stream → Backend Proxy → Frontend Preview
```

### Phase 4: + WiFi Cameras
```
                        ┌→ Browser Camera
User Device Selection → ├→ DroidCam
                        └→ WiFi Camera → RTSP → FFmpeg → HLS → Frontend Preview
```

### Phase 5: + AI Auto-Capture
```
Frontend Preview → Frame Sampling → WebSocket → Detection Service → ML Model
                                                      ↓
                                              Confidence > 85%
                                                      ↓
                                              Auto Trigger Capture
```

---

## Network Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  LAN / Internal Network                                      │
│                                                              │
│  ┌──────────┐        ┌──────────┐        ┌──────────┐     │
│  │ DroidCam │        │ WiFi IP  │        │ WiFi IP  │     │
│  │ @ :4747  │        │ Camera 1 │        │ Camera 2 │     │
│  └────┬─────┘        └────┬─────┘        └────┬─────┘     │
│       │                   │                    │            │
│       └───────────────────┴────────────────────┘            │
│                           │                                 │
│                    ┌──────▼──────┐                         │
│                    │   Backend   │                         │
│                    │   :8000     │                         │
│                    └──────┬──────┘                         │
│                           │                                 │
│                    ┌──────▼──────┐                         │
│                    │  Streaming  │                         │
│                    │   :8554     │                         │
│                    └──────┬──────┘                         │
└───────────────────────────┼─────────────────────────────────┘
                            │
                     ┌──────▼──────┐
                     │  Frontend   │
                     │   :3000     │
                     └─────────────┘
                            ▲
                            │
                     ┌──────┴──────┐
                     │   Users     │
                     └─────────────┘
```

---

**Diagram Version**: 1.0
**Last Updated**: March 11, 2026

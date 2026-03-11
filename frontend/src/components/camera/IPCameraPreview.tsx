/**
 * IPCameraPreview - Component for displaying IP camera MJPEG stream
 *
 * Shows image preview with optional grid overlay and zoom controls.
 * Similar to CameraPreview but for IP cameras (uses <img> instead of <video>).
 */

import { GridOverlay } from "./GridOverlay";

interface IPCameraPreviewProps {
  streamUrl: string;
  showGrid?: boolean;
  zoom?: number;
  onStreamReady?: () => void;
  onStreamError?: (error: string) => void;
  className?: string;
}

export function IPCameraPreview({
  streamUrl,
  showGrid = false,
  zoom = 1,
  onStreamReady,
  onStreamError,
  className = "",
}: IPCameraPreviewProps) {
  return (
    <div
      className={`relative bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center ${className}`}
    >
      <img
        src={streamUrl}
        alt="IP Camera Stream"
        className="w-full h-full object-contain"
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: "center",
        }}
        onLoad={() => onStreamReady?.()}
        onError={(e) => {
          console.error("Failed to load IP camera stream:", streamUrl, e);
          onStreamError?.(`Failed to load stream from ${streamUrl}`);
        }}
      />
      {showGrid && <GridOverlay />}
    </div>
  );
}

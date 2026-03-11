/**
 * CameraPreview - Component for displaying live camera feed
 *
 * Shows video preview with optional grid overlay and zoom controls.
 * Integrates with useCameraStream hook for stream management.
 */

import { useEffect } from "react";
import { useCameraStream } from "@/hooks";

interface CameraPreviewProps {
  deviceId?: string;
  width?: number;
  height?: number;
  showGrid?: boolean;
  zoom?: number;
  onStreamReady?: (stream: MediaStream) => void;
  videoRef?: React.RefObject<HTMLVideoElement>;
  className?: string;
}

export function CameraPreview({
  deviceId,
  width = 1920,
  height = 1080,
  showGrid = false,
  zoom = 1,
  onStreamReady,
  videoRef: externalVideoRef,
  className = "",
}: CameraPreviewProps) {
  const {
    stream,
    videoRef: internalVideoRef,
    isLoading,
    isActive,
    error,
    startCamera,
    stopCamera,
  } = useCameraStream({
    deviceId,
    width,
    height,
    videoRef: externalVideoRef,
  });

  // Use external ref if provided, otherwise use internal ref from hook
  const videoRef = externalVideoRef || internalVideoRef;

  useEffect(() => {
    if (isActive && stream && onStreamReady) {
      onStreamReady(stream);
    }
  }, [isActive, stream, onStreamReady]);

  // Auto-start camera when deviceId becomes available
  useEffect(() => {
    if (deviceId && !stream && !isLoading && !error) {
      // Delay to ensure video element is properly laid out
      const timer = setTimeout(() => {
        startCamera();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [deviceId, stream, isLoading, error, startCamera]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  if (error) {
    return (
      <div
        className={`bg-red-50 border-2 border-red-300 rounded-lg p-6 ${className}`}
      >
        <h3 className="text-red-800 font-semibold mb-2 text-lg">
          📷 Camera Error
        </h3>
        <p className="text-red-700 mb-3">{error}</p>
        {error.includes("DroidCam") && (
          <div className="bg-amber-50 border border-amber-300 rounded p-3 mb-3 text-sm">
            <p className="font-semibold text-amber-800 mb-1">DroidCam Setup:</p>
            <ol className="list-decimal ml-4 text-amber-700 space-y-1">
              <li>Open DroidCam app on your phone</li>
              <li>Open DroidCam Client on Windows</li>
              <li>Connect via USB or WiFi</li>
              <li>Verify video shows in DroidCam Client window</li>
              <li>Then try again here</li>
            </ol>
          </div>
        )}
        <button
          onClick={startCamera}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-semibold"
        >
          Retry Camera
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        className={`bg-gray-100 rounded-lg flex items-center justify-center ${className}`}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing camera...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: "center",
          width: "100%",
          height: "100%",
          display: "block",
        }}
        className="object-cover rounded-lg bg-black"
      />

      {showGrid && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ opacity: 0.3 }}
        >
          {/* Rule of thirds grid */}
          <line
            x1="33.33%"
            y1="0"
            x2="33.33%"
            y2="100%"
            stroke="white"
            strokeWidth="1"
          />
          <line
            x1="66.66%"
            y1="0"
            x2="66.66%"
            y2="100%"
            stroke="white"
            strokeWidth="1"
          />
          <line
            x1="0"
            y1="33.33%"
            x2="100%"
            y2="33.33%"
            stroke="white"
            strokeWidth="1"
          />
          <line
            x1="0"
            y1="66.66%"
            x2="100%"
            y2="66.66%"
            stroke="white"
            strokeWidth="1"
          />
        </svg>
      )}

      {!stream && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75 rounded-lg">
          <button
            onClick={startCamera}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Start Camera
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * useCameraCapture - Hook for capturing frames from camera stream
 *
 * Handles canvas-based frame capture, file conversion, and upload.
 * Integrates with existing photo upload flow.
 */

import { useState } from "react";

export interface CaptureSettings {
  zoom?: number;
  quality?: number;
  format?: "image/jpeg" | "image/png" | "image/webp";
}

export function useCameraCapture(videoRef: React.RefObject<HTMLVideoElement>) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [lastCapturedImage, setLastCapturedImage] = useState<string | null>(
    null,
  );

  const captureFrame = async (
    settings: CaptureSettings = {},
  ): Promise<Blob | null> => {
    if (!videoRef.current) {
      console.error("Video ref not available");
      return null;
    }

    const video = videoRef.current;
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      console.error("Video not ready");
      return null;
    }

    setIsCapturing(true);

    try {
      // Create canvas with video dimensions
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Failed to get canvas context");
      }

      // Apply zoom if specified
      if (settings.zoom && settings.zoom > 1) {
        const scale = settings.zoom;
        const scaledWidth = canvas.width / scale;
        const scaledHeight = canvas.height / scale;
        const x = (canvas.width - scaledWidth) / 2;
        const y = (canvas.height - scaledHeight) / 2;

        ctx.drawImage(
          video,
          x,
          y,
          scaledWidth,
          scaledHeight,
          0,
          0,
          canvas.width,
          canvas.height,
        );
      } else {
        ctx.drawImage(video, 0, 0);
      }

      // Convert canvas to blob
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(
          (b) => resolve(b),
          settings.format || "image/jpeg",
          settings.quality || 0.92,
        );
      });

      if (blob) {
        // Create preview URL
        const imageUrl = URL.createObjectURL(blob);
        setLastCapturedImage(imageUrl);
      }

      return blob;
    } catch (err) {
      console.error("Capture error:", err);
      return null;
    } finally {
      setIsCapturing(false);
    }
  };

  const clearLastImage = () => {
    if (lastCapturedImage) {
      URL.revokeObjectURL(lastCapturedImage);
      setLastCapturedImage(null);
    }
  };

  return {
    captureFrame,
    isCapturing,
    lastCapturedImage,
    clearLastImage,
  };
}

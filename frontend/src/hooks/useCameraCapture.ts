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

    // Ensure video dimensions are valid
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.error("Video dimensions not available yet");
      return null;
    }

    setIsCapturing(true);

    try {
      // Calculate 16:9 crop from video (matching object-cover behavior)
      const targetAspect = 16 / 9;
      const videoAspect = video.videoWidth / video.videoHeight;

      let sourceX = 0;
      let sourceY = 0;
      let sourceWidth = video.videoWidth;
      let sourceHeight = video.videoHeight;

      if (videoAspect > targetAspect) {
        // Video is wider - crop sides
        sourceWidth = video.videoHeight * targetAspect;
        sourceX = (video.videoWidth - sourceWidth) / 2;
      } else {
        // Video is taller - crop top/bottom
        sourceHeight = video.videoWidth / targetAspect;
        sourceY = (video.videoHeight - sourceHeight) / 2;
      }

      // Create canvas with 16:9 aspect ratio
      const canvas = document.createElement("canvas");
      canvas.width = sourceWidth;
      canvas.height = sourceHeight;

      console.log(
        `Capturing frame: ${canvas.width}x${canvas.height} (cropped from ${video.videoWidth}x${video.videoHeight})`,
      );

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Failed to get canvas context");
      }

      // Apply zoom if specified
      if (settings.zoom && settings.zoom > 1) {
        const scale = settings.zoom;
        const scaledWidth = sourceWidth / scale;
        const scaledHeight = sourceHeight / scale;
        const zoomX = sourceX + (sourceWidth - scaledWidth) / 2;
        const zoomY = sourceY + (sourceHeight - scaledHeight) / 2;

        ctx.drawImage(
          video,
          zoomX,
          zoomY,
          scaledWidth,
          scaledHeight,
          0,
          0,
          canvas.width,
          canvas.height,
        );
      } else {
        // Draw cropped 16:9 portion
        ctx.drawImage(
          video,
          sourceX,
          sourceY,
          sourceWidth,
          sourceHeight,
          0,
          0,
          canvas.width,
          canvas.height,
        );
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

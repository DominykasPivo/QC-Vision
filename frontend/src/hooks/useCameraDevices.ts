/**
 * useCameraDevices - Hook for enumerating and selecting camera devices
 *
 * Provides device enumeration for USB webcams, built-in cameras, and DroidCam.
 * Follows Custom Hooks pattern for reusable React state logic.
 */

import { useState, useEffect } from "react";

export interface CameraDeviceInfo {
  deviceId: string;
  label: string;
  kind: "videoinput";
}

export function useCameraDevices() {
  const [devices, setDevices] = useState<CameraDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDevices();
  }, []);

  async function loadDevices() {
    setIsLoading(true);
    setError(null);

    try {
      // Request permission first
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });

      // Stop permission stream immediately
      stream.getTracks().forEach((track) => track.stop());

      // Get all video input devices
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices
        .filter((device) => device.kind === "videoinput")
        .map((device) => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${device.deviceId.slice(0, 5)}`,
          kind: "videoinput" as const,
        }));

      setDevices(videoDevices);

      // Auto-select DroidCam if available, otherwise first device
      const droidcam = videoDevices.find((d) =>
        d.label.toLowerCase().includes("droidcam"),
      );
      const selected = droidcam || videoDevices[0];

      if (selected) {
        setSelectedDeviceId(selected.deviceId);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to enumerate devices";
      setError(errorMessage);
      console.error("Camera enumeration error:", err);
    } finally {
      setIsLoading(false);
    }
  }

  return {
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
    isLoading,
    error,
    reload: loadDevices,
  };
}

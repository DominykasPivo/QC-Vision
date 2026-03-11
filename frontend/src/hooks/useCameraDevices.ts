/**
 * useCameraDevices - Hook for enumerating and selecting camera devices
 *
 * Provides device enumeration for USB webcams, built-in cameras, DroidCam,
 * and IP cameras registered in the backend database.
 * Follows Custom Hooks pattern for reusable React state logic.
 */

import { useState, useEffect } from "react";
import { fetchCameras } from "@/lib/api/cameras";

export interface CameraDeviceInfo {
  deviceId: string;
  label: string;
  kind: "videoinput" | "ip_camera";
  // For IP cameras
  backendId?: number;
  connectionInfo?: string;
  status?: string;
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
      const allCameras: CameraDeviceInfo[] = [];

      // 1. Get browser MediaStream devices (USB webcams, built-in, DroidCam)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        stream.getTracks().forEach((track) => track.stop());

        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = allDevices
          .filter((device) => device.kind === "videoinput")
          .map((device) => ({
            deviceId: device.deviceId,
            label: device.label || `Camera ${device.deviceId.slice(0, 5)}`,
            kind: "videoinput" as const,
          }));

        allCameras.push(...videoDevices);
      } catch (browserErr) {
        console.warn(
          "[useCameraDevices] Browser camera enumeration failed:",
          browserErr,
        );
        // Continue even if browser cameras fail
      }

      // 2. Get IP cameras from backend
      try {
        const backendCameras = await fetchCameras();

        const ipCameras: CameraDeviceInfo[] = backendCameras
          .filter((cam) => cam.type === "ip_camera" || cam.type === "wifi")
          .map((cam) => ({
            deviceId: `ip-camera-${cam.id}`,
            label: `${cam.name} (IP Camera)`,
            kind: "ip_camera" as const,
            backendId: cam.id,
            connectionInfo: cam.connection_info ?? undefined,
            status: cam.status,
          }));

        allCameras.push(...ipCameras);
      } catch (backendErr) {
        console.error(
          "[useCameraDevices] Backend camera fetch failed:",
          backendErr,
        );
        // Continue even if backend fetch fails
      }

      setDevices(allCameras);

      // Auto-select priority: DroidCam > IP camera > first device
      const droidcam = allCameras.find((d) =>
        d.label.toLowerCase().includes("droidcam"),
      );
      const ipCamera = allCameras.find((d) => d.kind === "ip_camera");
      const selected = droidcam || ipCamera || allCameras[0];

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

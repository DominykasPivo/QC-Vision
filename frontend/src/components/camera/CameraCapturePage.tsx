/**
 * CameraCapturePage - Full-page camera capture interface
 *
 * Integrates CameraSelector, CameraPreview, CameraControls, and capture logic.
 * Handles photo capture workflow and upload to backend.
 * Follows Composite and Observer patterns.
 */

import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCameraDevices, useCameraCapture, useCropModal } from "@/hooks";
import { CameraSelector } from "./CameraSelector";
import { CameraPreview } from "./CameraPreview";
import { IPCameraPreview } from "./IPCameraPreview";
import { CameraControls } from "./CameraControls";
import { CAPTURE_CONFIG } from "./constants";
import { CropModal } from "../tests/CropModal";
import { ArrowLeft, Check, RotateCw, Crop } from "lucide-react";
import { rotateImageFile } from "@/lib/utils/image-rotation";
import { cropImageFile, type CropArea } from "@/lib/utils/image-crop";

export function CameraCapturePage() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);

  const { devices, selectedDeviceId, setSelectedDeviceId } = useCameraDevices();
  const { captureFrame, isCapturing, clearLastImage } =
    useCameraCapture(videoRef);

  // Get full device info to check if it's an IP camera
  const selectedDevice = devices.find((d) => d.deviceId === selectedDeviceId);
  const isIPCamera = selectedDevice?.kind === "ip_camera";

  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(false);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [originalCapturedBlob, setOriginalCapturedBlob] = useState<Blob | null>(
    null,
  );
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isStreamActive, setIsStreamActive] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { showCropModal, cropImageUrl, openCropModal, closeCropModal } =
    useCropModal();

  const handleCameraChange = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    setIsStreamActive(false);
  };

  const handleStreamReady = () => {
    setIsStreamActive(true);
  };

  // Reset stream state when camera device changes
  useEffect(() => {
    setIsStreamActive(false);
  }, [selectedDeviceId]);

  // Update preview URL when captured blob changes
  useEffect(() => {
    if (capturedBlob) {
      const url = URL.createObjectURL(capturedBlob);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [capturedBlob]);

  const handleCapture = async () => {
    // IP Camera capture - fetch from backend
    if (isIPCamera && selectedDevice?.backendId) {
      try {
        const response = await fetch(
          `/api/v1/cameras/${selectedDevice.backendId}/capture`,
        );

        if (!response.ok) {
          throw new Error(`Capture failed: ${response.statusText}`);
        }

        const blob = await response.blob();
        setCapturedBlob(blob);
        setOriginalCapturedBlob(blob);
        setRotation(0);
        return;
      } catch (error) {
        console.error("IP camera capture failed:", error);
        setUploadError("Failed to capture from IP camera");
        return;
      }
    }

    // Browser camera capture - use canvas
    const blob = await captureFrame({
      zoom,
      quality: CAPTURE_CONFIG.DEFAULT_QUALITY,
    });
    if (blob) {
      setCapturedBlob(blob);
      setOriginalCapturedBlob(blob); // Keep original for rotation
      setRotation(0); // Reset rotation on new capture
    }
  };

  const handleRotate = async () => {
    if (!originalCapturedBlob) return;

    const newRotation = (rotation + 90) % 360;
    setRotation(newRotation);

    try {
      const file = new File([originalCapturedBlob], `camera-capture.jpg`, {
        type: "image/jpeg",
      });
      const rotatedFile = await rotateImageFile(file, newRotation);
      const rotatedBlob = await rotatedFile
        .arrayBuffer()
        .then((buffer) => new Blob([buffer], { type: "image/jpeg" }));
      setCapturedBlob(rotatedBlob);
    } catch (error) {
      console.error("Failed to rotate image:", error);
    }
  };

  const handleOpenCrop = () => {
    if (previewUrl) {
      openCropModal(previewUrl, 0);
    }
  };

  const handleApplyCrop = async (cropArea: CropArea) => {
    if (!capturedBlob) return;

    try {
      const file = new File([capturedBlob], `camera-capture.jpg`, {
        type: "image/jpeg",
      });
      const croppedFile = await cropImageFile(file, cropArea);
      const croppedBlob = await croppedFile
        .arrayBuffer()
        .then((buffer) => new Blob([buffer], { type: "image/jpeg" }));
      setCapturedBlob(croppedBlob);
      setOriginalCapturedBlob(croppedBlob); // Update original so rotations work on cropped image
      closeCropModal();
      setRotation(0); // Reset rotation after crop
    } catch (error) {
      console.error("Failed to crop image:", error);
      alert("Failed to crop image. Please try again.");
    }
  };

  const handleConfirmUpload = async () => {
    if (!capturedBlob || !testId) return;

    setIsUploading(true);
    setUploadError(null);

    const file = new File([capturedBlob], `camera-capture-${Date.now()}.jpg`, {
      type: "image/jpeg",
    });

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`/api/v1/photos/upload?test_id=${testId}`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      // Success - navigate back to test detail
      navigate(`/tests/${testId}`);
    } catch (err) {
      console.error("Upload failed:", err);
      setUploadError(
        err instanceof Error ? err.message : "Failed to upload photo",
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleRetake = () => {
    setCapturedBlob(null);
    setRotation(0);
    clearLastImage();
  };

  const handleBack = () => {
    navigate(-1);
  };

  if (!testId) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 border border-red-300 rounded-lg p-4">
          <p className="text-red-800">Error: No test ID provided</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-2xl font-bold">Camera Capture</h1>
            </div>
            <div className="text-sm text-gray-600">Test ID: {testId}</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Camera Preview - Large Area */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-4">
              {!capturedBlob ? (
                <>
                  <CameraSelector
                    devices={devices}
                    selectedDeviceId={selectedDeviceId}
                    onDeviceChange={handleCameraChange}
                    isStreamActive={isStreamActive}
                    className="mb-4"
                  />
                  {isIPCamera && selectedDevice?.backendId ? (
                    // IP Camera Preview - Show MJPEG stream
                    selectedDevice.connectionInfo ? (
                      (() => {
                        try {
                          const connectionData = JSON.parse(
                            selectedDevice.connectionInfo,
                          );
                          // Use stream_url for live preview, fallback to url for backward compatibility
                          const streamUrl =
                            connectionData.stream_url ||
                            connectionData.url ||
                            "";

                          return (
                            <IPCameraPreview
                              key={`ip-camera-${selectedDevice.backendId}`}
                              streamUrl={streamUrl}
                              showGrid={showGrid}
                              zoom={zoom}
                              onStreamReady={() => setIsStreamActive(true)}
                              onStreamError={() => setIsStreamActive(false)}
                              className="aspect-video"
                            />
                          );
                        } catch (error) {
                          return (
                            <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video flex items-center justify-center">
                              <div className="text-white text-center p-4">
                                <p>Error parsing camera connection info</p>
                                <p className="text-sm mt-2">{String(error)}</p>
                              </div>
                            </div>
                          );
                        }
                      })()
                    ) : (
                      <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video flex items-center justify-center">
                        <div className="text-white">
                          No connection info for IP camera
                        </div>
                      </div>
                    )
                  ) : (
                    // Browser Camera Preview
                    <CameraPreview
                      key={`browser-camera-${selectedDeviceId}`}
                      deviceId={selectedDeviceId}
                      showGrid={showGrid}
                      zoom={zoom}
                      onStreamReady={handleStreamReady}
                      videoRef={videoRef}
                      className="aspect-video"
                    />
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold">Preview</h2>
                  <div className="relative bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center w-full h-[500px] md:h-[600px] lg:h-[70vh]">
                    <img
                      src={previewUrl || ""}
                      alt="Captured"
                      className="object-contain transition-all duration-300"
                      style={{
                        maxWidth: "100%",
                        maxHeight: "100%",
                      }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleRotate}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition"
                      title="Rotate 90° clockwise"
                    >
                      <RotateCw className="w-4 h-4" />
                      Rotate
                    </button>
                    <button
                      onClick={handleOpenCrop}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border-2 border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition"
                      title="Crop image"
                    >
                      <Crop className="w-4 h-4" />
                      Crop
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Controls Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-4 sticky top-6">
              {!capturedBlob ? (
                <>
                  <h2 className="text-lg font-semibold mb-4">Controls</h2>
                  <CameraControls
                    onCapture={handleCapture}
                    onZoomChange={setZoom}
                    onGridToggle={setShowGrid}
                    isCapturing={isCapturing}
                    disabled={!isStreamActive && !isIPCamera}
                  />
                </>
              ) : (
                <>
                  <h2 className="text-lg font-semibold mb-4">Confirm Upload</h2>
                  <div className="space-y-3">
                    <button
                      onClick={handleConfirmUpload}
                      disabled={isUploading}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition"
                    >
                      <Check className="w-5 h-5" />
                      {isUploading ? "Uploading..." : "Confirm & Upload"}
                    </button>
                    <button
                      onClick={handleRetake}
                      disabled={isUploading}
                      className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition"
                    >
                      Retake Photo
                    </button>
                  </div>
                  {uploadError && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-300 rounded-lg">
                      <p className="text-red-800 text-sm">{uploadError}</p>
                    </div>
                  )}
                </>
              )}

              {/* Instructions */}
              <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-900 text-sm mb-2">
                  Instructions
                </h3>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>1. Select your camera from dropdown</li>
                  <li>2. Adjust zoom and grid as needed</li>
                  <li>3. Click "Capture Photo"</li>
                  <li>4. Review and confirm upload</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Crop Modal */}
      {cropImageUrl && (
        <CropModal
          show={showCropModal}
          imageUrl={cropImageUrl}
          onClose={closeCropModal}
          onApply={handleApplyCrop}
        />
      )}
    </div>
  );
}

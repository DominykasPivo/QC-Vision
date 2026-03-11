/**
 * CameraControls - Component for camera capture controls
 *
 * Provides capture button, zoom slider, grid toggle, and settings.
 * Follows Service Layer pattern by delegating logic to hooks.
 */

import { useState } from "react";
import { Camera, Grid3x3, ZoomIn, ZoomOut } from "lucide-react";
import { ZOOM_CONFIG } from "./constants";

interface CameraControlsProps {
  onCapture: () => void;
  onZoomChange?: (zoom: number) => void;
  onGridToggle?: (enabled: boolean) => void;
  isCapturing?: boolean;
  disabled?: boolean;
  hideZoom?: boolean;
  className?: string;
}

export function CameraControls({
  onCapture,
  onZoomChange,
  onGridToggle,
  isCapturing = false,
  disabled = false,
  hideZoom = false,
  className = "",
}: CameraControlsProps) {
  const [zoom, setZoom] = useState<number>(ZOOM_CONFIG.DEFAULT);
  const [showGrid, setShowGrid] = useState(false);

  const handleZoomChange = (newZoom: number) => {
    const clampedZoom = Math.max(
      ZOOM_CONFIG.MIN,
      Math.min(ZOOM_CONFIG.MAX, newZoom),
    );
    setZoom(clampedZoom);
    onZoomChange?.(clampedZoom);
  };

  const handleGridToggle = () => {
    const newState = !showGrid;
    setShowGrid(newState);
    onGridToggle?.(newState);
  };

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Capture Button */}
      <button
        onClick={onCapture}
        disabled={disabled || isCapturing}
        className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
      >
        <Camera className="w-5 h-5" />
        {isCapturing ? "Capturing..." : "Capture Photo"}
      </button>

      {/* Zoom Controls - Only for browser cameras */}
      {!hideZoom && (
        <div className="space-y-2">
          <label className="block text-sm font-medium">
            Zoom: {zoom.toFixed(1)}x
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleZoomChange(zoom - ZOOM_CONFIG.STEP)}
              disabled={zoom <= ZOOM_CONFIG.MIN}
              className="p-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
              aria-label="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <input
              type="range"
              min={ZOOM_CONFIG.MIN}
              max={ZOOM_CONFIG.MAX}
              step={ZOOM_CONFIG.STEP}
              value={zoom}
              onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
              className="flex-1"
            />
            <button
              onClick={() => handleZoomChange(zoom + ZOOM_CONFIG.STEP)}
              disabled={zoom >= ZOOM_CONFIG.MAX}
              className="p-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
              aria-label="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Grid Toggle */}
      <button
        onClick={handleGridToggle}
        className={`flex items-center justify-center gap-2 px-4 py-2 border rounded-lg transition ${
          showGrid
            ? "bg-blue-50 border-blue-600 text-blue-700"
            : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
        }`}
      >
        <Grid3x3 className="w-4 h-4" />
        {showGrid ? "Hide Grid" : "Show Grid"}
      </button>
    </div>
  );
}

/**
 * CameraSelector - Component for selecting camera device
 *
 * Displays dropdown of available cameras (webcams, DroidCam, etc.)
 * Follows Composite pattern for component composition.
 */

import { useCameraDevices } from "@/hooks";

interface CameraSelectorProps {
  onDeviceChange?: (deviceId: string) => void;
  isStreamActive?: boolean;
  className?: string;
}

export function CameraSelector({
  onDeviceChange,
  isStreamActive = false,
  className = "",
}: CameraSelectorProps) {
  const {
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
    isLoading,
    error,
    reload,
  } = useCameraDevices();

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const deviceId = event.target.value;
    setSelectedDeviceId(deviceId);
    onDeviceChange?.(deviceId);
  };

  if (error) {
    return (
      <div className={`text-red-600 ${className}`}>
        <p>Camera Error: {error}</p>
        <button
          onClick={reload}
          className="mt-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (isLoading) {
    return <div className={className}>Loading cameras...</div>;
  }

  if (devices.length === 0) {
    return (
      <div className={`text-amber-600 ${className}`}>
        <p>No cameras detected. Please connect a camera or install DroidCam.</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <label htmlFor="camera-select" className="text-sm font-medium">
          Select Camera Device
        </label>
        <button
          onClick={reload}
          className="text-xs px-2 py-1 text-blue-600 hover:text-blue-700 hover:underline"
          title="Refresh camera list"
        >
          ↻ Refresh
        </button>
      </div>
      <select
        id="camera-select"
        value={selectedDeviceId}
        onChange={handleChange}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {devices.map((device) => (
          <option key={device.deviceId} value={device.deviceId}>
            {device.label}
          </option>
        ))}
      </select>
      <div className="mt-2 text-xs space-y-1">
        <p className="text-gray-500">{devices.length} device(s) found</p>
        {devices.some((d) => d.label.toLowerCase().includes("droidcam")) && (
          <div
            className={`flex items-center gap-1 ${isStreamActive ? "text-green-600" : "text-amber-600"}`}
          >
            {isStreamActive ? (
              <>
                <span>✓</span>
                <span>DroidCam connected and streaming</span>
              </>
            ) : (
              <>
                <span>⚠️</span>
                <span>
                  DroidCam detected - Ensure DroidCam app is running and
                  connected
                </span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * CameraSelector - Component for selecting camera device
 *
 * Displays dropdown of available cameras (webcams, DroidCam, etc.)
 * Follows Composite pattern for component composition.
 */

import { useCameraDevices, type CameraDeviceInfo } from "@/hooks";

interface CameraSelectorProps {
  // Optional: pass hook data from parent to share state
  devices?: CameraDeviceInfo[];
  selectedDeviceId?: string;
  onDeviceChange?: (deviceId: string) => void;
  isStreamActive?: boolean;
  className?: string;
}

export function CameraSelector({
  devices: externalDevices,
  selectedDeviceId: externalSelectedDeviceId,
  onDeviceChange,
  isStreamActive = false,
  className = "",
}: CameraSelectorProps) {
  // Use internal hook only if external props not provided
  const internalHook = useCameraDevices();

  const devices = externalDevices ?? internalHook.devices;
  const selectedDeviceId =
    externalSelectedDeviceId ?? internalHook.selectedDeviceId;
  const setSelectedDeviceId = internalHook.setSelectedDeviceId;
  // Only show loading when using internal hook (not external props)
  const isLoading = externalDevices ? false : internalHook.isLoading;
  const error = externalDevices ? null : internalHook.error;
  const reload = internalHook.reload;

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const deviceId = event.target.value;
    // If using external props, only call the callback
    // Otherwise, update internal state
    if (!externalDevices && !externalSelectedDeviceId) {
      setSelectedDeviceId(deviceId);
    }
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
        {(() => {
          const currentDevice = devices.find(
            (d) => d.deviceId === selectedDeviceId,
          );
          if (!currentDevice) return null;

          const isDroidCam = currentDevice.label
            .toLowerCase()
            .includes("droidcam");
          const isIPCamera = currentDevice.kind === "ip_camera";

          if (isDroidCam) {
            return (
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
            );
          }

          if (isIPCamera) {
            return (
              <div
                className={`flex items-center gap-1 ${isStreamActive ? "text-green-600" : "text-amber-600"}`}
              >
                {isStreamActive ? (
                  <>
                    <span>✓</span>
                    <span>IP Camera connected and streaming</span>
                  </>
                ) : (
                  <>
                    <span>⚠️</span>
                    <span>Connecting to IP Camera...</span>
                  </>
                )}
              </div>
            );
          }

          return null;
        })()}
      </div>
    </div>
  );
}

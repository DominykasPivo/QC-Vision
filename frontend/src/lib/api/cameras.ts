/**
 * Camera API client - Fetch registered cameras from backend
 */

export interface BackendCamera {
  id: number;
  name: string;
  type: string;
  status: string;
  capabilities?: string | null;
  connection_info?: string | null;
  created_at: string;
  updated_at?: string | null;
  last_seen?: string | null;
}

export interface CameraListResponse {
  cameras: BackendCamera[];
  total: number;
}

/**
 * Fetch all registered cameras from the backend
 */
export async function fetchCameras(
  cameraType?: string,
): Promise<BackendCamera[]> {
  const url = cameraType
    ? `/api/v1/cameras/?camera_type=${cameraType}`
    : "/api/v1/cameras/";

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch cameras: ${response.status}`);
  }

  const data: CameraListResponse = await response.json();
  return data.cameras;
}

/**
 * Fetch a specific camera by ID
 */
export async function fetchCameraById(
  cameraId: number,
): Promise<BackendCamera> {
  const response = await fetch(`/api/v1/cameras/${cameraId}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch camera ${cameraId}: ${response.status}`);
  }

  return response.json();
}

/**
 * Capture photo from a camera
 */
export async function captureFromCamera(cameraId: number): Promise<Blob> {
  const response = await fetch(`/api/v1/cameras/${cameraId}/capture`);

  if (!response.ok) {
    throw new Error(
      `Failed to capture from camera ${cameraId}: ${response.status}`,
    );
  }

  return response.blob();
}

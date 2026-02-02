import type { DefectCategory, DefectSeverity } from '@/lib/db-constants';
import { request } from './http';

const API_BASE = '/api/v1';

export const DEFECT_ENDPOINTS = {
  photo: (photoId: string | number) => `${API_BASE}/photos/${photoId}`,
  photoDefects: (photoId: string | number) => `${API_BASE}/photos/${photoId}/defects`,
  defect: (defectId: string | number) => `${API_BASE}/defects/${defectId}`,
};

export type DefectPayload = {
  category: DefectCategory;
  severity: DefectSeverity;
  description?: string | null;
};

export type DefectRecord = {
  id: number | string;
  photo_id?: number | string;
  category: string;
  severity: string;
  description?: string | null;
  created_at?: string | null;
  createdAt?: string | null;
};

export type PhotoRecord = {
  id: number | string;
  test_id?: number | string;
  file_path?: string;
  url?: string;
};

export async function getPhoto(photoId: string | number) {
  return request<PhotoRecord>(DEFECT_ENDPOINTS.photo(photoId));
}

export async function getDefectsByPhoto(photoId: string | number) {
  return request<DefectRecord[]>(DEFECT_ENDPOINTS.photoDefects(photoId));
}

export async function createDefect(photoId: string | number, payload: DefectPayload) {
  return request<DefectRecord>(DEFECT_ENDPOINTS.photoDefects(photoId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function updateDefect(defectId: string | number, payload: DefectPayload) {
  return request<DefectRecord>(DEFECT_ENDPOINTS.defect(defectId), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function deleteDefect(defectId: string | number) {
  return request<unknown>(DEFECT_ENDPOINTS.defect(defectId), { method: 'DELETE' });
}

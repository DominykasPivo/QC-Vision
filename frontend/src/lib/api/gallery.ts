import { request } from './http';

export type GalleryPhoto = {
  id: number;
  test_id: number;
  file_path: string;
  time_stamp: string;
  test_type: string;
  test_status: string;
  defect_count: number;
  highest_severity: string | null;
  category_ids: number[];
};

export type GalleryResponse = {
  items: GalleryPhoto[];
  total: number;
  page: number;
  page_size: number;
};

export type GalleryFilters = {
  page?: number;
  page_size?: number;
  severity?: string;
  category_id?: number;
  test_type?: string;
  test_status?: string;
  has_defects?: boolean;
};

export async function fetchGallery(
  filters: GalleryFilters = {},
): Promise<GalleryResponse> {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.page_size) params.set('page_size', String(filters.page_size));
  if (filters.severity) params.set('severity', filters.severity);
  if (filters.category_id) params.set('category_id', String(filters.category_id));
  if (filters.test_type) params.set('test_type', filters.test_type);
  if (filters.test_status) params.set('test_status', filters.test_status);
  if (filters.has_defects !== undefined)
    params.set('has_defects', String(filters.has_defects));

  const qs = params.toString();
  return request<GalleryResponse>(`/api/v1/photos/gallery${qs ? `?${qs}` : ''}`);
}

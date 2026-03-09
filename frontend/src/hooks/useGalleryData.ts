import { useState, useCallback, useEffect } from "react";
import {
  fetchGallery,
  type GalleryResponse,
  type GalleryFilters as APIFilters,
} from "@/lib/api/gallery";
import { isLoggedIn } from "@/lib/auth";

/**
 * Custom hook for managing gallery data fetching and polling
 */
export function useGalleryData(
  filters: APIFilters,
  page: number,
  pageSize: number,
) {
  const [galleryData, setGalleryData] = useState<GalleryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const loadGallery = useCallback(async () => {
    if (!isLoggedIn()) return;

    setLoading(true);
    try {
      const data = await fetchGallery({
        page,
        page_size: pageSize,
        ...filters,
      });
      setGalleryData(data);
    } catch (err) {
      console.error("Failed to fetch gallery:", err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters]);

  useEffect(() => {
    loadGallery();
  }, [loadGallery]);

  // Poll for gallery updates every 30 seconds when tab is visible
  useEffect(() => {
    const POLL_MS = 30_000; // 30 seconds
    const id = setInterval(() => {
      if (!document.hidden) {
        loadGallery();
      }
    }, POLL_MS);

    return () => clearInterval(id);
  }, [loadGallery]);

  const totalPages = galleryData
    ? Math.max(1, Math.ceil(galleryData.total / pageSize))
    : 1;

  const photos = galleryData?.items ?? [];

  return {
    photos,
    loading,
    totalPages,
    totalCount: galleryData?.total ?? 0,
    loadGallery,
  };
}

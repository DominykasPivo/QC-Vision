import { useEffect, useState, useCallback } from "react";

export type ApiPhoto = {
  id: number;
  test_id: number;
  file_path: string;
  url?: string;
  verification_status?: "pending" | "approved" | "rejected";
  color_id?: number | null;
  method?: string | null;
};

type PhotoWithDefects = ApiPhoto & { defectCount: number };

/**
 * Hook to fetch and manage test photos with defect counts
 */
export function useTestDetailPhotos(testId?: string) {
  const [apiPhotos, setApiPhotos] = useState<ApiPhoto[]>([]);
  const [photosWithDefects, setPhotosWithDefects] = useState<
    PhotoWithDefects[]
  >([]);

  const fetchDefectCounts = async (
    photos: ApiPhoto[],
  ): Promise<PhotoWithDefects[]> => {
    const photosWithDefectData = await Promise.all(
      photos.map(async (photo: ApiPhoto) => {
        try {
          const defectsRes = await fetch(`/api/v1/defects/photo/${photo.id}`);
          const defects = await defectsRes.json();
          return {
            ...photo,
            defectCount: Array.isArray(defects) ? defects.length : 0,
          };
        } catch {
          return { ...photo, defectCount: 0 };
        }
      }),
    );
    return photosWithDefectData.filter((p) => p.defectCount > 0);
  };

  const loadPhotos = useCallback(async () => {
    if (!testId) return;

    try {
      const res = await fetch(`/api/v1/photos/test/${testId}`);
      const data: ApiPhoto[] = await res.json();

      const photosWithUrls = await Promise.all(
        data.map(async (photo: ApiPhoto) => {
          return {
            ...photo,
            url: `/api/v1/photos/${photo.id}/image?t=${Date.now()}`,
          };
        }),
      );
      setApiPhotos(photosWithUrls);

      const withDefects = await fetchDefectCounts(photosWithUrls);
      setPhotosWithDefects(withDefects);
    } catch (err) {
      console.error("Failed to fetch photos:", err);
    }
  }, [testId]);

  // Initial photo fetch
  useEffect(() => {
    if (!testId) return;

    // Fetch photos immediately on mount or when testId changes
    const fetchInitial = async () => {
      try {
        const res = await fetch(`/api/v1/photos/test/${testId}`);
        const data: ApiPhoto[] = await res.json();

        const photosWithUrls = await Promise.all(
          data.map(async (photo: ApiPhoto) => {
            return {
              ...photo,
              url: `/api/v1/photos/${photo.id}/image?t=${Date.now()}`,
            };
          }),
        );
        setApiPhotos(photosWithUrls);

        const withDefects = await fetchDefectCounts(photosWithUrls);
        setPhotosWithDefects(withDefects);
      } catch (err) {
        console.error("Failed to fetch photos:", err);
      }
    };

    fetchInitial();
  }, [testId]);

  // Poll for photo updates every 15 seconds when tab is visible
  // This keeps the QC Matrix in sync when new photos are added/updated
  useEffect(() => {
    if (!testId) return;

    const POLL_MS = 15_000; // 15 seconds - matches usePhotoDefects polling rate
    const id = setInterval(() => {
      if (!document.hidden) {
        loadPhotos();
      }
    }, POLL_MS);

    return () => clearInterval(id);
  }, [testId, loadPhotos]);

  // Refetch on window focus for immediate updates when user returns
  useEffect(() => {
    const handleFocus = () => {
      if (testId) {
        loadPhotos();
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [testId, loadPhotos]);

  return {
    apiPhotos,
    setApiPhotos,
    photosWithDefects,
  };
}

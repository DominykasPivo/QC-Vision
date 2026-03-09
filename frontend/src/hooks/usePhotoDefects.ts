import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getDefectsByPhoto,
  getPhoto,
  type DefectRecord,
  type PhotoRecord,
} from "@/lib/api/defects";
import { POLL_INTERVAL_MS } from "@/lib/constants/photoDefectsConstants";
import { isLoggedIn } from "@/lib/auth";

/**
 * Hook to load and manage photo data with defects
 */
export function usePhotoDefects(photoId?: string) {
  const [photo, setPhoto] = useState<PhotoRecord | null>(null);
  const [defects, setDefects] = useState<DefectRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const photoPreviewUrl = useMemo(() => {
    if (!photoId) {
      return "";
    }
    return `/api/v1/photos/${photoId}/image?t=${Date.now()}`;
  }, [photoId]);

  const loadDefects = useCallback(async () => {
    if (!photoId || !isLoggedIn()) {
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await getDefectsByPhoto(photoId);
      setDefects(Array.isArray(data) ? data : []);
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Failed to load defects.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [photoId]);

  const loadPhoto = useCallback(async () => {
    if (!photoId || !isLoggedIn()) return;
    try {
      const data = await getPhoto(photoId);
      setPhoto(data);
    } catch (error) {
      console.error("Failed to load photo:", error);
    }
  }, [photoId]);

  useEffect(() => {
    loadDefects();
    loadPhoto();
  }, [loadDefects, loadPhoto]);

  // Poll for defect updates when tab is visible
  useEffect(() => {
    if (!photoId) return;

    const id = setInterval(() => {
      if (!document.hidden) {
        loadDefects();
        loadPhoto();
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(id);
  }, [photoId, loadDefects, loadPhoto]);

  return {
    photo,
    setPhoto,
    defects,
    setDefects,
    isLoading,
    loadError,
    photoPreviewUrl,
    loadDefects,
  };
}

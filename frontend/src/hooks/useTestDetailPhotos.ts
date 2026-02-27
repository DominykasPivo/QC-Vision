import { useEffect, useState } from "react";

export type ApiPhoto = {
  id: number;
  test_id: number;
  file_path: string;
  url?: string;
  verification_status?: "pending" | "approved" | "rejected";
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

  // Initial photo fetch
  useEffect(() => {
    if (testId) {
      fetch(`/api/v1/photos/test/${testId}`)
        .then((res) => res.json())
        .then(async (data: ApiPhoto[]) => {
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
        })
        .catch((err) => console.error("Failed to fetch photos:", err));
    }
  }, [testId]);

  // Refetch defects on window focus
  useEffect(() => {
    const refetchDefects = async () => {
      if (testId && apiPhotos.length > 0) {
        try {
          const withDefects = await fetchDefectCounts(apiPhotos);
          setPhotosWithDefects(withDefects);
        } catch (err) {
          console.error("Failed to refetch defects:", err);
        }
      }
    };

    window.addEventListener("focus", refetchDefects);
    return () => window.removeEventListener("focus", refetchDefects);
  }, [testId, apiPhotos]);

  return {
    apiPhotos,
    setApiPhotos,
    photosWithDefects,
  };
}

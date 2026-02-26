import { useEffect, useMemo } from "react";

/**
 * Hook to manage photo preview URLs with automatic cleanup
 */
export function usePhotoPreview(selectedPhotos: File[]) {
  const photoPreviews = useMemo(
    () =>
      selectedPhotos.map((file) => ({
        file,
        url: URL.createObjectURL(file),
      })),
    [selectedPhotos],
  );

  useEffect(() => {
    return () => {
      photoPreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [photoPreviews]);

  return photoPreviews;
}

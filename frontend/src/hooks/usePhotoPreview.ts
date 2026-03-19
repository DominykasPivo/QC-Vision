import { useEffect, useMemo, useState } from "react";

export interface PhotoPreview {
  file: File;
  url: string;
  rotation: number;
}

/**
 * Hook to manage photo preview URLs with automatic cleanup and rotation support
 */
export function usePhotoPreview(selectedPhotos: File[]) {
  const [rotations, setRotations] = useState<Map<string, number>>(new Map());

  const photoPreviews = useMemo(() => {
    return selectedPhotos.map((file) => {
      const key = `${file.name}-${file.lastModified}`;
      return {
        file,
        url: URL.createObjectURL(file),
        rotation: rotations.get(key) ?? 0,
      };
    });
  }, [selectedPhotos, rotations]);

  useEffect(() => {
    return () => {
      photoPreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [photoPreviews]);

  const rotatePhoto = (index: number) => {
    const photo = selectedPhotos[index];
    if (!photo) return;

    const key = `${photo.name}-${photo.lastModified}`;
    setRotations((prev) => {
      const newRotations = new Map(prev);
      const currentRotation = newRotations.get(key) ?? 0;
      const newRotation = (currentRotation + 90) % 360;
      newRotations.set(key, newRotation);
      return newRotations;
    });
  };

  const getRotation = (file: File): number => {
    const key = `${file.name}-${file.lastModified}`;
    return rotations.get(key) ?? 0;
  };

  const clearRotations = () => {
    setRotations(new Map());
  };

  return {
    photoPreviews,
    rotatePhoto,
    getRotation,
    clearRotations,
  };
}

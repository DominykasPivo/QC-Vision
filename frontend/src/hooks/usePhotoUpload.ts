import { useRef, useState } from "react";
import {
  validatePhotoFiles,
  mergePhotoFiles,
} from "@/lib/validation/photo-validation";
import { MAX_PHOTOS_PER_UPLOAD } from "@/lib/constants/createTestConstants";

/**
 * Hook to manage photo upload functionality
 */
export function usePhotoUpload() {
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [photoNotice, setPhotoNotice] = useState<string | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const desktopInputRef = useRef<HTMLInputElement | null>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) {
      return;
    }

    // Validate files
    const validationError = validatePhotoFiles(files);
    if (validationError) {
      setPhotoNotice(validationError.message);
      e.target.value = "";
      return;
    }

    // Merge with existing photos
    const { photos: mergedPhotos, warning } = mergePhotoFiles(
      selectedPhotos,
      files,
      MAX_PHOTOS_PER_UPLOAD,
    );

    setSelectedPhotos(mergedPhotos);
    setPhotoNotice(warning);
    e.target.value = "";
    setShowPhotoModal(false);
  };

  const handlePhotoButtonClick = (isMobile: boolean) => {
    if (isMobile) {
      setShowPhotoModal(true);
    } else {
      desktopInputRef.current?.click();
    }
  };

  const handleRemovePhoto = (index: number) => {
    setSelectedPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const clearPhotos = () => {
    setSelectedPhotos([]);
    setPhotoNotice(null);
  };

  const replacePhoto = (index: number, newFile: File) => {
    setSelectedPhotos((prev) => {
      const updated = [...prev];
      updated[index] = newFile;
      return updated;
    });
  };

  return {
    selectedPhotos,
    photoNotice,
    showPhotoModal,
    cameraInputRef,
    galleryInputRef,
    desktopInputRef,
    handlePhotoSelect,
    handlePhotoButtonClick,
    handleRemovePhoto,
    setShowPhotoModal,
    clearPhotos,
    replacePhoto,
  };
}

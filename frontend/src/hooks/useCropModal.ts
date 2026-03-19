import { useState } from "react";

interface UseCropModalReturn {
  showCropModal: boolean;
  cropImageUrl: string | null;
  cropIndex: number | null;
  openCropModal: (imageUrl: string, index: number) => void;
  closeCropModal: () => void;
}

/**
 * Hook to manage crop modal state
 * Tracks which photo is being cropped and manages modal visibility
 */
export function useCropModal(): UseCropModalReturn {
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropImageUrl, setCropImageUrl] = useState<string | null>(null);
  const [cropIndex, setCropIndex] = useState<number | null>(null);

  const openCropModal = (imageUrl: string, index: number) => {
    setCropImageUrl(imageUrl);
    setCropIndex(index);
    setShowCropModal(true);
  };

  const closeCropModal = () => {
    setShowCropModal(false);
    // Delay clearing to allow modal animation
    setTimeout(() => {
      setCropImageUrl(null);
      setCropIndex(null);
    }, 200);
  };

  return {
    showCropModal,
    cropImageUrl,
    cropIndex,
    openCropModal,
    closeCropModal,
  };
}

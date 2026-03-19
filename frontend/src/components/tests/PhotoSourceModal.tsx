import {
  BasePhotoSourceModal,
  SHARED_PHOTO_SOURCE_MODAL_PROPS,
} from "./BasePhotoSourceModal";

interface PhotoSourceModalProps {
  show: boolean;
  onClose: () => void;
  onCameraClick: () => void;
  onGalleryClick: () => void;
}

export function PhotoSourceModal({
  show,
  onClose,
  onCameraClick,
  onGalleryClick,
}: PhotoSourceModalProps) {
  return (
    <BasePhotoSourceModal
      {...SHARED_PHOTO_SOURCE_MODAL_PROPS}
      show={show}
      onClose={onClose}
      onCameraClick={onCameraClick}
      onGalleryClick={onGalleryClick}
      overlayClassName="fixed inset-0 z-[230] flex items-end justify-center bg-black/55 p-4 backdrop-blur-sm sm:items-center"
      headingTag="h4"
    />
  );
}

import {
  BasePhotoSourceModal,
  SHARED_PHOTO_SOURCE_MODAL_PROPS,
} from "./BasePhotoSourceModal";

interface PhotoUploadModalProps {
  show: boolean;
  onClose: () => void;
  onCameraClick: () => void;
  onGalleryClick: () => void;
}

export function PhotoUploadModal({
  show,
  onClose,
  onCameraClick,
  onGalleryClick,
}: PhotoUploadModalProps) {
  return (
    <BasePhotoSourceModal
      {...SHARED_PHOTO_SOURCE_MODAL_PROPS}
      show={show}
      onClose={onClose}
      onCameraClick={onCameraClick}
      onGalleryClick={onGalleryClick}
      overlayClassName="fixed inset-0 z-[220] flex items-end justify-center bg-black/55 p-4 backdrop-blur-sm sm:items-center"
      headingTag="h3"
    />
  );
}

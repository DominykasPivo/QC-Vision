import { BasePhotoSourceModal } from "./BasePhotoSourceModal";

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
      show={show}
      onClose={onClose}
      onCameraClick={onCameraClick}
      onGalleryClick={onGalleryClick}
      overlayClassName="fixed inset-0 z-[230] flex items-end justify-center bg-black/55 p-4 backdrop-blur-sm sm:items-center"
      panelClassName="w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.3)]"
      titleClassName="text-xl font-bold text-[#111827]"
      descriptionClassName="mt-1 text-sm text-gray-600"
      actionsClassName="mt-5 flex flex-col gap-2.5"
      primaryButtonClassName="h-11 rounded-xl bg-[#2563eb] font-semibold text-white hover:bg-[#1d4ed8]"
      secondaryButtonClassName="h-11 rounded-xl border-gray-300 font-semibold text-gray-700"
      cancelButtonClassName="h-11 rounded-xl border-gray-300 font-semibold text-gray-700"
      headingTag="h4"
      title="Add Photos"
      description="Choose how to add photos:"
      cameraLabel="Take Photo"
      galleryLabel="Choose from Gallery"
    />
  );
}

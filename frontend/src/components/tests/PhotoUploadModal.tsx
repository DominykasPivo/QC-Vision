import { BasePhotoSourceModal } from "./BasePhotoSourceModal";

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
      show={show}
      onClose={onClose}
      onCameraClick={onCameraClick}
      onGalleryClick={onGalleryClick}
      overlayClassName="fixed inset-0 z-[220] flex items-end justify-center bg-black/55 p-4 backdrop-blur-sm sm:items-center"
      panelClassName="w-full max-w-sm rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_24px_60px_rgba(15,23,42,0.3)]"
      titleClassName="text-xl font-bold text-slate-900"
      descriptionClassName="mt-1 text-sm text-slate-500"
      actionsClassName="mt-4 flex flex-col gap-2.5"
      primaryButtonClassName="h-11 rounded-xl bg-[#2563eb] font-semibold text-white hover:bg-[#1d4ed8]"
      secondaryButtonClassName="h-11 rounded-xl border-slate-300 font-semibold text-slate-700 hover:bg-slate-100"
      cancelButtonClassName="h-11 rounded-xl border-slate-300 font-semibold text-slate-600 hover:bg-slate-100"
      headingTag="h3"
      title="Add Photos"
      description="Choose how to add photos:"
      cameraLabel="📷 Take Photo"
      galleryLabel="🖼️ Choose from Gallery"
    />
  );
}

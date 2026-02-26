import { Button } from "@/components/ui/button";

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
  if (!show) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[220] flex items-end justify-center bg-black/55 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_24px_60px_rgba(15,23,42,0.3)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold text-slate-900">Add Photos</h3>
        <p className="mt-1 text-sm text-slate-500">Choose how to add photos:</p>
        <div className="mt-4 flex flex-col gap-2.5">
          <Button
            type="button"
            className="h-11 rounded-xl bg-[#2563eb] font-semibold text-white hover:bg-[#1d4ed8]"
            onClick={onCameraClick}
          >
            📷 Take Photo
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-xl border-slate-300 font-semibold text-slate-700 hover:bg-slate-100"
            onClick={onGalleryClick}
          >
            🖼️ Choose from Gallery
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-xl border-slate-300 font-semibold text-slate-600 hover:bg-slate-100"
            onClick={onClose}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

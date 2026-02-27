import { Button } from "@/components/ui/button";

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
  if (!show) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[230] flex items-end justify-center bg-black/55 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.3)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h4 className="text-xl font-bold text-[#111827]">Add Photos</h4>
        <p className="mt-1 text-sm text-gray-600">Choose how to add photos:</p>
        <div className="mt-5 flex flex-col gap-2.5">
          <Button
            type="button"
            className="h-11 rounded-xl bg-[#2563eb] font-semibold text-white hover:bg-[#1d4ed8]"
            onClick={onCameraClick}
          >
            Take Photo
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-xl border-gray-300 font-semibold text-gray-700"
            onClick={onGalleryClick}
          >
            Choose from Gallery
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-xl border-gray-300 font-semibold text-gray-700"
            onClick={onClose}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

import { Button } from "@/components/ui/button";

interface DeleteConfirmModalProps {
  show: boolean;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmModal({
  show,
  isDeleting,
  onClose,
  onConfirm,
}: DeleteConfirmModalProps) {
  if (!show) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[220] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.35)]"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="text-2xl font-bold text-[#111827]">Delete test?</h3>
        <p className="mt-2 text-sm text-gray-600">
          This will permanently delete the test and its photos.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-xl border-gray-300 px-5 font-semibold text-gray-700"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="h-11 rounded-xl bg-[#dc2626] px-5 font-semibold text-white hover:bg-[#b91c1c]"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </div>
    </div>
  );
}

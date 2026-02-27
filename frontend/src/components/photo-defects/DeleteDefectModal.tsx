import { Button } from "@/components/ui/button";
import { spacing } from "@/lib/ui/spacing";
import { cn } from "@/lib/utils";

interface DeleteDefectModalProps {
  isOpen: boolean;
  isSaving: boolean;
  actionError: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteDefectModal({
  isOpen,
  isSaving,
  actionError,
  onClose,
  onConfirm,
}: DeleteDefectModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[220] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={cn(spacing.modalPanel, "max-w-md")}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="text-xl font-semibold text-slate-900">
          Delete defect?
        </div>
        <div className="mt-1 text-sm text-slate-600">
          This action cannot be undone.
          {actionError && (
            <div className="mt-2 text-sm font-medium text-red-600">
              {actionError}
            </div>
          )}
        </div>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            density="compact"
            className="border-slate-300 text-slate-700"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            density="compact"
            className="bg-red-600 text-white hover:bg-red-700"
            onClick={onConfirm}
            disabled={isSaving}
          >
            {isSaving ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </div>
    </div>
  );
}

import { MaterialIcon } from "./MaterialIcon";

interface MobileActionButtonsProps {
  onUpdate: () => void;
  onDelete: () => void;
  onCamera?: () => void;
  isDeleting: boolean;
}

export function MobileActionButtons({
  onUpdate,
  onDelete,
  onCamera,
  isDeleting,
}: MobileActionButtonsProps) {
  return (
    <div className="mt-8 flex flex-col gap-4 lg:hidden">
      <button
        type="button"
        onClick={onUpdate}
        className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#2563eb] px-10 py-5 text-xl font-bold text-white shadow-lg shadow-blue-500/30 transition-all hover:bg-blue-700 active:scale-95"
      >
        <MaterialIcon name="edit" />
        UPDATE STATUS
      </button>
      {onCamera && (
        <button
          type="button"
          onClick={onCamera}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-green-600 px-6 py-4 text-lg font-bold text-green-600 transition-all hover:bg-green-50 active:scale-95"
        >
          <MaterialIcon name="photo_camera" className="text-2xl" />
          Capture with Camera
        </button>
      )}
      <button
        type="button"
        onClick={onDelete}
        disabled={isDeleting}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-red-600 px-6 py-4 text-lg font-bold text-red-600 transition-all hover:bg-red-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <MaterialIcon name="delete_forever" className="text-2xl" />
        Delete Test
      </button>
    </div>
  );
}

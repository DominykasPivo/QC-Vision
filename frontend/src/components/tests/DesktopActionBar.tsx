import { formatEnumLabel, type Test } from "@/lib/db-constants";
import { MaterialIcon } from "./MaterialIcon";

interface DesktopActionBarProps {
  test: Test;
  onUpdate: () => void;
  onDelete: () => void;
  onCamera?: () => void;
  isDeleting: boolean;
}

export function DesktopActionBar({
  test,
  onUpdate,
  onDelete,
  onCamera,
  isDeleting,
}: DesktopActionBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 hidden border-t border-slate-200 bg-white/90 p-6 shadow-2xl backdrop-blur-xl md:block md:left-[var(--sidebar-width)]">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="hidden items-center gap-4 lg:flex">
          <div className="flex flex-col">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Selected Test
            </span>
            <span className="text-lg font-bold">
              Test ID #{test.id} — {formatEnumLabel(test.status)}
            </span>
          </div>
        </div>
        <div className="flex w-full items-center gap-4 sm:w-auto">
          <button
            type="button"
            onClick={onUpdate}
            className="flex flex-1 items-center justify-center gap-3 rounded-xl bg-[#2563eb] px-10 py-5 text-xl font-bold text-white shadow-lg shadow-blue-500/30 transition-all hover:bg-blue-700 active:scale-95 sm:flex-none"
          >
            <MaterialIcon name="edit" />
            UPDATE STATUS
          </button>
          {onCamera && (
            <button
              type="button"
              onClick={onCamera}
              className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-green-600 text-xl font-bold text-green-600 transition-all hover:bg-green-600 hover:text-white active:scale-95 sm:h-auto sm:w-auto sm:px-8 sm:py-5"
            >
              <MaterialIcon name="photo_camera" className="sm:mr-2" />
              <span className="hidden uppercase sm:inline">Camera</span>
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            disabled={isDeleting}
            className="group flex h-16 w-16 items-center justify-center rounded-xl border-2 border-red-600 text-xl font-bold text-red-600 transition-all hover:bg-red-600 hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 sm:h-auto sm:w-auto sm:px-8 sm:py-5"
          >
            <MaterialIcon name="delete_forever" className="sm:mr-2" />
            <span className="hidden uppercase sm:inline">Delete Test</span>
          </button>
        </div>
      </div>
    </div>
  );
}

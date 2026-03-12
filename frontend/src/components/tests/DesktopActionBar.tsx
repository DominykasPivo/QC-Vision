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
    <div className="fixed bottom-0 left-0 right-0 z-20 hidden border-t border-slate-200 bg-white/90 p-4 shadow-2xl backdrop-blur-xl lg:block lg:left-[var(--sidebar-width)] xl:p-6">
      <div className="mx-auto flex max-w-7xl items-end justify-between gap-4">
        <div className="hidden items-center gap-4 xl:flex">
          <div className="flex flex-col">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Selected Test
            </span>
            <span className="text-lg font-bold">
              Test ID #{test.id} — {formatEnumLabel(test.status)}
            </span>
          </div>
        </div>
        <div className="grid w-full grid-cols-3 gap-3 xl:flex xl:w-auto xl:items-center xl:gap-4">
          <button
            type="button"
            onClick={onUpdate}
            className="flex min-w-0 items-center justify-center gap-2 rounded-2xl bg-[#2563eb] px-4 py-4 text-base font-semibold whitespace-nowrap text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-700 active:scale-[0.98] xl:px-10 xl:py-5 xl:text-xl xl:font-bold"
          >
            <MaterialIcon name="edit" className="text-[20px] xl:text-[24px]" />
            UPDATE STATUS
          </button>
          {onCamera && (
            <button
              type="button"
              onClick={onCamera}
              className="flex min-w-0 items-center justify-center gap-2 rounded-2xl border-2 border-green-600 px-4 py-4 text-base font-semibold whitespace-nowrap text-green-600 transition-all hover:bg-green-50 active:scale-[0.98] xl:px-8 xl:py-5 xl:text-xl xl:font-bold"
            >
              <MaterialIcon
                name="photo_camera"
                className="text-[20px] xl:text-[24px]"
              />
              <span className="uppercase">Camera</span>
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            disabled={isDeleting}
            className="group flex min-w-0 items-center justify-center gap-2 rounded-2xl border-2 border-red-600 px-4 py-4 text-base font-semibold whitespace-nowrap text-red-600 transition-all hover:bg-red-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 xl:px-8 xl:py-5 xl:text-xl xl:font-bold"
          >
            <MaterialIcon
              name="delete_forever"
              className="text-[20px] xl:text-[24px]"
            />
            <span className="uppercase">Delete Test</span>
          </button>
        </div>
      </div>
    </div>
  );
}

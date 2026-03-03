import { MAX_PHOTOS_PER_UPLOAD } from "@/lib/constants/createTestConstants";

interface PhotoUploadButtonProps {
  onClick: () => void;
  disabled: boolean;
  isMobile: boolean;
  selectedCount: number;
}

export function PhotoUploadButton({
  onClick,
  disabled,
  isMobile,
  selectedCount,
}: PhotoUploadButtonProps) {
  return (
    <button
      type="button"
      id="photo-upload-button"
      className="group flex w-full flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-300 bg-slate-100/80 px-4 py-8 text-center transition-colors hover:bg-slate-100 focus:outline-none focus-visible:border-[#2563eb] focus-visible:ring-4 focus-visible:ring-[#2563eb]/20 disabled:cursor-not-allowed disabled:opacity-60"
      onClick={onClick}
      disabled={disabled}
    >
      <svg
        className="mb-2 h-11 w-11 text-slate-400"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M4 7h3l2-2h6l2 2h3a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <circle
          cx="12"
          cy="13"
          r="3.5"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M12 3.5v4M10 5.5h4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
      <p className="text-base font-semibold leading-tight text-slate-600 md:text-lg">
        Upload photos for this test
      </p>
      <p className="mt-1 text-sm font-medium text-slate-500">
        PNG/JPG, up to {MAX_PHOTOS_PER_UPLOAD} files per upload
      </p>
      <p className="mt-2 inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
        {isMobile ? "📷 Add Photos" : "Choose images"}
      </p>
      <p className="mt-2 text-sm font-semibold text-slate-500">
        Selected {selectedCount} photo{selectedCount !== 1 ? "s" : ""}
      </p>
    </button>
  );
}

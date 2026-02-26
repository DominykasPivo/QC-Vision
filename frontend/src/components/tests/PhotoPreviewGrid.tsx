interface PhotoPreview {
  file: File;
  url: string;
}

interface PhotoPreviewGridProps {
  photoPreviews: PhotoPreview[];
  onRemove: (index: number) => void;
  disabled: boolean;
}

export function PhotoPreviewGrid({
  photoPreviews,
  onRemove,
  disabled,
}: PhotoPreviewGridProps) {
  if (photoPreviews.length === 0) {
    return null;
  }

  return (
    <div
      className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:grid-cols-3"
      aria-live="polite"
    >
      {photoPreviews.map((preview, index) => (
        <div
          key={`${preview.file.name}-${preview.file.lastModified}-${index}`}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
        >
          <div className="aspect-square bg-slate-100">
            <img
              src={preview.url}
              alt={preview.file.name}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="border-t border-slate-100 p-2">
            <button
              type="button"
              className="w-full rounded-xl border border-red-200 bg-red-50 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100 focus:outline-none focus-visible:border-red-500 focus-visible:ring-2 focus-visible:ring-red-200"
              onClick={() => onRemove(index)}
              aria-label={`Remove ${preview.file.name}`}
              disabled={disabled}
            >
              Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

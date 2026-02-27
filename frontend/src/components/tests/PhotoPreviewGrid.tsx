import { PhotoPreviewCard } from "./PhotoPreviewCard";

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
        <PhotoPreviewCard
          key={`${preview.file.name}-${preview.file.lastModified}-${index}`}
          imageUrl={preview.url}
          alt={preview.file.name}
          onRemove={() => onRemove(index)}
          removeAriaLabel={`Remove ${preview.file.name}`}
          removeDisabled={disabled}
          cardClassName="overflow-hidden rounded-2xl border border-slate-200 bg-white"
          imageWrapClassName="aspect-square bg-slate-100"
          footerClassName="border-t border-slate-100 p-2"
          removeButtonClassName="w-full rounded-xl border border-red-200 bg-red-50 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100 focus:outline-none focus-visible:border-red-500 focus-visible:ring-2 focus-visible:ring-red-200"
        />
      ))}
    </div>
  );
}

import { PhotoPreviewCard } from "../PhotoPreviewCard";

interface PhotoPreview {
  file: File;
  url: string;
  rotation?: number;
}

interface NewPhotosGridProps {
  newPhotoPreviews: PhotoPreview[];
  onRemoveNewPhoto: (index: number) => void;
  onRotateNewPhoto?: (index: number) => void;
}

export function NewPhotosGrid({
  newPhotoPreviews,
  onRemoveNewPhoto,
  onRotateNewPhoto,
}: NewPhotosGridProps) {
  if (newPhotoPreviews.length === 0) {
    return null;
  }

  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-gray-700">New photos</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {newPhotoPreviews.map((preview, index) => (
          <PhotoPreviewCard
            key={`${preview.file.name}-${preview.file.lastModified}-${index}`}
            imageUrl={preview.url}
            alt={preview.file.name}
            onRemove={() => onRemoveNewPhoto(index)}
            removeAriaLabel={`Remove ${preview.file.name}`}
            cardClassName="overflow-hidden rounded-xl border border-gray-200 bg-white"
            imageWrapClassName="aspect-square bg-gray-100"
            footerClassName="border-t border-gray-100 px-2.5 py-2"
            removeButtonClassName="w-full rounded-xl border border-red-200 bg-red-50 py-2 text-sm font-semibold text-red-600 hover:bg-red-100"
            rotation={preview.rotation}
            onRotate={
              onRotateNewPhoto ? () => onRotateNewPhoto(index) : undefined
            }
            showRotateButton={!!onRotateNewPhoto}
          />
        ))}
      </div>
    </div>
  );
}

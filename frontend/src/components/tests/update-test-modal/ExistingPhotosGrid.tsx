import type { ApiPhoto } from "@/hooks/useTestDetailPhotos";
import { PhotoPreviewCard } from "../PhotoPreviewCard";

interface ExistingPhotosGridProps {
  apiPhotos: ApiPhoto[];
  photosToDelete: string[];
  onRemoveExistingPhoto: (photoId: string) => void;
}

export function ExistingPhotosGrid({
  apiPhotos,
  photosToDelete,
  onRemoveExistingPhoto,
}: ExistingPhotosGridProps) {
  if (apiPhotos.length === 0) {
    return null;
  }

  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-gray-700">
        Existing photos
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {apiPhotos
          .filter((photo) => !photosToDelete.includes(photo.id.toString()))
          .map((photo) => (
            <PhotoPreviewCard
              key={photo.id}
              imageUrl={photo.url}
              alt="Photo"
              onRemove={() => onRemoveExistingPhoto(photo.id.toString())}
              removeAriaLabel={`Remove photo ${photo.id}`}
              cardClassName="overflow-hidden rounded-xl border border-gray-200 bg-white"
              imageWrapClassName="aspect-square bg-gray-100"
              footerClassName="border-t border-gray-100 px-2.5 py-2"
              removeButtonClassName="w-full rounded-xl border border-red-200 bg-red-50 py-2 text-sm font-semibold text-red-600 hover:bg-red-100"
            />
          ))}
      </div>
    </div>
  );
}

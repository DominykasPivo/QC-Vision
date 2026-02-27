import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MaterialIcon } from "./MaterialIcon";
import { VERIFICATION_DOT } from "@/lib/constants/galleryConstants";
import type { ApiPhoto } from "@/hooks/useTestDetailPhotos";

interface PhotoGalleryCardProps {
  photos: ApiPhoto[];
}

export function PhotoGalleryCard({ photos }: PhotoGalleryCardProps) {
  return (
    <Card className="overflow-hidden rounded-xl border-slate-200 bg-white shadow-sm">
      <CardHeader className="flex-row items-center justify-between border-b border-slate-100 px-8 py-6">
        <CardTitle className="flex items-center gap-2 text-2xl font-bold">
          <MaterialIcon name="photo_library" className="text-[#2563eb]" />
          Photos
        </CardTitle>
        <Badge
          variant="secondary"
          className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700"
        >
          {photos.length} Photo{photos.length !== 1 ? "s" : ""}
        </Badge>
      </CardHeader>
      <CardContent className="px-8 py-8">
        {photos.length === 0 ? (
          <div className="flex min-h-[200px] items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 text-center">
            <p className="text-xl font-semibold text-slate-400">
              No photos uploaded
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
            {photos.map((photo) => (
              <Link
                key={photo.id}
                to={`/photos/${photo.id}`}
                className="group relative aspect-square cursor-pointer overflow-hidden rounded-xl ring-1 ring-slate-200 transition-transform active:scale-95"
                aria-label={`Open photo ${photo.id}`}
              >
                {photo.url ? (
                  <>
                    <img
                      src={photo.url}
                      alt={`Photo ${photo.id}`}
                      className="h-full w-full object-cover"
                      onError={(e) =>
                        console.error(
                          `Image failed to load: Photo ${photo.id}`,
                          photo.url,
                          e,
                        )
                      }
                    />
                    {/* Verification status dot */}
                    {photo.verification_status &&
                      VERIFICATION_DOT[photo.verification_status] && (
                        <span
                          className={`absolute top-1.5 right-1.5 h-3.5 w-3.5 rounded-full border-2 border-white shadow-sm ${VERIFICATION_DOT[photo.verification_status].bg}`}
                          title={
                            VERIFICATION_DOT[photo.verification_status].title
                          }
                        />
                      )}
                  </>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs font-medium text-slate-500">
                    Loading...
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
                  <MaterialIcon
                    name="zoom_in"
                    className="text-3xl text-white"
                  />
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

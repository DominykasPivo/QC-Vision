import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import type { AppDataContext } from "../components/layout/AppShell";
import { Pagination } from "@/components/ui/pagination";
import { spacing } from "@/lib/ui/spacing";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;
type GalleryPhoto = {
  id: number;
  test_id: number;
  file_path: string;
  url?: string;
};

export function Gallery() {
  const { tests } = useOutletContext<AppDataContext>();
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchAllPhotos = async () => {
      try {
        setLoading(true);
        const allPhotos: GalleryPhoto[] = [];

        // Fetch photos for each test
        for (const test of tests) {
          const response = await fetch(`/api/v1/photos/test/${test.id}`);
          if (response.ok) {
            const testPhotos = (await response.json()) as GalleryPhoto[];

            // Fetch presigned URLs for each photo
            const photosWithUrls = testPhotos.map((photo) => ({
              ...photo,
              url: `/api/v1/photos/${photo.id}/image?t=${Date.now()}`,
            }));

            allPhotos.push(...photosWithUrls);
          }
        }

        setPhotos(allPhotos);
      } catch (error) {
        console.error("Failed to fetch photos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllPhotos();
  }, [tests]);

  const totalPages = Math.max(1, Math.ceil(photos.length / PAGE_SIZE));
  const paginatedPhotos = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return photos.slice(start, start + PAGE_SIZE);
  }, [photos, currentPage]);

  return (
    <div className={cn(spacing.pageContainer, spacing.pageStack)}>
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Gallery
        </h2>
        <p className="text-sm text-slate-600 md:text-base">
          Browse all test photos
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-slate-600 md:text-base">Loading photos...</p>
      ) : photos.length === 0 ? (
        <p className="text-sm text-slate-600 md:text-base">
          No photos yet. Upload photos when creating a test.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {paginatedPhotos.map((photo) => (
              <Link
                key={photo.id}
                className="relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-800 transition-transform active:scale-95"
                to={`/photos/${photo.id}`}
              >
                {photo.url ? (
                  <img
                    src={photo.url}
                    alt={`Photo ${photo.id}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-medium text-white drop-shadow-sm">
                    Loading...
                  </span>
                )}
              </Link>
            ))}
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </>
      )}
    </div>
  );
}

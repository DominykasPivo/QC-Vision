import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Filter } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pagination } from "@/components/ui/pagination";

import {
  DEFECT_SEVERITIES,
  formatEnumLabel,
} from "@/lib/db-constants";
import {
  fetchGallery,
  type GalleryPhoto,
  type GalleryResponse,
} from "@/lib/api/gallery";

const PAGE_SIZE = 20;

/* ---------- Extended type (safe typing) ---------- */
type GalleryPhotoExtended = GalleryPhoto & {
  highest_severity?: string;
  defect_count?: number;
};

type CategoryRecord = {
  id: number;
  name: string;
  is_active: boolean;
};

/* ---------- Severity UI styles ---------- */
const SEVERITY_STYLES: Record<
  string,
  { border: string; badge: string }
> = {
  critical: {
    border: "border-red-600 border-2",
    badge: "bg-red-200 text-red-900",
  },
  high: {
    border: "border-red-400 border-2",
    badge: "bg-red-100 text-red-800",
  },
  medium: {
    border: "border-orange-400 border-2",
    badge: "bg-orange-100 text-orange-800",
  },
  low: {
    border: "border-yellow-400 border-2",
    badge: "bg-yellow-100 text-yellow-800",
  },
};

const NO_DEFECT_BORDER = "border-emerald-400 border";

/* ---------- Card Component ---------- */
function GalleryCard({ photo }: { photo: GalleryPhotoExtended }) {
  const style = photo.highest_severity
    ? SEVERITY_STYLES[photo.highest_severity] ?? {
        border: NO_DEFECT_BORDER,
        badge: "",
      }
    : { border: NO_DEFECT_BORDER, badge: "" };

  return (
    <Link
      to={`/photos/${photo.id}`}
      className={`gallery-item relative overflow-hidden rounded-lg ${style.border}`}
      style={{ backgroundColor: "#1f2937" }}
    >
      <img
        src={`/api/v1/photos/${photo.id}/image`}
        alt={`Photo ${photo.id}`}
        className="h-full w-full object-cover"
        loading="lazy"
      />

      {photo.defect_count && photo.defect_count > 0 && (
        <span className="absolute bottom-1 left-1 rounded-full bg-black/70 px-1.5 py-0.5 text-xs font-semibold text-white">
          {photo.defect_count}
        </span>
      )}

      {photo.highest_severity && (
        <span
          className={`absolute bottom-1 right-1 rounded-full px-1.5 py-0.5 text-xs font-semibold ${style.badge}`}
        >
          {formatEnumLabel(photo.highest_severity)}
        </span>
      )}
    </Link>
  );
}

/* ---------- Main Component ---------- */
export function Gallery() {
  const [galleryData, setGalleryData] =
    useState<GalleryResponse | null>(null);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const [severityFilter, setSeverityFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  /* ---------- Load Categories ---------- */
  useEffect(() => {
    fetch("/api/v1/defects/categories")
      .then((res) => res.json())
      .then(setCategories)
      .catch(console.error);
  }, []);

  /* ---------- Load Gallery ---------- */
  const loadGallery = useCallback(async () => {
    setLoading(true);

    try {
      const data = await fetchGallery({
        page: currentPage,
        page_size: PAGE_SIZE,
        severity: severityFilter || undefined,
        category_id: categoryFilter
          ? Number(categoryFilter)
          : undefined,
      });

      setGalleryData(data);
    } catch (err) {
      console.error("Failed to fetch gallery:", err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, severityFilter, categoryFilter]);

  useEffect(() => {
    loadGallery();
  }, [loadGallery]);

  /* ---------- Derived values ---------- */
  const totalPages = galleryData
    ? Math.max(1, Math.ceil(galleryData.total / PAGE_SIZE))
    : 1;

  const photos =
    (galleryData?.items as GalleryPhotoExtended[]) ?? [];

  const hasActiveFilters = severityFilter || categoryFilter;

  /* ---------- Render ---------- */
  return (
    <div className="page-container">
      {/* Filters button (mobile placeholder) */}
      <div className="mt-4 flex items-center gap-3 md:hidden">
        <Button type="button" variant="outline">
          <Filter className="mr-1.5 h-4 w-4" />
          Filters
        </Button>
      </div>

      {/* Desktop Filters */}
      <div className="mt-4 hidden md:block">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
          {/* Severity */}
          <Select
            value={severityFilter || "all"}
            onValueChange={(v) => {
              setSeverityFilter(v === "all" ? "" : v);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="h-14 rounded-full border border-slate-200 bg-white !pl-6 !pr-5 text-base text-slate-900 shadow-sm">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              {DEFECT_SEVERITIES.map((s) => (
                <SelectItem key={s} value={s}>
                  {formatEnumLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Category */}
          <Select
            value={categoryFilter || "all"}
            onValueChange={(v) => {
              setCategoryFilter(v === "all" ? "" : v);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="h-14 rounded-full border border-slate-200 bg-white !pl-6 !pr-5 text-base text-slate-900 shadow-sm">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                All Categories
              </SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <p className="mt-6">Loading photos...</p>
      ) : photos.length === 0 ? (
        <p className="mt-6">
          {hasActiveFilters
            ? "No photos match the selected filters."
            : "No photos yet."}
        </p>
      ) : (
        <>
          <div className="gallery-grid mt-4">
            {photos.map((photo) => (
              <GalleryCard key={photo.id} photo={photo} />
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
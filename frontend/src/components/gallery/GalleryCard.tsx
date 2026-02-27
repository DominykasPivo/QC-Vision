import { Link } from "react-router-dom";
import { formatEnumLabel } from "@/lib/db-constants";
import {
  SEVERITY_STYLES,
  NO_DEFECT_BORDER,
  VERIFICATION_DOT,
} from "@/lib/constants";

export interface GalleryPhoto {
  id: number;
  highest_severity: string | null;
  verification_status: string | null;
  defect_count: number | null;
}

interface GalleryCardProps {
  photo: GalleryPhoto;
}

export function GalleryCard({ photo }: GalleryCardProps) {
  const style = photo.highest_severity
    ? (SEVERITY_STYLES[photo.highest_severity] ?? {
        border: NO_DEFECT_BORDER,
        badge: "",
      })
    : { border: NO_DEFECT_BORDER, badge: "" };

  return (
    <Link
      to={`/photos/${photo.id}`}
      className={`group relative block aspect-square overflow-hidden rounded-xl bg-slate-100 shadow-sm transition-transform active:scale-[0.98] ${style.border}`}
      aria-label={`Open photo ${photo.id}`}
    >
      <img
        src={`/api/v1/photos/${photo.id}/image`}
        alt={`Photo ${photo.id}`}
        className="h-full w-full object-cover"
        loading="lazy"
      />
      {/* Verification status dot */}
      {photo.verification_status &&
        VERIFICATION_DOT[photo.verification_status] && (
          <span
            className={`absolute top-1.5 right-1.5 h-3.5 w-3.5 rounded-full border-2 border-white shadow-sm ${VERIFICATION_DOT[photo.verification_status].bg}`}
            title={VERIFICATION_DOT[photo.verification_status].title}
          />
        )}
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
      <div className="absolute inset-0 bg-black/10 opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  );
}

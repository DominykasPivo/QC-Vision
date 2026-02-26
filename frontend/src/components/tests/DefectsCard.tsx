import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MaterialIcon } from "./MaterialIcon";
import { VERIFICATION_DOT } from "@/lib/constants/galleryConstants";
import type { ApiPhoto } from "@/hooks/useTestDetailPhotos";

type PhotoWithDefects = ApiPhoto & { defectCount: number };

interface DefectsCardProps {
  photosWithDefects: PhotoWithDefects[];
}

export function DefectsCard({ photosWithDefects }: DefectsCardProps) {
  return (
    <Card className="overflow-hidden rounded-xl border-slate-200 bg-white shadow-sm">
      <CardHeader className="border-b border-slate-100 px-8 py-6">
        <CardTitle className="flex items-center gap-2 text-2xl font-bold">
          <MaterialIcon
            name="report_problem"
            className="text-red-600"
          />
          Defects
        </CardTitle>
      </CardHeader>
      <CardContent className="px-8 py-8">
        {photosWithDefects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-50">
              <MaterialIcon
                name="check_circle_outline"
                className="text-4xl text-green-500"
              />
            </div>
            <p className="text-xl font-semibold text-slate-500">
              No defects reported yet
            </p>
            <p className="mt-1 text-slate-400">
              This product currently meets all quality standards.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 xl:gap-5">
            {photosWithDefects.map((photo) => (
              <Link
                key={photo.id}
                to={`/photos/${photo.id}`}
                className="relative aspect-square overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200"
              >
                {photo.url ? (
                  <>
                    <img
                      src={photo.url}
                      alt={`Photo ${photo.id}`}
                      className="h-full w-full object-cover"
                    />
                    {/* Verification status dot */}
                    {photo.verification_status &&
                      VERIFICATION_DOT[photo.verification_status] && (
                        <span
                          className={`absolute top-1.5 right-1.5 h-3.5 w-3.5 rounded-full border-2 border-white shadow-sm ${VERIFICATION_DOT[photo.verification_status].bg}`}
                          title={
                            VERIFICATION_DOT[photo.verification_status]
                              .title
                          }
                        />
                      )}
                    <div className="absolute bottom-2 right-2 rounded-md bg-red-500 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-white">
                      {photo.defectCount} defect
                      {photo.defectCount !== 1 ? "s" : ""}
                    </div>
                  </>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs font-medium text-slate-500">
                    Loading...
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

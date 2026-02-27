import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { spacing } from "@/lib/ui/spacing";
import { cn } from "@/lib/utils";
import type { DefectRecord } from "@/lib/api/defects";
import { DEFECT_CATEGORIES, formatEnumLabel } from "@/lib/db-constants";
import { formatTimestamp } from "@/lib/utils/date-formatting";

interface DefectsListProps {
  defects: DefectRecord[];
  isLoading: boolean;
  loadError: string | null;
  previewingDefect: DefectRecord | null;
  onPreview: (defect: DefectRecord | null) => void;
  onEdit: (defect: DefectRecord) => void;
  onDelete: (defect: DefectRecord) => void;
  onRetry: () => void;
  onAddDefect: () => void;
}

export function DefectsList({
  defects,
  isLoading,
  loadError,
  previewingDefect,
  onPreview,
  onEdit,
  onDelete,
  onRetry,
  onAddDefect,
}: DefectsListProps) {
  return (
    <Card className={spacing.cardShell}>
      <CardHeader className="flex-row items-center justify-between border-b border-slate-200 px-5 py-4 md:px-6 md:py-5">
        <CardTitle className="text-lg font-semibold text-slate-900">
          Defects
        </CardTitle>
        <Button type="button" density="compact" onClick={onAddDefect}>
          Add defect
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="px-5 py-4 text-sm text-slate-600 md:px-6">
            Loading defects...
          </div>
        ) : loadError ? (
          <div className="space-y-3 px-5 py-4 md:px-6">
            <div className="text-sm text-slate-600">{loadError}</div>
            <Button
              type="button"
              variant="outline"
              density="compact"
              className="border-slate-300 text-slate-700"
              onClick={onRetry}
            >
              Retry
            </Button>
          </div>
        ) : defects.length === 0 ? (
          <div className="px-5 py-4 text-sm text-slate-600 md:px-6">
            No defects yet.
          </div>
        ) : (
          <div className="space-y-3 p-5 md:p-6">
            {defects.map((defect) => {
              const severityValue = String(defect.severity ?? "unknown");
              const severityKey = severityValue.toLowerCase();
              const firstAnnotation =
                defect.annotations && defect.annotations.length > 0
                  ? defect.annotations[0]
                  : null;
              const category = firstAnnotation
                ? DEFECT_CATEGORIES.find(
                    (c) => c.id === firstAnnotation.category_id,
                  )
                : null;
              const categoryLabel = category ? category.name : "Unknown";
              return (
                <Card
                  key={defect.id}
                  className="rounded-xl border border-slate-200 shadow-none"
                >
                  <CardHeader className="flex-row items-start justify-between gap-4 px-4 py-4 md:px-5">
                    <div>
                      <div className="font-semibold text-slate-900">
                        {categoryLabel}
                      </div>
                      <div className="text-xs text-slate-500 md:text-sm">
                        Created{" "}
                        {formatTimestamp(defect.created_at ?? defect.createdAt)}
                      </div>
                    </div>
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold uppercase",
                        severityKey === "low" && "bg-blue-100 text-blue-700",
                        severityKey === "medium" &&
                          "bg-amber-100 text-amber-700",
                        severityKey === "high" && "bg-red-100 text-red-700",
                        severityKey === "critical" &&
                          "bg-slate-900 text-slate-50",
                        !["low", "medium", "high", "critical"].includes(
                          severityKey,
                        ) && "bg-slate-100 text-slate-700",
                      )}
                    >
                      {formatEnumLabel(severityValue)}
                    </span>
                  </CardHeader>
                  <CardContent className="space-y-3 px-4 pb-4 md:px-5">
                    <div className="text-sm text-slate-700 md:text-base">
                      {defect.description?.trim()
                        ? defect.description
                        : "No description provided."}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant={
                          previewingDefect?.id === defect.id
                            ? "default"
                            : "outline"
                        }
                        density="compact"
                        className={
                          previewingDefect?.id === defect.id
                            ? ""
                            : "border-slate-300 text-slate-700"
                        }
                        onClick={() =>
                          onPreview(
                            previewingDefect?.id === defect.id ? null : defect,
                          )
                        }
                      >
                        {previewingDefect?.id === defect.id
                          ? "Previewing"
                          : "Preview"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        density="compact"
                        className="border-slate-300 text-slate-700"
                        onClick={() => onEdit(defect)}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        density="compact"
                        className="bg-red-600 text-white hover:bg-red-700"
                        onClick={() => onDelete(defect)}
                      >
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

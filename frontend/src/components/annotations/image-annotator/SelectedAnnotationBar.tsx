import type { Annotation } from "@/lib/annotation-types";

interface SelectedAnnotationBarProps {
  selectedAnnotationId: number | null | undefined;
  readonly: boolean;
  enableMove: boolean;
  annotations: Annotation[];
  onDelete?: (annotationId: number) => void;
}

export function SelectedAnnotationBar({
  selectedAnnotationId,
  readonly,
  enableMove,
  annotations,
  onDelete,
}: SelectedAnnotationBarProps) {
  if (!selectedAnnotationId || readonly) {
    return null;
  }

  return (
    <div className="mt-2 flex items-center gap-2">
      {enableMove ? (
        <div className="text-sm font-medium text-green-700">
          ✓ Selected - Drag to reposition
        </div>
      ) : (
        <div className="text-sm font-medium text-gray-700">
          Selected annotation -{" "}
          {annotations.find((a) => a.id === selectedAnnotationId)?.geometry.type ||
            "Unknown"}
        </div>
      )}
      {onDelete && (
        <button
          type="button"
          onClick={() => onDelete(selectedAnnotationId)}
          className="min-w-16 rounded bg-red-600 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-red-700"
        >
          Delete
        </button>
      )}
    </div>
  );
}

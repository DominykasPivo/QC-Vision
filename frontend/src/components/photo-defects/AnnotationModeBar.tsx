import { Button } from "@/components/ui/button";
import type { DefectRecord } from "@/lib/api/defects";

interface AnnotationModeBarProps {
  mode: "preview" | "edit" | "idle";
  isMoveMode: boolean;
  isDrawingMode?: boolean;
  previewingDefect?: DefectRecord | null;
  editingDefect?: DefectRecord | null;
  newAnnotationsCount?: number;
  onToggleMove: () => void;
  onToggleDraw?: () => void;
  onShowAll?: () => void;
  onDone?: () => void;
}

export function AnnotationModeBar({
  mode,
  isMoveMode,
  isDrawingMode,
  previewingDefect,
  editingDefect,
  newAnnotationsCount = 0,
  onToggleMove,
  onToggleDraw,
  onShowAll,
  onDone,
}: AnnotationModeBarProps) {
  if (mode === "idle") {
    return (
      <div className="flex items-center justify-between p-2 bg-gray-50 border border-gray-200 rounded-lg">
        <span className="text-sm text-gray-700 font-medium">
          {previewingDefect
            ? `Previewing defect #${previewingDefect.id} (${previewingDefect.annotations?.length ?? 0} annotations)`
            : "View all defects"}
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={isMoveMode ? "default" : "outline"}
            density="compact"
            size="sm"
            className="h-7 rounded-md px-2.5 text-xs"
            onClick={onToggleMove}
          >
            {isMoveMode ? "🔓 Moving" : "🔒 Move"}
          </Button>
          {previewingDefect && onShowAll && (
            <Button
              type="button"
              variant="outline"
              density="compact"
              size="sm"
              className="h-7 rounded-md px-2.5 text-xs"
              onClick={onShowAll}
            >
              Show All
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (mode === "edit" && editingDefect) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between p-2 bg-orange-50 border border-orange-200 rounded-lg">
          <span className="text-sm text-orange-800 font-medium">
            ✏️ Editing defect #{editingDefect.id} -{" "}
            {(editingDefect.annotations?.length ?? 0) + newAnnotationsCount}{" "}
            annotation(s)
          </span>
          <div className="flex gap-2">
            {onToggleDraw && (
              <Button
                type="button"
                variant={isDrawingMode ? "default" : "outline"}
                density="compact"
                size="sm"
                className="h-7 rounded-md px-2.5 text-xs"
                onClick={onToggleDraw}
              >
                {isDrawingMode ? "✏️ Drawing" : "➕ Draw"}
              </Button>
            )}
            <Button
              type="button"
              variant={isMoveMode ? "default" : "outline"}
              density="compact"
              size="sm"
              className="h-7 rounded-md px-2.5 text-xs"
              onClick={onToggleMove}
            >
              {isMoveMode ? "🔓 Moving" : "🔒 Move"}
            </Button>
            {onDone && (
              <Button
                type="button"
                variant="outline"
                density="compact"
                size="sm"
                className="h-7 rounded-md px-2.5 text-xs"
                onClick={onDone}
              >
                {newAnnotationsCount > 0 ? "Save" : "Done"}
              </Button>
            )}
          </div>
        </div>
        {isMoveMode && (
          <div className="p-2 bg-green-50 border border-green-200 rounded text-sm text-green-800">
            🔓 <strong>Move Mode Active:</strong> Click and drag annotations to
            reposition them
          </div>
        )}
        {isDrawingMode && (
          <div className="p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
            ✏️ <strong>Drawing Mode Active:</strong> Draw new annotations to add
            to this defect
          </div>
        )}
      </div>
    );
  }

  return null;
}

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEFECT_CATEGORIES,
  DEFECT_COLORS,
  DEFECT_SEVERITIES,
  formatEnumLabel,
  type DefectSeverity,
} from "@/lib/db-constants";
import type { DefectFormState } from "@/lib/forms/defect-form";
import type { DefectRecord } from "@/lib/api/defects";
import { spacing } from "@/lib/ui/spacing";
import { cn } from "@/lib/utils";
import {
  FIELD_GROUP_CLASS,
  FIELD_LABEL_CLASS,
  TEXT_INPUT_CLASS,
  SELECT_CLASS,
} from "@/lib/constants/photoDefectsConstants";

interface EditDefectModalProps {
  isOpen: boolean;
  defect: DefectRecord | null;
  form: DefectFormState;
  isSaving: boolean;
  actionError: string | null;
  onClose: () => void;
  onUpdate: () => void;
  onFormChange: (form: DefectFormState) => void;
  onStartDrawing: () => void;
  onDeleteAnnotation: (annotationId: number) => void;
  onRemoveNewAnnotation: (index: number) => void;
}

export function EditDefectModal({
  isOpen,
  defect,
  form,
  isSaving,
  actionError,
  onClose,
  onUpdate,
  onFormChange,
  onStartDrawing,
  onDeleteAnnotation,
  onRemoveNewAnnotation,
}: EditDefectModalProps) {
  if (!isOpen || !defect) return null;

  return (
    <div
      className="fixed inset-0 z-[220] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={cn(
          spacing.modalPanel,
          "max-h-[82vh] max-w-xl overflow-hidden",
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="text-xl font-semibold text-slate-900">Edit Defect</div>
        <div className="mt-1 text-sm text-slate-600">
          Update the details and save changes.
        </div>
        <div className="flex max-h-[52vh] flex-col gap-3 overflow-y-auto pr-1.5">
          <div className={FIELD_GROUP_CLASS}>
            <label className={FIELD_LABEL_CLASS}>Category</label>
            <Select
              value={String(form.category_id)}
              onValueChange={(value) =>
                onFormChange({ ...form, category_id: Number(value) })
              }
            >
              <SelectTrigger
                className={SELECT_CLASS}
                id="edit-category"
                density="comfortable"
              >
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent className="z-[300]">
                {DEFECT_CATEGORIES.map((category) => (
                  <SelectItem key={category.id} value={String(category.id)}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className={FIELD_GROUP_CLASS}>
            <label className={FIELD_LABEL_CLASS}>Severity</label>
            <Select
              value={form.severity}
              onValueChange={(value) =>
                onFormChange({ ...form, severity: value as DefectSeverity })
              }
            >
              <SelectTrigger
                className={SELECT_CLASS}
                id="edit-severity"
                density="comfortable"
              >
                <SelectValue placeholder="Select severity" />
              </SelectTrigger>
              <SelectContent className="z-[300]">
                {DEFECT_SEVERITIES.map((severity) => (
                  <SelectItem key={severity} value={severity}>
                    {formatEnumLabel(severity)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className={FIELD_GROUP_CLASS}>
            <label className={FIELD_LABEL_CLASS}>Description (optional)</label>
            <textarea
              className={cn(TEXT_INPUT_CLASS, "resize-y")}
              rows={4}
              value={form.description}
              onChange={(event) =>
                onFormChange({ ...form, description: event.target.value })
              }
            />
          </div>
          <div className={FIELD_GROUP_CLASS}>
            <label className={FIELD_LABEL_CLASS}>Annotation Color</label>
            <div className="flex gap-2 items-center">
              {DEFECT_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => onFormChange({ ...form, color: c.value })}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${form.color === c.value ? "border-gray-800 scale-110" : "border-gray-300"}`}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              ))}
            </div>
          </div>
          {defect.annotations && defect.annotations.length > 0 && (
            <div className={FIELD_GROUP_CLASS}>
              <label className={FIELD_LABEL_CLASS}>
                Annotations ({defect.annotations.length})
              </label>
              <div className="space-y-2">
                {defect.annotations.map((ann) => {
                  const category = DEFECT_CATEGORIES.find(
                    (c) => c.id === ann.category_id,
                  );
                  return (
                    <div
                      key={ann.id}
                      className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded hover:bg-gray-100"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full border border-gray-300"
                          style={{
                            backgroundColor: ann.color ?? form.color,
                          }}
                        />
                        <span className="text-sm capitalize font-medium">
                          {ann.geometry.type}
                        </span>
                        <span className="text-xs text-gray-500">
                          • {category ? category.name : "Unknown"}
                        </span>
                      </div>
                      <Button
                        type="button"
                        onClick={async () => {
                          if (confirm("Delete this annotation?")) {
                            await onDeleteAnnotation(ann.id);
                          }
                        }}
                        density="compact"
                        className="bg-red-600 text-white hover:bg-red-700"
                        disabled={isSaving}
                      >
                        Delete
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {form.annotations.length > 0 && (
            <div className={FIELD_GROUP_CLASS}>
              <label className={FIELD_LABEL_CLASS}>
                New Annotations to Add ({form.annotations.length})
              </label>
              <div className="space-y-2">
                {form.annotations.map((ann, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full border border-gray-300"
                        style={{ backgroundColor: form.color }}
                      />
                      <span className="text-sm capitalize font-medium">
                        {ann.type}
                      </span>
                      <span className="text-xs text-green-600">• New</span>
                    </div>
                    <Button
                      type="button"
                      onClick={() => onRemoveNewAnnotation(index)}
                      density="compact"
                      className="bg-red-600 text-white hover:bg-red-700"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {actionError && (
            <div className="text-sm font-medium text-red-600">
              {actionError}
            </div>
          )}
        </div>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            density="compact"
            className="border-slate-300 text-slate-700"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            density="compact"
            className="border-slate-300 text-slate-700"
            onClick={onStartDrawing}
            disabled={isSaving}
          >
            ✏️ Add Annotations
          </Button>
          <Button
            type="button"
            density="compact"
            onClick={onUpdate}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}

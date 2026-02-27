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
import { cn } from "@/lib/utils";
import {
  FIELD_GROUP_CLASS,
  FIELD_LABEL_CLASS,
  TEXT_INPUT_CLASS,
  SELECT_CLASS,
} from "@/lib/constants/photoDefectsConstants";

interface DefectFormPanelProps {
  form: DefectFormState;
  isSaving: boolean;
  onFormChange: (form: DefectFormState) => void;
  onCancel: () => void;
  onCreate: () => void;
}

export function DefectFormPanel({
  form,
  isSaving,
  onFormChange,
  onCancel,
  onCreate,
}: DefectFormPanelProps) {
  return (
    <div className="p-4 bg-blue-50 border-2 border-blue-300 rounded-lg space-y-4">
      <div className="text-base font-semibold text-blue-900">
        📝 New Defect - Fill details and draw on image below
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={FIELD_GROUP_CLASS}>
          <label className={FIELD_LABEL_CLASS}>Category *</label>
          <Select
            value={String(form.category_id)}
            onValueChange={(value) =>
              onFormChange({ ...form, category_id: Number(value) })
            }
          >
            <SelectTrigger className={SELECT_CLASS} density="comfortable">
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
          <label className={FIELD_LABEL_CLASS}>Severity *</label>
          <Select
            value={form.severity}
            onValueChange={(value) =>
              onFormChange({ ...form, severity: value as DefectSeverity })
            }
          >
            <SelectTrigger className={SELECT_CLASS} density="comfortable">
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
          <label className={FIELD_LABEL_CLASS}>Description</label>
          <textarea
            className={cn(TEXT_INPUT_CLASS, "min-h-24 resize-y")}
            value={form.description}
            onChange={(event) =>
              onFormChange({ ...form, description: event.target.value })
            }
            placeholder="Optional description..."
            rows={5}
            maxLength={500}
          />
        </div>
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

      <div className="flex gap-2 items-center justify-between">
        <span className="text-sm text-gray-700">
          {form.annotations.length === 0 ? (
            <span className="text-orange-600 font-medium">
              ⚠️ Draw at least one shape on the image
            </span>
          ) : (
            <span className="text-green-600 font-medium">
              ✓ {form.annotations.length} annotation
              {form.annotations.length !== 1 ? "s" : ""} drawn
            </span>
          )}
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            density="compact"
            className="border-slate-300 text-slate-700"
            onClick={onCancel}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            density="compact"
            onClick={onCreate}
            disabled={form.annotations.length === 0 || isSaving}
          >
            {isSaving ? "Saving..." : "Save Defect"}
          </Button>
        </div>
      </div>
    </div>
  );
}

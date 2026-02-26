import { Button } from "@/components/ui/button";
import {
  TEXT_INPUT_CLASS,
} from "@/lib/constants/photoDefectsConstants";

interface PhotoDescriptionSectionProps {
  description: string | null | undefined;
  isEditing: boolean;
  descriptionText: string;
  isSaving: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDescriptionChange: (value: string) => void;
}

export function PhotoDescriptionSection({
  description,
  isEditing,
  descriptionText,
  isSaving,
  onEdit,
  onSave,
  onCancel,
  onDescriptionChange,
}: PhotoDescriptionSectionProps) {
  return (
    <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
      <div className="flex items-start justify-between mb-2">
        <label className="text-sm font-semibold text-slate-700">
          Photo Description
        </label>
        {!isEditing && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onEdit}
            disabled={isSaving}
            className="h-7 text-xs"
          >
            Edit
          </Button>
        )}
      </div>
      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={descriptionText}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Add a description for this photo..."
            rows={3}
            className={TEXT_INPUT_CLASS}
            disabled={isSaving}
          />
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={onSave} disabled={isSaving}>
              Save
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={isSaving}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-600 whitespace-pre-wrap">
          {description || "No description provided."}
        </p>
      )}
    </div>
  );
}

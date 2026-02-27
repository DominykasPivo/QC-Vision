import { useState } from "react";
import {
  createDefect,
  deleteDefect,
  updateDefect,
  updateAnnotation,
  deleteAnnotation,
  getDefectsByPhoto,
  type DefectPayload,
  type DefectRecord,
} from "@/lib/api/defects";
import {
  validateDefectForm,
  type DefectFormState,
} from "@/lib/forms/defect-form";
import type { AnnotationGeometry } from "@/lib/annotation-types";

interface UseDefectActionsParams {
  photoId?: string;
  form: DefectFormState;
  editingDefect: DefectRecord | null;
  setEditingDefect: (defect: DefectRecord | null) => void;
  setDefects: (defects: DefectRecord[]) => void;
  setShowCreate: (show: boolean) => void;
  setIsDrawingMode: (mode: boolean) => void;
  resetForm: () => void;
  loadDefects: () => Promise<void>;
}

/**
 * Hook to manage defect CRUD operations
 */
export function useDefectActions({
  photoId,
  form,
  editingDefect,
  setEditingDefect,
  setDefects,
  setShowCreate,
  setIsDrawingMode,
  resetForm,
  loadDefects,
}: UseDefectActionsParams) {
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deletingDefect, setDeletingDefect] = useState<DefectRecord | null>(
    null,
  );

  const handleCreate = async () => {
    if (!photoId || isSaving) {
      return;
    }

    const validationError = validateDefectForm(form);
    if (validationError) {
      setActionError(validationError);
      return;
    }

    setIsSaving(true);
    setActionError(null);
    try {
      const annotationsPayload = form.annotations.map((geometry) => ({
        category_id: form.category_id,
        geometry,
        color: form.color,
      }));
      await createDefect(photoId, {
        category_id: form.category_id,
        severity: form.severity,
        description: form.description.trim() || null,
        annotations: annotationsPayload,
      });
      setShowCreate(false);
      resetForm();
      await loadDefects();
    } catch (error) {
      console.error("Failed to create defect:", error);
      setActionError(
        error instanceof Error ? error.message : "Failed to create defect.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingDefect || isSaving) {
      return;
    }
    setIsSaving(true);
    setActionError(null);
    try {
      const payload: DefectPayload = {
        category_id: form.category_id,
        severity: form.severity,
        description: form.description.trim() || null,
        color: form.color,
      };

      if (form.annotations.length > 0) {
        payload.annotations = form.annotations.map((geom) => ({
          category_id: form.category_id,
          geometry: geom,
          color: form.color,
        }));
      }

      await updateDefect(editingDefect.id, payload);
      setEditingDefect(null);
      setIsDrawingMode(false);
      resetForm();
      await loadDefects();
    } catch (error) {
      console.error("Failed to update defect:", error);
      setActionError(
        error instanceof Error ? error.message : "Failed to update defect.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingDefect || isSaving) {
      return;
    }
    setIsSaving(true);
    setActionError(null);
    try {
      await deleteDefect(deletingDefect.id);
      setDeletingDefect(null);
      await loadDefects();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Failed to delete defect.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleAnnotationUpdate = async (
    annotationId: number,
    geometry: AnnotationGeometry,
  ): Promise<void> => {
    if (annotationId < 0) {
      // Handled by local form update
      return;
    }

    try {
      await updateAnnotation(annotationId, { geometry });
      const refreshedDefects = await getDefectsByPhoto(photoId!);
      setDefects(Array.isArray(refreshedDefects) ? refreshedDefects : []);

      if (editingDefect) {
        const updated = refreshedDefects.find((d) => d.id === editingDefect.id);
        if (updated) setEditingDefect(updated);
      }
    } catch (error) {
      console.error("Failed to update annotation:", error);
      setActionError(
        error instanceof Error ? error.message : "Failed to update annotation.",
      );
    }
  };

  const handleAnnotationDeletePermanent = async (
    annotationId: number,
  ): Promise<void> => {
    if (annotationId < 0) {
      // Handled by local form state
      return;
    }

    try {
      await deleteAnnotation(annotationId);
      const refreshedDefects = await getDefectsByPhoto(photoId!);
      setDefects(Array.isArray(refreshedDefects) ? refreshedDefects : []);

      if (editingDefect) {
        const updated = refreshedDefects.find((d) => d.id === editingDefect.id);
        if (updated) setEditingDefect(updated);
      }
    } catch (error) {
      console.error("Failed to delete annotation:", error);
      setActionError(
        error instanceof Error ? error.message : "Failed to delete annotation.",
      );
    }
  };

  return {
    isSaving,
    actionError,
    setActionError,
    deletingDefect,
    setDeletingDefect,
    handleCreate,
    handleUpdate,
    handleDelete,
    handleAnnotationUpdate,
    handleAnnotationDeletePermanent,
  };
}

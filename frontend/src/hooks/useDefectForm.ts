import { useState } from "react";
import type { DefectFormState } from "@/lib/forms/defect-form";
import {
  createEmptyDefectForm,
  initializeDefectForm,
  addAnnotationToForm,
  removeAnnotationFromForm,
  updateAnnotationInForm,
} from "@/lib/forms/defect-form";
import type { DrawingTool } from "@/lib/annotation-types";
import type { AnnotationGeometry } from "@/lib/annotation-types";
import type { DefectRecord } from "@/lib/api/defects";

/**
 * Hook to manage defect form state and operations
 */
export function useDefectForm() {
  const [form, setForm] = useState<DefectFormState>(createEmptyDefectForm());
  const [currentTool, setCurrentTool] = useState<DrawingTool>("select");
  const [showCreate, setShowCreate] = useState(false);
  const [editingDefect, setEditingDefect] = useState<DefectRecord | null>(null);
  const [previewingDefect, setPreviewingDefect] = useState<DefectRecord | null>(
    null,
  );
  const [isMoveMode, setIsMoveMode] = useState(false);
  const [isDrawingMode, setIsDrawingMode] = useState(false);

  const resetForm = () => {
    setForm(createEmptyDefectForm());
    setCurrentTool("select");
  };

  const openCreate = () => {
    resetForm();
    setPreviewingDefect(null);
    setEditingDefect(null);
    setShowCreate(true);
    setCurrentTool("rect");
  };

  const openEdit = (defect: DefectRecord) => {
    setForm(initializeDefectForm(defect));
    setShowCreate(false);
    setIsDrawingMode(false);
    setIsMoveMode(false);
    setEditingDefect(defect);
  };

  const cancelCreate = () => {
    setShowCreate(false);
    resetForm();
  };

  const handleAnnotationCreate = (geometry: AnnotationGeometry) => {
    setForm((prev) => addAnnotationToForm(prev, geometry));
    setCurrentTool("select");
  };

  const handleAnnotationDelete = (index: number) => {
    setForm((prev) => removeAnnotationFromForm(prev, index));
  };

  const handleAnnotationUpdateLocal = (
    index: number,
    geometry: AnnotationGeometry,
  ) => {
    setForm((prev) => updateAnnotationInForm(prev, index, geometry));
  };

  return {
    form,
    setForm,
    currentTool,
    setCurrentTool,
    showCreate,
    setShowCreate,
    editingDefect,
    setEditingDefect,
    previewingDefect,
    setPreviewingDefect,
    isMoveMode,
    setIsMoveMode,
    isDrawingMode,
    setIsDrawingMode,
    resetForm,
    openCreate,
    openEdit,
    cancelCreate,
    handleAnnotationCreate,
    handleAnnotationDelete,
    handleAnnotationUpdateLocal,
  };
}

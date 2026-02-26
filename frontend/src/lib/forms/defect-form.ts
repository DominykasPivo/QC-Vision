/**
 * Defect form utilities
 * Handles defect form state and initialization
 */

import {
  DEFECT_CATEGORIES,
  DEFECT_COLORS,
  DEFECT_SEVERITIES,
  type DefectSeverity,
} from "../db-constants";
import type { AnnotationGeometry } from "../annotation-types";
import type { DefectRecord } from "./defects";

export type DefectFormState = {
  category_id: number;
  severity: DefectSeverity;
  description: string;
  color: string;
  annotations: AnnotationGeometry[];
};

/**
 * Create empty defect form state
 */
export function createEmptyDefectForm(): DefectFormState {
  return {
    category_id: DEFECT_CATEGORIES[0].id,
    severity: DEFECT_SEVERITIES[0],
    description: "",
    color: DEFECT_COLORS[0].value,
    annotations: [],
  };
}

/**
 * Initialize defect form from existing defect record
 */
export function initializeDefectForm(defect: DefectRecord): DefectFormState {
  const firstAnnotation =
    defect.annotations && defect.annotations.length > 0
      ? defect.annotations[0]
      : null;

  return {
    category_id: firstAnnotation
      ? firstAnnotation.category_id
      : DEFECT_CATEGORIES[0].id,
    severity: (DEFECT_SEVERITIES.includes(defect.severity as DefectSeverity)
      ? (defect.severity as DefectSeverity)
      : DEFECT_SEVERITIES[0]) as DefectSeverity,
    description: defect.description ?? "",
    color: firstAnnotation?.color ?? DEFECT_COLORS[0].value,
    annotations: [],
  };
}

/**
 * Add annotation to form
 */
export function addAnnotationToForm(
  form: DefectFormState,
  geometry: AnnotationGeometry,
): DefectFormState {
  return {
    ...form,
    annotations: [...form.annotations, geometry],
  };
}

/**
 * Remove annotation from form by index
 */
export function removeAnnotationFromForm(
  form: DefectFormState,
  index: number,
): DefectFormState {
  return {
    ...form,
    annotations: form.annotations.filter((_, i) => i !== index),
  };
}

/**
 * Update annotation in form by index
 */
export function updateAnnotationInForm(
  form: DefectFormState,
  index: number,
  geometry: AnnotationGeometry,
): DefectFormState {
  return {
    ...form,
    annotations: form.annotations.map((ann, i) =>
      i === index ? geometry : ann,
    ),
  };
}

/**
 * Validate defect form
 */
export function validateDefectForm(form: DefectFormState): string | null {
  if (form.annotations.length === 0) {
    return "Please draw at least one annotation on the photo.";
  }
  return null;
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  createDefect,
  deleteDefect,
  getDefectsByPhoto,
  getPhoto,
  updateDefect,
  updateAnnotation,
  deleteAnnotation,
  type DefectPayload,
  type DefectRecord,
  type PhotoRecord,
} from "@/lib/api/defects";
import { ImageAnnotator } from "@/components/annotations/ImageAnnotator";
import { AnnotationToolbar } from "@/components/annotations/AnnotationToolbar";
import type {
  Annotation,
  AnnotationGeometry,
  DrawingTool,
} from "@/lib/annotation-types";
import { spacing } from "@/lib/ui/spacing";
import { cn } from "@/lib/utils";

type DefectFormState = {
  category_id: number;
  severity: DefectSeverity;
  description: string;
  color: string;
  annotations: AnnotationGeometry[];
};

export function PhotoDefects() {
  const { photoId } = useParams<{ photoId: string }>();
  const navigate = useNavigate();
  const [photo, setPhoto] = useState<PhotoRecord | null>(null);
  const [defects, setDefects] = useState<DefectRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editingDefect, setEditingDefect] = useState<DefectRecord | null>(null);
  const [deletingDefect, setDeletingDefect] = useState<DefectRecord | null>(
    null,
  );
  const [form, setForm] = useState<DefectFormState>({
    category_id: DEFECT_CATEGORIES[0].id,
    severity: DEFECT_SEVERITIES[0],
    description: "",
    color: DEFECT_COLORS[0].value,
    annotations: [],
  });
  const [currentTool, setCurrentTool] = useState<DrawingTool>("select");
  const [selectedAnnotation, setSelectedAnnotation] =
    useState<Annotation | null>(null);
  const [previewingDefect, setPreviewingDefect] = useState<DefectRecord | null>(
    null,
  );
  const [isMoveMode, setIsMoveMode] = useState(false);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const fieldGroupClass = "space-y-2";
  const fieldLabelClass = "text-sm font-medium text-slate-700";
  const textInputClass =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-[#2563eb]";
  const selectClass =
    "rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:border-[#2563eb]";
  const backLinkClass =
    "inline-flex items-center gap-1 text-sm font-medium text-[var(--primary)] no-underline hover:underline";

  const photoPreviewUrl = useMemo(() => {
    if (!photoId) {
      return "";
    }
    return `/api/v1/photos/${photoId}/image?t=${Date.now()}`;
  }, [photoId]);

  const resetForm = () => {
    setForm({
      category_id: DEFECT_CATEGORIES[0].id,
      severity: DEFECT_SEVERITIES[0],
      description: "",
      color: DEFECT_COLORS[0].value,
      annotations: [],
    });
    setCurrentTool("select");
    setSelectedAnnotation(null);
  };

  const loadDefects = useCallback(async () => {
    if (!photoId) {
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    setPreviewingDefect(null);
    try {
      const data = await getDefectsByPhoto(photoId);
      setDefects(Array.isArray(data) ? data : []);
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Failed to load defects.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [photoId]);

  useEffect(() => {
    loadDefects();
  }, [loadDefects]);

  useEffect(() => {
    if (!photoId) {
      return;
    }

    let active = true;
    getPhoto(photoId)
      .then((data) => {
        if (active) {
          setPhoto(data);
        }
      })
      .catch(() => {
        if (active) {
          setPhoto(null);
        }
      });

    return () => {
      active = false;
    };
  }, [photoId]);

  if (!photoId) {
    return (
      <div
        className={cn(spacing.pageContainer, spacing.pageStack, "max-w-6xl")}
      >
        <button
          type="button"
          className={backLinkClass}
          onClick={() => navigate(-1)}
        >
          ← Back
        </button>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Photo
        </h2>
        <p className="text-sm text-slate-600 md:text-base">
          Photo ID is missing.
        </p>
      </div>
    );
  }

  const openCreate = () => {
    resetForm();
    setActionError(null);
    setPreviewingDefect(null);
    setEditingDefect(null);
    setShowCreate(true);
    setCurrentTool("rect");
  };

  const openEdit = (defect: DefectRecord) => {
    const firstAnnotation =
      defect.annotations && defect.annotations.length > 0
        ? defect.annotations[0]
        : null;
    setForm({
      category_id: firstAnnotation
        ? firstAnnotation.category_id
        : DEFECT_CATEGORIES[0].id,
      severity: (DEFECT_SEVERITIES.includes(defect.severity as DefectSeverity)
        ? (defect.severity as DefectSeverity)
        : DEFECT_SEVERITIES[0]) as DefectSeverity,
      description: defect.description ?? "",
      color: firstAnnotation?.color ?? DEFECT_COLORS[0].value,
      annotations: [],
    });
    setActionError(null);
    setShowCreate(false);
    setIsDrawingMode(false);
    setIsMoveMode(false);
    setEditingDefect(defect);
  };

  const handleAnnotationCreate = (geometry: AnnotationGeometry) => {
    setForm((prev) => ({
      ...prev,
      annotations: [...prev.annotations, geometry],
    }));
    setCurrentTool("select");
  };

  const handleAnnotationDelete = (index: number) => {
    setForm((prev) => ({
      ...prev,
      annotations: prev.annotations.filter((_, i) => i !== index),
    }));
  };

  const handleAnnotationUpdate = async (
    annotationId: number,
    geometry: AnnotationGeometry,
  ) => {
    if (annotationId < 0) {
      // Temporary annotation (from form)
      const index = -annotationId - 1;
      setForm((prev) => ({
        ...prev,
        annotations: prev.annotations.map((ann, i) =>
          i === index ? geometry : ann,
        ),
      }));
      return;
    }

    // Existing annotation (from database)
    try {
      await updateAnnotation(annotationId, { geometry });
      const refreshedDefects = await getDefectsByPhoto(photoId!);
      setDefects(Array.isArray(refreshedDefects) ? refreshedDefects : []);

      // Update editingDefect if we're editing
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

  const handleAnnotationDeletePermanent = async (annotationId: number) => {
    if (annotationId < 0) {
      // Temporary annotation (from form)
      const index = -annotationId - 1;
      handleAnnotationDelete(index);
      return;
    }

    // Existing annotation (from database)
    try {
      await deleteAnnotation(annotationId);
      const refreshedDefects = await getDefectsByPhoto(photoId!);
      setDefects(Array.isArray(refreshedDefects) ? refreshedDefects : []);

      // Update editingDefect if we're editing
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

  const allAnnotations: Annotation[] = defects.flatMap(
    (defect) => defect.annotations || [],
  );

  const displayedAnnotations: Annotation[] =
    previewingDefect?.annotations ||
    editingDefect?.annotations ||
    allAnnotations;

  const formatTimestamp = (value?: string | null) => {
    if (!value) {
      return "—";
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toLocaleString();
  };

  const handleCreate = async () => {
    if (!photoId || isSaving) {
      return;
    }
    if (form.annotations.length === 0) {
      setActionError("Please draw at least one annotation on the photo.");
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
      console.log("Creating defect with payload:", {
        category_id: form.category_id,
        severity: form.severity,
        description: form.description.trim() || null,
        annotations: annotationsPayload,
      });
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

  const cancelCreate = () => {
    setShowCreate(false);
    resetForm();
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

      // Add new annotations if any were drawn
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

  return (
    <div className={cn(spacing.pageContainer, spacing.pageStack, "max-w-6xl")}>
      <button
        type="button"
        className={backLinkClass}
        onClick={() => navigate(-1)}
      >
        ← Back
      </button>
      <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
        Photo
      </h2>
      <p className="text-sm text-slate-600 md:text-base">
        Defects linked to this photo.
      </p>

      <Card className={spacing.cardShell}>
        <CardHeader className="p-0">
          <CardTitle className="px-5 py-4 text-lg font-semibold text-slate-900 md:px-6 md:py-5">
            Photo with Annotations
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-4 p-5 md:p-6">
            {showCreate && (
              <>
                <div className="p-4 bg-blue-50 border-2 border-blue-300 rounded-lg space-y-4">
                  <div className="text-base font-semibold text-blue-900">
                    📝 New Defect - Fill details and draw on image below
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className={fieldGroupClass}>
                      <label className={fieldLabelClass}>Category *</label>
                      <Select
                        value={String(form.category_id)}
                        onValueChange={(value) =>
                          setForm((prev) => ({
                            ...prev,
                            category_id: Number(value),
                          }))
                        }
                      >
                        <SelectTrigger
                          className={selectClass}
                          density="comfortable"
                        >
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent className="z-[300]">
                          {DEFECT_CATEGORIES.map((category) => (
                            <SelectItem
                              key={category.id}
                              value={String(category.id)}
                            >
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className={fieldGroupClass}>
                      <label className={fieldLabelClass}>Severity *</label>
                      <Select
                        value={form.severity}
                        onValueChange={(value) =>
                          setForm((prev) => ({
                            ...prev,
                            severity: value as DefectSeverity,
                          }))
                        }
                      >
                        <SelectTrigger
                          className={selectClass}
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

                    <div className={fieldGroupClass}>
                      <label className={fieldLabelClass}>Description</label>
                      <textarea
                        className={cn(textInputClass, "min-h-24 resize-y")}
                        value={form.description}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            description: event.target.value,
                          }))
                        }
                        placeholder="Optional description..."
                        rows={5}
                        maxLength={500}
                      />
                    </div>
                  </div>

                  <div className={fieldGroupClass}>
                    <label className={fieldLabelClass}>Annotation Color</label>
                    <div className="flex gap-2 items-center">
                      {DEFECT_COLORS.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() =>
                            setForm((prev) => ({ ...prev, color: c.value }))
                          }
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
                        onClick={cancelCreate}
                        disabled={isSaving}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        density="compact"
                        onClick={handleCreate}
                        disabled={form.annotations.length === 0 || isSaving}
                      >
                        {isSaving ? "Saving..." : "Save Defect"}
                      </Button>
                    </div>
                  </div>
                </div>

                <AnnotationToolbar
                  currentTool={currentTool}
                  onToolChange={setCurrentTool}
                  disabled={false}
                />
              </>
            )}
            {!showCreate && !editingDefect && (
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
                    onClick={() => setIsMoveMode(!isMoveMode)}
                  >
                    {isMoveMode ? "🔓 Moving" : "🔒 Move"}
                  </Button>
                  {previewingDefect && (
                    <Button
                      type="button"
                      variant="outline"
                      density="compact"
                      size="sm"
                      className="h-7 rounded-md px-2.5 text-xs"
                      onClick={() => setPreviewingDefect(null)}
                    >
                      Show All
                    </Button>
                  )}
                </div>
              </div>
            )}
            {editingDefect && !showCreate && (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-orange-50 border border-orange-200 rounded-lg">
                  <span className="text-sm text-orange-800 font-medium">
                    ✏️ Editing defect #{editingDefect.id} -{" "}
                    {(editingDefect.annotations?.length ?? 0) +
                      form.annotations.length}{" "}
                    annotation(s)
                  </span>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={isDrawingMode ? "default" : "outline"}
                      density="compact"
                      size="sm"
                      className="h-7 rounded-md px-2.5 text-xs"
                      onClick={() => {
                        setIsDrawingMode(!isDrawingMode);
                        setIsMoveMode(false);
                        if (!isDrawingMode) {
                          setCurrentTool("rect");
                        } else {
                          setCurrentTool("select");
                        }
                      }}
                    >
                      {isDrawingMode ? "✏️ Drawing" : "➕ Draw"}
                    </Button>
                    <Button
                      type="button"
                      variant={isMoveMode ? "default" : "outline"}
                      density="compact"
                      size="sm"
                      className="h-7 rounded-md px-2.5 text-xs"
                      onClick={() => {
                        setIsMoveMode(!isMoveMode);
                        setIsDrawingMode(false);
                        setCurrentTool("select");
                      }}
                    >
                      {isMoveMode ? "🔓 Moving" : "🔒 Move"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      density="compact"
                      size="sm"
                      className="h-7 rounded-md px-2.5 text-xs"
                      onClick={() => {
                        if (form.annotations.length > 0) {
                          handleUpdate();
                        } else {
                          setEditingDefect(null);
                          setSelectedAnnotation(null);
                          setIsMoveMode(false);
                          setIsDrawingMode(false);
                          setCurrentTool("select");
                        }
                      }}
                    >
                      {form.annotations.length > 0 ? "Save" : "Done"}
                    </Button>
                  </div>
                </div>
                {isMoveMode && (
                  <div className="p-2 bg-green-50 border border-green-200 rounded text-sm text-green-800">
                    🔓 <strong>Move Mode Active:</strong> Click and drag
                    annotations to reposition them
                  </div>
                )}
                {isDrawingMode && (
                  <div className="p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                    ✏️ <strong>Drawing Mode Active:</strong> Draw new
                    annotations to add to this defect
                  </div>
                )}

                {isDrawingMode && (
                  <AnnotationToolbar
                    currentTool={currentTool}
                    onToolChange={setCurrentTool}
                    disabled={false}
                  />
                )}
              </div>
            )}
            <ImageAnnotator
              imageUrl={photo?.url ?? photoPreviewUrl}
              annotations={
                showCreate
                  ? form.annotations.map((geom, idx) => ({
                      id: -idx - 1,
                      defect_id: -1,
                      category_id: form.category_id,
                      geometry: geom,
                      color: form.color,
                      created_at: new Date().toISOString(),
                    }))
                  : editingDefect
                    ? [
                        ...(editingDefect.annotations || []),
                        ...form.annotations.map((geom, idx) => ({
                          id: -(
                            idx +
                            1 +
                            (editingDefect.annotations?.length || 0)
                          ),
                          defect_id: editingDefect.id as number,
                          category_id: form.category_id,
                          geometry: geom,
                          color: form.color,
                          created_at: new Date().toISOString(),
                        })),
                      ]
                    : displayedAnnotations
              }
              currentTool={showCreate || isDrawingMode ? currentTool : "select"}
              onAnnotationCreate={
                showCreate || isDrawingMode ? handleAnnotationCreate : undefined
              }
              onAnnotationSelect={setSelectedAnnotation}
              onAnnotationUpdate={handleAnnotationUpdate}
              onAnnotationDelete={handleAnnotationDeletePermanent}
              selectedAnnotationId={selectedAnnotation?.id}
              readonly={false}
              enableMove={!showCreate && !isDrawingMode && isMoveMode}
            />
            {!showCreate && !editingDefect && isMoveMode && (
              <div className="p-2 bg-green-50 border border-green-200 rounded text-sm text-green-800">
                🔓 <strong>Move Mode Active:</strong> Click and drag any
                annotation to reposition it
              </div>
            )}
            {editingDefect && form.annotations.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">
                  New annotations to add ({form.annotations.length}):
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.annotations.map((ann, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 px-3 py-1 bg-green-50 border border-green-200 rounded"
                    >
                      <span className="text-sm capitalize">{ann.type}</span>
                      <button
                        type="button"
                        onClick={() => handleAnnotationDelete(index)}
                        className="text-red-600 hover:text-red-800 font-bold"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {showCreate && form.annotations.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">
                  Drawn annotations ({form.annotations.length}):
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.annotations.map((ann, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded"
                    >
                      <span className="text-sm capitalize">{ann.type}</span>
                      <button
                        type="button"
                        onClick={() => handleAnnotationDelete(index)}
                        className="text-red-600 hover:text-red-800 font-bold"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {photo?.file_path ? (
              <div className="text-sm text-slate-600">
                File: {photo.file_path}
              </div>
            ) : (
              <div className="text-sm text-slate-600">Photo ID: {photoId}</div>
            )}
            {actionError && (
              <div className="text-red-600 text-sm font-medium">
                {actionError}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className={spacing.cardShell}>
        <CardHeader className="flex-row items-center justify-between border-b border-slate-200 px-5 py-4 md:px-6 md:py-5">
          <CardTitle className="text-lg font-semibold text-slate-900">
            Defects
          </CardTitle>
          <Button type="button" density="compact" onClick={openCreate}>
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
                onClick={loadDefects}
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
                          {formatTimestamp(
                            defect.created_at ?? defect.createdAt,
                          )}
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
                            setPreviewingDefect((prev) =>
                              prev?.id === defect.id ? null : defect,
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
                          onClick={() => openEdit(defect)}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          density="compact"
                          className="bg-red-600 text-white hover:bg-red-700"
                          onClick={() => setDeletingDefect(defect)}
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

      {editingDefect && !isDrawingMode && (
        <div
          className="fixed inset-0 z-[220] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
          onClick={() => setEditingDefect(null)}
        >
          <div
            className={cn(
              spacing.modalPanel,
              "max-h-[82vh] max-w-xl overflow-hidden",
            )}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="text-xl font-semibold text-slate-900">
              Edit Defect
            </div>
            <div className="mt-1 text-sm text-slate-600">
              Update the details and save changes.
            </div>
            <div className="flex max-h-[52vh] flex-col gap-3 overflow-y-auto pr-1.5">
              <div className={fieldGroupClass}>
                <label className={fieldLabelClass}>Category</label>
                <Select
                  value={String(form.category_id)}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, category_id: Number(value) }))
                  }
                >
                  <SelectTrigger
                    className={selectClass}
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
              <div className={fieldGroupClass}>
                <label className={fieldLabelClass}>Severity</label>
                <Select
                  value={form.severity}
                  onValueChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      severity: value as DefectSeverity,
                    }))
                  }
                >
                  <SelectTrigger
                    className={selectClass}
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
              <div className={fieldGroupClass}>
                <label className={fieldLabelClass}>
                  Description (optional)
                </label>
                <textarea
                  className={cn(textInputClass, "resize-y")}
                  rows={4}
                  value={form.description}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                />
              </div>
              <div className={fieldGroupClass}>
                <label className={fieldLabelClass}>Annotation Color</label>
                <div className="flex gap-2 items-center">
                  {DEFECT_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({ ...prev, color: c.value }))
                      }
                      className={`w-7 h-7 rounded-full border-2 transition-transform ${form.color === c.value ? "border-gray-800 scale-110" : "border-gray-300"}`}
                      style={{ backgroundColor: c.value }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>
              {editingDefect &&
                editingDefect.annotations &&
                editingDefect.annotations.length > 0 && (
                  <div className={fieldGroupClass}>
                    <label className={fieldLabelClass}>
                      Annotations ({editingDefect.annotations.length})
                    </label>
                    <div className="space-y-2">
                      {editingDefect.annotations.map((ann) => {
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
                                  await handleAnnotationDeletePermanent(ann.id);
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
                <div className={fieldGroupClass}>
                  <label className={fieldLabelClass}>
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
                          onClick={() => handleAnnotationDelete(index)}
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
                onClick={() => {
                  setEditingDefect(null);
                  resetForm();
                }}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                density="compact"
                className="border-slate-300 text-slate-700"
                onClick={() => {
                  setIsDrawingMode(true);
                  setCurrentTool("rect");
                }}
                disabled={isSaving}
              >
                ✏️ Add Annotations
              </Button>
              <Button
                type="button"
                density="compact"
                onClick={handleUpdate}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {deletingDefect && (
        <div
          className="fixed inset-0 z-[220] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
          onClick={() => setDeletingDefect(null)}
        >
          <div
            className={cn(spacing.modalPanel, "max-w-md")}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="text-xl font-semibold text-slate-900">
              Delete defect?
            </div>
            <div className="mt-1 text-sm text-slate-600">
              This action cannot be undone.
              {actionError && (
                <div className="mt-2 text-sm font-medium text-red-600">
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
                onClick={() => setDeletingDefect(null)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                type="button"
                density="compact"
                className="bg-red-600 text-white hover:bg-red-700"
                onClick={handleDelete}
                disabled={isSaving}
              >
                {isSaving ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

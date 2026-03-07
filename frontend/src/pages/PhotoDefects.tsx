import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ImageAnnotator } from "@/components/annotations/ImageAnnotator";
import { AnnotationToolbar } from "@/components/annotations/AnnotationToolbar";
import type { Annotation, AnnotationGeometry } from "@/lib/annotation-types";
import { spacing } from "@/lib/ui/spacing";
import { cn } from "@/lib/utils";
import { BACK_LINK_CLASS } from "@/lib/constants/photoDefectsConstants";
import { isReviewer } from "@/lib/auth";
import { usePhotoDefects } from "@/hooks/usePhotoDefects";
import { usePhotoActions } from "@/hooks/usePhotoActions";
import { useDefectForm } from "@/hooks/useDefectForm";
import { useDefectActions } from "@/hooks/useDefectActions";
import { updatePhoto } from "@/lib/api/defects";
import { PRINT_TYPES } from "@/lib/constants/printTypes";
import type { Color } from "@/lib/types";
import {
  VerificationStatusBar,
  PhotoDescriptionSection,
  DefectFormPanel,
  AnnotationModeBar,
  DefectsList,
  EditDefectModal,
  DeleteDefectModal,
} from "@/components/photo-defects";

export function PhotoDefects() {
  const { photoId } = useParams<{ photoId: string }>();
  const navigate = useNavigate();

  const {
    photo,
    setPhoto,
    defects,
    setDefects,
    isLoading,
    loadError,
    photoPreviewUrl,
    loadDefects,
  } = usePhotoDefects(photoId);

  const {
    isSaving: photoSaving,
    actionError: photoActionError,
    isEditingDescription,
    descriptionText,
    setDescriptionText,
    handleVerification,
    handleEditDescription,
    handleSaveDescription,
    handleCancelDescription,
  } = usePhotoActions({ photoId, photo, setPhoto });

  const {
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
  } = useDefectForm();

  const {
    isSaving: defectSaving,
    actionError: defectActionError,
    deletingDefect,
    setDeletingDefect,
    handleCreate,
    handleUpdate,
    handleDelete,
    handleAnnotationUpdate,
    handleAnnotationDeletePermanent,
  } = useDefectActions({
    photoId,
    form,
    editingDefect,
    setEditingDefect,
    setDefects,
    setShowCreate,
    setIsDrawingMode,
    resetForm,
    loadDefects,
  });

  const [selectedAnnotation, setSelectedAnnotation] =
    useState<Annotation | null>(null);

  const annotationCardRef = useRef<HTMLDivElement>(null);

  const openCreateAndScroll = () => {
    openCreate();
    setTimeout(() => {
      annotationCardRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  };

  // Print tag state
  const [testColors, setTestColors] = useState<Color[]>([]);
  const [tagColorId, setTagColorId] = useState<number | null>(null);
  const [tagMethod, setTagMethod] = useState<string>("");
  const [tagSaving, setTagSaving] = useState(false);
  const [tagError, setTagError] = useState<string | null>(null);
  const [tagSaved, setTagSaved] = useState(false);
  const [hasUnsavedTagChanges, setHasUnsavedTagChanges] = useState(false);

  // Sync tag form from loaded photo (only if no unsaved changes)
  useEffect(() => {
    if (photo && !hasUnsavedTagChanges) {
      setTagColorId(photo.color_id ?? null);
      setTagMethod(photo.method ?? "");
    }
  }, [photo, hasUnsavedTagChanges]);

  // Fetch test colors when test_id is available
  useEffect(() => {
    const testId = photo?.test_id;
    if (!testId) return;
    fetch(`/api/v1/tests/${testId}`)
      .then((r) => r.json())
      .then((data) => {
        const rawColors: Array<{
          id: number;
          name: string;
          hex_value: string;
        }> = data.colors ?? [];
        setTestColors(
          rawColors.map((c) => ({
            id: c.id,
            name: c.name,
            hexValue: c.hex_value,
            isActive: true,
          })),
        );
      })
      .catch(() => {});
  }, [photo?.test_id]);

  const handleSaveTag = async () => {
    if (!photoId) return;
    setTagSaving(true);
    setTagError(null);
    setTagSaved(false);
    const prev = { color_id: photo?.color_id, method: photo?.method };
    // Optimistic update
    setPhoto((p) =>
      p ? { ...p, color_id: tagColorId, method: tagMethod || null } : p,
    );
    try {
      const updated = await updatePhoto(photoId, {
        color_id: tagColorId,
        method: tagMethod || null,
      });
      setPhoto((p) => (p ? { ...p, ...updated } : p));
      setHasUnsavedTagChanges(false); // Clear unsaved changes flag
      setTagSaved(true);
      setTimeout(() => setTagSaved(false), 2000);
    } catch {
      // Revert
      setPhoto((p) =>
        p ? { ...p, color_id: prev.color_id, method: prev.method } : p,
      );
      setTagError("Failed to save tag.");
    } finally {
      setTagSaving(false);
    }
  };

  const isSaving = photoSaving || defectSaving;
  const actionError = photoActionError || defectActionError;

  const isApproved = photo?.verification_status === "approved";
  const isRejected = photo?.verification_status === "rejected";

  const allAnnotations: Annotation[] = defects.flatMap(
    (defect) => defect.annotations || [],
  );

  const displayedAnnotations: Annotation[] =
    previewingDefect?.annotations ||
    editingDefect?.annotations ||
    allAnnotations;

  const annotationsForImageAnnotator = showCreate
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
            id: -(idx + 1 + (editingDefect.annotations?.length || 0)),
            defect_id: editingDefect.id as number,
            category_id: form.category_id,
            geometry: geom,
            color: form.color,
            created_at: new Date().toISOString(),
          })),
        ]
      : displayedAnnotations;

  const handleAnnotationUpdateWrapper = async (
    annotationId: number,
    geometry: AnnotationGeometry,
  ) => {
    const g = geometry as Annotation["geometry"];

    if (annotationId < 0) {
      const index = -annotationId - 1;
      handleAnnotationUpdateLocal(index, g);
      return;
    }
    await handleAnnotationUpdate(annotationId, g);
  };

  const handleEditToggleDrawMode = () => {
    setIsDrawingMode(!isDrawingMode);
    setIsMoveMode(false);
    if (!isDrawingMode) {
      setCurrentTool("rect");
    } else {
      setCurrentTool("select");
    }
  };

  const handleEditToggleMoveMode = () => {
    setIsMoveMode(!isMoveMode);
    setIsDrawingMode(false);
    setCurrentTool("select");
  };

  const handleEditDone = () => {
    if (form.annotations.length > 0) {
      handleUpdate();
    } else {
      setEditingDefect(null);
      setSelectedAnnotation(null);
      setIsMoveMode(false);
      setIsDrawingMode(false);
      setCurrentTool("select");
    }
  };

  if (!photoId) {
    return (
      <div
        className={cn(spacing.pageContainer, spacing.pageStack, "max-w-6xl")}
      >
        <button
          type="button"
          className={BACK_LINK_CLASS}
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

  return (
    <div className={cn(spacing.pageContainer, spacing.pageStack, "max-w-6xl")}>
      <button
        type="button"
        className={BACK_LINK_CLASS}
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

      {/* Verification Status Badge - Visible to all users */}
      {photo?.verification_status && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-600">
            Verification Status:
          </span>
          <Badge
            className={cn(
              "font-semibold",
              photo.verification_status === "approved" &&
                "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
              photo.verification_status === "rejected" &&
                "bg-red-100 text-red-800 hover:bg-red-100",
              photo.verification_status === "pending" &&
                "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
            )}
          >
            {photo.verification_status === "approved" && "✓ Approved"}
            {photo.verification_status === "rejected" && "✗ Rejected"}
            {photo.verification_status === "pending" && "Pending Review"}
          </Badge>
        </div>
      )}

      {/* Verification Controls - Only for reviewers */}
      {isReviewer() && (
        <VerificationStatusBar
          isApproved={isApproved}
          isRejected={isRejected}
          isSaving={photoSaving}
          onVerify={handleVerification}
        />
      )}

      <Card ref={annotationCardRef} className={spacing.cardShell}>
        <CardHeader className="p-0">
          <CardTitle className="px-5 py-4 text-lg font-semibold text-slate-900 md:px-6 md:py-5">
            Photo with Annotations
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-4 p-5 md:p-6">
            {showCreate && (
              <>
                <DefectFormPanel
                  form={form}
                  isSaving={isSaving}
                  onFormChange={setForm}
                  onCancel={cancelCreate}
                  onCreate={handleCreate}
                />
                <AnnotationToolbar
                  currentTool={currentTool}
                  onToolChange={setCurrentTool}
                  disabled={false}
                />
              </>
            )}

            {!showCreate && !editingDefect && (
              <AnnotationModeBar
                mode="idle"
                isMoveMode={isMoveMode}
                previewingDefect={previewingDefect}
                onToggleMove={() => setIsMoveMode(!isMoveMode)}
                onShowAll={() => setPreviewingDefect(null)}
              />
            )}

            {editingDefect && !showCreate && (
              <>
                <AnnotationModeBar
                  mode="edit"
                  isMoveMode={isMoveMode}
                  isDrawingMode={isDrawingMode}
                  editingDefect={editingDefect}
                  newAnnotationsCount={form.annotations.length}
                  onToggleMove={handleEditToggleMoveMode}
                  onToggleDraw={handleEditToggleDrawMode}
                  onDone={handleEditDone}
                />
                {isDrawingMode && (
                  <AnnotationToolbar
                    currentTool={currentTool}
                    onToolChange={setCurrentTool}
                    disabled={false}
                  />
                )}
              </>
            )}

            <ImageAnnotator
              imageUrl={photo?.url ?? photoPreviewUrl}
              annotations={annotationsForImageAnnotator}
              currentTool={showCreate || isDrawingMode ? currentTool : "select"}
              onAnnotationCreate={
                showCreate || isDrawingMode ? handleAnnotationCreate : undefined
              }
              onAnnotationSelect={setSelectedAnnotation}
              onAnnotationUpdate={handleAnnotationUpdateWrapper}
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

            <PhotoDescriptionSection
              description={photo?.description}
              isEditing={isEditingDescription}
              descriptionText={descriptionText}
              isSaving={isSaving}
              onEdit={handleEditDescription}
              onSave={handleSaveDescription}
              onCancel={handleCancelDescription}
              onDescriptionChange={setDescriptionText}
            />

            {/* Print Tag Panel */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div className="text-sm font-semibold text-slate-700">
                Print Tag
              </div>
              {testColors.length === 0 ? (
                <p className="text-xs text-slate-500">
                  No colors assigned to this test.
                </p>
              ) : (
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-600">
                      Color
                    </label>
                    <select
                      className="rounded border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={tagColorId ?? ""}
                      onChange={(e) => {
                        setTagColorId(
                          e.target.value ? Number(e.target.value) : null,
                        );
                        setHasUnsavedTagChanges(true);
                      }}
                    >
                      <option value="">None</option>
                      {testColors.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-600">
                      Method
                    </label>
                    <select
                      className="rounded border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={tagMethod}
                      onChange={(e) => {
                        setTagMethod(e.target.value);
                        setHasUnsavedTagChanges(true);
                      }}
                    >
                      <option value="">None</option>
                      {PRINT_TYPES.map((pt) => (
                        <optgroup key={pt.key} label={pt.label}>
                          {pt.methods.length > 1 && (
                            <option value={pt.key}>
                              {pt.label} – All methods
                            </option>
                          )}
                          {pt.methods.map((m) => (
                            <option key={m.key} value={m.key}>
                              {m.label}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    disabled={tagSaving}
                    onClick={handleSaveTag}
                    className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {tagSaving ? "Saving…" : "Save Tag"}
                  </button>
                  {tagSaved && (
                    <span className="text-xs font-medium text-green-600">
                      Saved!
                    </span>
                  )}
                  {tagError && (
                    <span className="text-xs font-medium text-red-600">
                      {tagError}
                    </span>
                  )}
                </div>
              )}
              {/* Current tag display */}
              {(photo?.color_id || photo?.method) && (
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <span className="font-medium">Current tag:</span>
                  {photo.color_id && testColors.length > 0 && (
                    <span className="flex items-center gap-1">
                      {(() => {
                        const c = testColors.find(
                          (x) => x.id === photo.color_id,
                        );
                        return c ? (
                          <>
                            <span
                              className="inline-block h-3 w-3 rounded-full border border-slate-300"
                              style={{ backgroundColor: c.hexValue }}
                            />
                            {c.name}
                          </>
                        ) : null;
                      })()}
                    </span>
                  )}
                  {photo.method && (
                    <span className="rounded bg-slate-200 px-1.5 py-0.5 font-mono">
                      {photo.method}
                    </span>
                  )}
                </div>
              )}
            </div>

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

      <DefectsList
        defects={defects}
        isLoading={isLoading}
        loadError={loadError}
        previewingDefect={previewingDefect}
        onPreview={setPreviewingDefect}
        onEdit={openEdit}
        onDelete={setDeletingDefect}
        onRetry={loadDefects}
        onAddDefect={openCreateAndScroll}
      />

      <EditDefectModal
        isOpen={!!editingDefect && !isDrawingMode}
        defect={editingDefect}
        form={form}
        isSaving={isSaving}
        actionError={actionError}
        onClose={() => {
          setEditingDefect(null);
          resetForm();
        }}
        onUpdate={handleUpdate}
        onFormChange={setForm}
        onStartDrawing={() => {
          setIsDrawingMode(true);
          setCurrentTool("rect");
        }}
        onDeleteAnnotation={handleAnnotationDeletePermanent}
        onRemoveNewAnnotation={handleAnnotationDelete}
      />

      <DeleteDefectModal
        isOpen={!!deletingDefect}
        isSaving={isSaving}
        actionError={actionError}
        onClose={() => setDeletingDefect(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}

import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageAnnotator } from "@/components/annotations/ImageAnnotator";
import { AnnotationToolbar } from "@/components/annotations/AnnotationToolbar";
import type { Annotation } from "@/lib/annotation-types";
import { spacing } from "@/lib/ui/spacing";
import { cn } from "@/lib/utils";
import { BACK_LINK_CLASS } from "@/lib/constants/photoDefectsConstants";
import { usePhotoDefects } from "@/hooks/usePhotoDefects";
import { usePhotoActions } from "@/hooks/usePhotoActions";
import { useDefectForm } from "@/hooks/useDefectForm";
import { useDefectActions } from "@/hooks/useDefectActions";
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
    geometry: unknown,
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

      <VerificationStatusBar
        isApproved={isApproved}
        isRejected={isRejected}
        isSaving={photoSaving}
        onVerify={handleVerification}
      />

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
        onAddDefect={openCreate}
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

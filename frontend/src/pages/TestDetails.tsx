import { useParams, useOutletContext, useNavigate } from "react-router-dom";
import type { AppDataContext } from "@/components/layout/AppShell";
import {
  useDeviceDetection,
  useTestDetailPhotos,
  useTestDelete,
  useTestUpdate,
} from "@/hooks";
import {
  TestNotFound,
  TestDetailHeader,
  TestInformationCard,
  PhotoGalleryCard,
  DefectsCard,
  MobileActionButtons,
  DesktopActionBar,
  DeleteConfirmModal,
  UpdateTestModal,
  PhotoSourceModal,
  CropModal,
  QCMatrixCard,
} from "@/components/tests";

export function TestDetails() {
  const { tests, addAuditEvent, removeTest, updateTest } =
    useOutletContext<AppDataContext>();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const test = tests.find((t) => t.id === id);
  const { isMobile } = useDeviceDetection();

  const { apiPhotos, setApiPhotos, photosWithDefects } =
    useTestDetailPhotos(id);

  const { isDeleting, showDeleteConfirm, setShowDeleteConfirm, handleDelete } =
    useTestDelete({
      testId: id,
      removeTest,
      addAuditEvent,
    });

  const {
    showUpdateModal,
    setShowUpdateModal,
    showPhotoModal,
    setShowPhotoModal,
    photoNotice,
    photosToDelete,
    setPhotosToDelete,
    newPhotoPreviews,
    draft,
    setDraft,
    colors,
    openUpdate,
    handlePhotoSelect,
    handleRemoveNewPhoto,
    handleRotateNewPhoto,
    handleOpenCropNewPhoto,
    handleApplyCropNewPhoto,
    handleUpdateSave,
    handleColorCreated,
    showCropModal,
    cropImageUrl,
    closeCropModal,
  } = useTestUpdate({
    test: test!,
    apiPhotos,
    setApiPhotos,
    updateTest,
    addAuditEvent,
  });

  if (!test) {
    return <TestNotFound />;
  }

  const handleOpenPhotoModal = () => {
    if (isMobile) {
      setShowPhotoModal(true);
    } else {
      document.getElementById("desktop-input")?.click();
    }
  };

  const handlePhotoSelectWithModalClose = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    handlePhotoSelect(e);
    setShowPhotoModal(false);
  };

  const handleOpenCamera = () => {
    navigate(`/tests/${id}/camera`);
  };

  return (
    <div
      className="test-details-page relative min-h-full bg-white pb-8 lg:pb-36"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <TestDetailHeader test={test} />

      <div className="mx-auto max-w-7xl px-6 md:px-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <section>
            <TestInformationCard test={test} />
          </section>

          <section className="space-y-8">
            <PhotoGalleryCard photos={apiPhotos} />
            <DefectsCard photosWithDefects={photosWithDefects} />
          </section>
        </div>

        {test.colors && test.colors.length > 0 && (
          <div className="mt-8">
            <QCMatrixCard
              testId={test.id}
              colors={test.colors.map((c) => ({ ...c, isActive: true }))}
              photos={apiPhotos}
              matrixColumns={test.matrixColumns ?? null}
            />
          </div>
        )}

        <MobileActionButtons
          onUpdate={openUpdate}
          onDelete={() => setShowDeleteConfirm(true)}
          onCamera={handleOpenCamera}
          isDeleting={isDeleting}
        />
      </div>

      <DesktopActionBar
        test={test}
        onUpdate={openUpdate}
        onDelete={() => setShowDeleteConfirm(true)}
        onCamera={handleOpenCamera}
        isDeleting={isDeleting}
      />

      <DeleteConfirmModal
        show={showDeleteConfirm}
        isDeleting={isDeleting}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
      />

      <UpdateTestModal
        show={showUpdateModal}
        isMobile={isMobile}
        draft={draft}
        colors={colors}
        apiPhotos={apiPhotos}
        photosToDelete={photosToDelete}
        newPhotoPreviews={newPhotoPreviews}
        photoNotice={photoNotice}
        onClose={() => setShowUpdateModal(false)}
        onSave={handleUpdateSave}
        onDraftChange={(updates) =>
          setDraft((prev) => ({ ...prev, ...updates }))
        }
        onOpenPhotoModal={handleOpenPhotoModal}
        onPhotoSelect={handlePhotoSelectWithModalClose}
        onRemoveExistingPhoto={(photoId) =>
          setPhotosToDelete((prev) => [...prev, photoId])
        }
        onRemoveNewPhoto={handleRemoveNewPhoto}
        onRotateNewPhoto={handleRotateNewPhoto}
        onCropNewPhoto={handleOpenCropNewPhoto}
        onColorCreated={handleColorCreated}
      />

      <PhotoSourceModal
        show={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        onCameraClick={() => document.getElementById("camera-input")?.click()}
        onGalleryClick={() => document.getElementById("gallery-input")?.click()}
      />

      {cropImageUrl && (
        <CropModal
          show={showCropModal}
          imageUrl={cropImageUrl}
          onClose={closeCropModal}
          onApply={handleApplyCropNewPhoto}
        />
      )}
    </div>
  );
}

import { useParams, useOutletContext } from "react-router-dom";
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
} from "@/components/tests";

export function TestDetails() {
  const { tests, addAuditEvent, removeTest, updateTest } =
    useOutletContext<AppDataContext>();
  const { id } = useParams<{ id: string }>();
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
    openUpdate,
    handlePhotoSelect,
    handleRemoveNewPhoto,
    handleUpdateSave,
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

  return (
    <div
      className="test-details-page relative min-h-full bg-white pb-8 md:pb-36"
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

        <MobileActionButtons
          onUpdate={openUpdate}
          onDelete={() => setShowDeleteConfirm(true)}
          isDeleting={isDeleting}
        />
      </div>

      <DesktopActionBar
        test={test}
        onUpdate={openUpdate}
        onDelete={() => setShowDeleteConfirm(true)}
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
      />

      <PhotoSourceModal
        show={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        onCameraClick={() => document.getElementById("camera-input")?.click()}
        onGalleryClick={() =>
          document.getElementById("gallery-input")?.click()
        }
      />
    </div>
  );
}

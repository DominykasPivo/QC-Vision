import { type FormEvent } from "react";
import { useOutletContext } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { spacing } from "@/lib/ui/spacing";
import { cn } from "@/lib/utils";
import { getStoredUsername } from "@/lib/auth";
import type { AppDataContext } from "@/components/layout/AppShell";
import { SUBMIT_BUTTON_CLASS } from "@/lib/constants";
import { rotateImageFile } from "@/lib/utils/image-rotation";
import { cropImageFile, type CropArea } from "@/lib/utils/image-crop";
import {
  useDeviceDetection,
  usePhotoUpload,
  usePhotoPreview,
  useCreateTestForm,
} from "@/hooks";
import { useCropModal } from "@/hooks/useCropModal";
import {
  TestFormFields,
  PhotoUploadButton,
  PhotoPreviewGrid,
  PhotoUploadModal,
  SuccessToast,
} from "@/components/tests";
import { CropModal } from "@/components/tests/CropModal";

export function CreateTest() {
  const { addAuditEvent, refreshTests } = useOutletContext<AppDataContext>();
  const loggedInUser = getStoredUsername();
  const { isMobile } = useDeviceDetection();

  const {
    selectedPhotos,
    photoNotice,
    showPhotoModal,
    cameraInputRef,
    galleryInputRef,
    desktopInputRef,
    handlePhotoSelect,
    handlePhotoButtonClick,
    handleRemovePhoto,
    setShowPhotoModal,
    clearPhotos,
    replacePhoto,
  } = usePhotoUpload();

  const { photoPreviews, rotatePhoto, getRotation, clearRotations } =
    usePhotoPreview(selectedPhotos);

  const {
    showCropModal,
    cropImageUrl,
    cropIndex,
    openCropModal,
    closeCropModal,
  } = useCropModal();

  const {
    formData,
    isLoading,
    error,
    showToast,
    colors,
    handleChange,
    handleTextareaChange,
    handleTestTypeChange,
    handleStatusChange,
    handleColorChange,
    handleColorCreated,
    handleSubmit,
  } = useCreateTestForm({
    loggedInUser,
    addAuditEvent,
    refreshTests,
    onPhotosClear: () => {
      clearPhotos();
      clearRotations();
    },
  });

  const handleRotatePhoto = async (index: number) => {
    rotatePhoto(index);
    const file = selectedPhotos[index];
    const rotation = (getRotation(file) + 90) % 360;

    // If rotation is not 0, apply it to the actual file
    if (rotation !== 0) {
      try {
        const rotatedFile = await rotateImageFile(file, rotation);
        replacePhoto(index, rotatedFile);
      } catch (error) {
        console.error("Failed to rotate image:", error);
      }
    }
  };

  const handleOpenCrop = (index: number) => {
    const preview = photoPreviews[index];
    if (preview?.url) {
      openCropModal(preview.url, index);
    }
  };

  const handleApplyCrop = async (cropArea: CropArea) => {
    if (cropIndex === null) return;

    try {
      const file = selectedPhotos[cropIndex];
      const croppedFile = await cropImageFile(file, cropArea);
      replacePhoto(cropIndex, croppedFile);
      closeCropModal();
    } catch (error) {
      console.error("Failed to crop image:", error);
      alert("Failed to crop image. Please try again.");
    }
  };

  const onSubmit = (e: FormEvent) => {
    handleSubmit(e, selectedPhotos);
  };

  return (
    <div
      className={cn(
        spacing.pageContainer,
        "min-h-[calc(100dvh-var(--header-height)-var(--nav-height))] pb-24 md:pb-8",
      )}
    >
      <div className="mx-auto w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 md:p-6">
          <div className="mb-6 md:mb-8">
            <h2 className="text-[30px] font-bold leading-tight tracking-[-0.02em] text-slate-900">
              Create Test
            </h2>
            <p className="mt-1 text-[18px] font-medium text-slate-500">
              Create a new quality control test
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              <div className="flex items-start gap-2">
                <svg
                  className="mt-0.5 h-4 w-4 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{error}</span>
              </div>
            </div>
          )}
          {photoNotice && (
            <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
              {photoNotice}
            </div>
          )}

          <form
            onSubmit={onSubmit}
            className={cn(spacing.fieldStack)}
            noValidate
          >
            <TestFormFields
              formData={formData}
              isLoading={isLoading}
              colors={colors}
              onInputChange={handleChange}
              onTextareaChange={handleTextareaChange}
              onTestTypeChange={handleTestTypeChange}
              onStatusChange={handleStatusChange}
              onColorChange={handleColorChange}
              onColorCreated={handleColorCreated}
            />

            <div className="space-y-3 md:space-y-4">
              <label
                className="text-base font-semibold text-slate-900 md:text-lg"
                htmlFor="photo-upload-button"
              >
                Photos (Optional)
              </label>

              <PhotoUploadButton
                onClick={() => handlePhotoButtonClick(isMobile)}
                disabled={isLoading}
                isMobile={isMobile}
                selectedCount={selectedPhotos.length}
              />

              <input
                ref={cameraInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                multiple
                className="upload-input"
                onChange={handlePhotoSelect}
                disabled={isLoading}
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="upload-input"
                onChange={handlePhotoSelect}
                disabled={isLoading}
              />
              <input
                ref={desktopInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="upload-input"
                onChange={handlePhotoSelect}
                disabled={isLoading}
              />

              <PhotoPreviewGrid
                photoPreviews={photoPreviews}
                onRemove={handleRemovePhoto}
                onRotate={handleRotatePhoto}
                onCrop={handleOpenCrop}
                disabled={isLoading}
              />
            </div>

            <div className={spacing.actionRow}>
              <Button
                type="submit"
                density="spacious"
                className={SUBMIT_BUTTON_CLASS}
                disabled={isLoading}
              >
                {isLoading ? "Creating..." : "Create Test"}
              </Button>
            </div>
          </form>
        </div>
      </div>

      <SuccessToast
        show={showToast}
        message="Test created successfully! Redirecting..."
      />

      <PhotoUploadModal
        show={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        onCameraClick={() => cameraInputRef.current?.click()}
        onGalleryClick={() => galleryInputRef.current?.click()}
      />

      {cropImageUrl && (
        <CropModal
          show={showCropModal}
          imageUrl={cropImageUrl}
          onClose={closeCropModal}
          onApply={handleApplyCrop}
        />
      )}
    </div>
  );
}

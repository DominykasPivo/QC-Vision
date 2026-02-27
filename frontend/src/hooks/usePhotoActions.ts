import { useState } from "react";
import { updateVerificationStatus, updatePhoto } from "@/lib/api/defects";
import type { PhotoRecord } from "@/lib/api/defects";

interface UsePhotoActionsParams {
  photoId?: string;
  photo: PhotoRecord | null;
  setPhoto: (photo: PhotoRecord) => void;
}

/**
 * Hook to manage photo verification and description updates
 */
export function usePhotoActions({
  photoId,
  photo,
  setPhoto,
}: UsePhotoActionsParams) {
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionText, setDescriptionText] = useState(
    photo?.description || "",
  );

  const handleVerification = async (status: string) => {
    if (!photoId || isSaving) return;
    setIsSaving(true);
    try {
      const updated = await updateVerificationStatus(photoId, status);
      setPhoto(updated);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Failed to update verification.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditDescription = () => {
    setIsEditingDescription(true);
  };

  const handleSaveDescription = async () => {
    if (!photoId || isSaving) return;
    setIsSaving(true);
    setActionError(null);
    try {
      const updated = await updatePhoto(photoId, {
        description: descriptionText,
      });
      setPhoto(updated);
      setIsEditingDescription(false);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Failed to update description.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelDescription = () => {
    setDescriptionText(photo?.description || "");
    setIsEditingDescription(false);
  };

  return {
    isSaving,
    actionError,
    setActionError,
    isEditingDescription,
    descriptionText,
    setDescriptionText,
    handleVerification,
    handleEditDescription,
    handleSaveDescription,
    handleCancelDescription,
  };
}

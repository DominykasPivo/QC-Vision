import { useState, useEffect } from "react";
import { type ApiPhoto } from "./useTestDetailPhotos";
import { usePhotoPreview } from "./usePhotoPreview";
import type { AppDataContext } from "@/components/layout/AppShell";
import type { TestStatus, TestType, Test } from "@/lib/db-constants";
import { TEST_STATUSES, TEST_TYPES } from "@/lib/db-constants";
import { fetchColors } from "@/lib/api/colors";
import type { Color } from "@/lib/types";
import { validateSelectedFiles } from "./test-update/photoValidation";
import { rotateImageFile } from "@/lib/utils/image-rotation";
import {
  deletePhotoById,
  updateTestById,
  uploadPhotoForTest,
  type UpdateTestPayload,
} from "./test-update/api";

interface UseTestUpdateParams {
  test: Test;
  apiPhotos: ApiPhoto[];
  setApiPhotos: React.Dispatch<React.SetStateAction<ApiPhoto[]>>;
  updateTest: AppDataContext["updateTest"];
  addAuditEvent: AppDataContext["addAuditEvent"];
}

/**
 * Hook to manage test update modal with draft state and photo management
 */
export function useTestUpdate({
  test,
  apiPhotos,
  setApiPhotos,
  updateTest,
  addAuditEvent,
}: UseTestUpdateParams) {
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoNotice, setPhotoNotice] = useState<string | null>(null);
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [photosToDelete, setPhotosToDelete] = useState<string[]>([]);
  const [colors, setColors] = useState<Color[]>([]);

  useEffect(() => {
    fetchColors()
      .then(setColors)
      .catch(() => {});
  }, []);

  const {
    photoPreviews: newPhotoPreviews,
    rotatePhoto,
    getRotation,
    clearRotations,
  } = usePhotoPreview(newPhotos);

  const [draft, setDraft] = useState({
    jiraId: test?.jiraId ?? "",
    productName: test?.productName ?? "",
    testType: (test?.testType ?? "incoming") as TestType,
    requester: test?.requester ?? "",
    assignedTo: test?.assignedTo ?? "",
    description: test?.description ?? "",
    deadline: test?.deadline ?? "",
    colorIds: test?.colorIds ?? [],
    status: (test?.status ?? "pending") as TestStatus,
  });

  const openUpdate = () => {
    const safeTestType = TEST_TYPES.includes(test.testType)
      ? test.testType
      : "incoming";
    const safeStatus = TEST_STATUSES.includes(test.status)
      ? test.status
      : "pending";
    const safeDeadline =
      test.deadline && test.deadline !== "None" ? test.deadline : "";
    setDraft({
      jiraId: test.jiraId ?? "",
      productName: test.productName ?? "",
      testType: safeTestType,
      requester: test.requester ?? "",
      assignedTo: test.assignedTo ?? "",
      description: test.description ?? "",
      deadline: safeDeadline,
      colorIds: test.colorIds ?? [],
      status: safeStatus,
    });
    setNewPhotos([]);
    setPhotosToDelete([]);
    setPhotoNotice(null);
    clearRotations();
    setShowUpdateModal(true);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) {
      return;
    }

    const validation = validateSelectedFiles(files);

    setPhotoNotice(validation.notice);
    if (!validation.reject) {
      setNewPhotos((prev) => [...prev, ...validation.acceptedFiles]);
    }
    e.target.value = "";
  };

  const handleRemoveNewPhoto = (index: number) => {
    setNewPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRotateNewPhoto = async (index: number) => {
    rotatePhoto(index);
    const file = newPhotos[index];
    const rotation = (getRotation(file) + 90) % 360;

    // If rotation is not 0, apply it to the actual file
    if (rotation !== 0) {
      try {
        const rotatedFile = await rotateImageFile(file, rotation);
        setNewPhotos((prev) => {
          const updated = [...prev];
          updated[index] = rotatedFile;
          return updated;
        });
      } catch (error) {
        console.error("Failed to rotate image:", error);
      }
    }
  };

  const handleUpdateSave = async () => {
    try {
      if (photosToDelete.length > 0) {
        for (const photoIdStr of photosToDelete) {
          const apiPhoto = apiPhotos.find(
            (p) => p.id.toString() === photoIdStr,
          );
          if (apiPhoto) {
            try {
              const response = await deletePhotoById(apiPhoto.id);
              if (response.ok) {
                setApiPhotos((prev) =>
                  prev.filter((p) => p.id !== apiPhoto.id),
                );
              } else {
                const errorText = await response.text();
                console.error(
                  `Failed to delete photo ${apiPhoto.id}:`,
                  errorText,
                );
              }
            } catch (error) {
              console.error(`Error deleting photo ${apiPhoto.id}:`, error);
            }
          }
        }
      }

      const updateData: UpdateTestPayload = {
        jira_id: draft.jiraId.trim(),
        product_name: draft.productName.trim(),
        test_type: draft.testType,
        requester: draft.requester.trim(),
        assigned_to: draft.assignedTo.trim() || null,
        description: draft.description.trim() || null,
        color_ids: draft.colorIds,
        status: draft.status,
        deadline_at: draft.deadline
          ? new Date(draft.deadline).toISOString()
          : null,
      };

      const response = await updateTestById(test.id, updateData);
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Update error:", errorData);
        throw new Error(errorData.detail || "Failed to update test");
      }

      await response.json();

      // Map color IDs to full color objects for the QC Matrix
      const selectedColors = draft.colorIds
        .map((id) => colors.find((c) => c.id === id))
        .filter((c): c is Color => c !== undefined)
        .map((c) => ({ id: c.id, name: c.name, hexValue: c.hexValue }));

      updateTest(test.id, {
        jiraId: draft.jiraId.trim(),
        productName: draft.productName.trim(),
        testType: draft.testType,
        requester: draft.requester.trim(),
        assignedTo: draft.assignedTo.trim() || undefined,
        description: draft.description.trim() || null,
        colorIds: draft.colorIds,
        colors: selectedColors,
        deadline: draft.deadline,
        status: draft.status,
      });

      if (newPhotos.length > 0) {
        for (const file of newPhotos) {
          const photoResponse = await uploadPhotoForTest(test.id, file);
          if (photoResponse.ok) {
            const photoData = await photoResponse.json();

            setApiPhotos((prev) => [
              ...prev,
              {
                ...photoData,
                url: `/api/v1/photos/${photoData.id}/image?t=${Date.now()}`,
              },
            ]);
          } else {
            const errorText = await photoResponse.text();
            console.error(`Failed to upload ${file.name}:`, errorText);
          }
        }
      }

      addAuditEvent({
        id: `audit-${Date.now()}`,
        event: `Updated Test ${test.id}`,
        timestamp: new Date().toISOString(),
      });

      setShowUpdateModal(false);
    } catch (error) {
      console.error("Failed to update test:", error);
      alert(
        `Failed to update test: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  const handleColorCreated = (color: Color) => {
    setColors((prev) => [...prev, color]);
  };

  return {
    showUpdateModal,
    setShowUpdateModal,
    showPhotoModal,
    setShowPhotoModal,
    photoNotice,
    newPhotos,
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
    handleUpdateSave,
    handleColorCreated,
  };
}

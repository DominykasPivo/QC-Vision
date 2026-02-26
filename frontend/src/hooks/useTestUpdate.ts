import { useEffect, useState } from "react";
import { type ApiPhoto } from "./useTestDetailPhotos";
import { usePhotoPreview } from "./usePhotoPreview";
import { MAX_TOTAL_PHOTOS } from "@/lib/constants/testDetailsConstants";
import type { AppDataContext } from "@/components/layout/AppShell";
import type { TestStatus, TestType, Test } from "@/lib/db-constants";
import { TEST_STATUSES, TEST_TYPES } from "@/lib/db-constants";

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

  const newPhotoPreviews = usePhotoPreview(newPhotos);

  const [draft, setDraft] = useState({
    jiraId: test?.jiraId ?? "",
    productName: test?.productName ?? "",
    testType: (test?.testType ?? "incoming") as TestType,
    requester: test?.requester ?? "",
    assignedTo: test?.assignedTo ?? "",
    description: test?.description ?? "",
    deadline: test?.deadline ?? "",
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
      status: safeStatus,
    });
    setNewPhotos([]);
    setPhotosToDelete([]);
    setPhotoNotice(null);
    setShowUpdateModal(true);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) {
      return;
    }

    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    const ALLOWED_FORMATS = ["image/jpeg", "image/png", "image/webp"];

    const invalidTypeFiles = files.filter(
      (file) => !file.type.startsWith("image/"),
    );
    if (invalidTypeFiles.length > 0) {
      setPhotoNotice(`File must be an image`);
      e.target.value = "";
      return;
    }

    const invalidFormatFiles = files.filter(
      (file) => !ALLOWED_FORMATS.includes(file.type),
    );
    if (invalidFormatFiles.length > 0) {
      setPhotoNotice(`Unsupported format. Allowed: JPEG, PNG, WEBP`);
      e.target.value = "";
      return;
    }

    const oversizedFiles = files.filter((file) => file.size > MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      setPhotoNotice(`File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`);
      e.target.value = "";
      return;
    }

    const emptyFiles = files.filter((file) => file.size === 0);
    if (emptyFiles.length > 0) {
      setPhotoNotice(`File is empty`);
      e.target.value = "";
      return;
    }

    const currentPhotoCount = apiPhotos.length - photosToDelete.length;
    const remaining = Math.max(
      0,
      MAX_TOTAL_PHOTOS - currentPhotoCount - newPhotos.length,
    );
    if (remaining <= 0) {
      setPhotoNotice(
        `You can upload up to ${MAX_TOTAL_PHOTOS} photos total.`,
      );
      e.target.value = "";
      return;
    }
    const nextFiles = files.slice(0, remaining);
    if (files.length > remaining) {
      setPhotoNotice(
        `You can upload up to ${MAX_TOTAL_PHOTOS} photos total. Extra files were not added.`,
      );
    } else {
      setPhotoNotice(null);
    }
    setNewPhotos((prev) => [...prev, ...nextFiles]);
    e.target.value = "";
  };

  const handleRemoveNewPhoto = (index: number) => {
    setNewPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateSave = async () => {
    console.log("Update button clicked");
    console.log("Photos to delete:", photosToDelete);
    console.log("New photos:", newPhotos);
    console.log("Draft data:", draft);

    try {
      if (photosToDelete.length > 0) {
        console.log("Deleting photos...");
        for (const photoIdStr of photosToDelete) {
          const apiPhoto = apiPhotos.find(
            (p) => p.id.toString() === photoIdStr,
          );
          if (apiPhoto) {
            try {
              console.log(`Deleting photo ${apiPhoto.id}`);
              const response = await fetch(`/api/v1/photos/${apiPhoto.id}`, {
                method: "DELETE",
              });

              console.log(
                `Delete photo ${apiPhoto.id} response:`,
                response.status,
              );
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

      console.log("Updating test...");
      const updateData = {
        jira_id: draft.jiraId.trim(),
        product_name: draft.productName.trim(),
        test_type: draft.testType,
        requester: draft.requester.trim(),
        assigned_to: draft.assignedTo.trim() || null,
        description: draft.description.trim() || null,
        status: draft.status,
        deadline_at: draft.deadline
          ? new Date(draft.deadline).toISOString()
          : null,
      };

      console.log("Update data:", updateData);

      const response = await fetch(`/api/v1/tests/${test.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      console.log("Update test response:", response.status);
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Update error:", errorData);
        throw new Error(errorData.detail || "Failed to update test");
      }

      const updatedTest = await response.json();
      console.log("Updated test:", updatedTest);

      updateTest(test.id, {
        jiraId: draft.jiraId.trim(),
        productName: draft.productName.trim(),
        testType: draft.testType,
        requester: draft.requester.trim(),
        assignedTo: draft.assignedTo.trim() || undefined,
        description: draft.description.trim() || null,
        deadline: draft.deadline,
        status: draft.status,
      });

      if (newPhotos.length > 0) {
        console.log("Uploading new photos...");
        for (const file of newPhotos) {
          const formData = new FormData();
          formData.append("file", file);

          console.log(`Uploading ${file.name}`);
          const photoResponse = await fetch(
            `/api/v1/photos/upload?test_id=${test.id}`,
            {
              method: "POST",
              body: formData,
            },
          );

          console.log(
            `Upload photo ${file.name} response:`,
            photoResponse.status,
          );
          if (photoResponse.ok) {
            const photoData = await photoResponse.json();
            console.log("Photo uploaded:", photoData);

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
    openUpdate,
    handlePhotoSelect,
    handleRemoveNewPhoto,
    handleUpdateSave,
  };
}

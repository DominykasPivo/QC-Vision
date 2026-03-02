import { useState, useEffect, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  buildTestSubmitFormData,
  createEmptyTestForm,
  type TestFormData,
} from "@/lib/forms/test-form";
import { createTest as createTestAPI } from "@/lib/api/tests";
import { fetchColors } from "@/lib/api/colors";
import type { Color } from "@/lib/types";
import type { TestStatus, TestType } from "@/lib/db-constants";
import type { AppDataContext } from "@/components/layout/AppShell";

interface UseCreateTestFormParams {
  loggedInUser: string;
  addAuditEvent: AppDataContext["addAuditEvent"];
  refreshTests: AppDataContext["refreshTests"];
  onPhotosClear: () => void;
}

/**
 * Hook to manage test creation form state and submission
 */
export function useCreateTestForm({
  loggedInUser,
  addAuditEvent,
  refreshTests,
  onPhotosClear,
}: UseCreateTestFormParams) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<TestFormData>(
    createEmptyTestForm(loggedInUser),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [colors, setColors] = useState<Color[]>([]);

  useEffect(() => {
    fetchColors()
      .then(setColors)
      .catch(() => {});
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, description: e.target.value }));
  };

  const handleTestTypeChange = (value: string) => {
    setFormData((prev) => ({ ...prev, testType: value as TestType }));
  };

  const handleStatusChange = (value: string) => {
    setFormData((prev) => ({ ...prev, status: value as TestStatus }));
  };

  const handleColorChange = (value: number[]) => {
    setFormData((prev) => ({ ...prev, colorIds: value }));
  };

  const handleSubmit = async (e: FormEvent, selectedPhotos: File[]) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.jiraId.trim()) {
        setError("Jira ID is required");
        setIsLoading(false);
        return;
      }
      if (!formData.productName.trim()) {
        setError("Product Name is required");
        setIsLoading(false);
        return;
      }
      if (!formData.testType.trim()) {
        setError("Test Type is required");
        setIsLoading(false);
        return;
      }

      // Build form data for submission
      const submitFormData = buildTestSubmitFormData(formData, selectedPhotos);

      // Create test via API
      const result = await createTestAPI(submitFormData);

      const createdTestId = result?.test?.id
        ? String(result.test.id)
        : "unknown";

      addAuditEvent({
        id: `audit-${Date.now()}`,
        event: `Created test ${createdTestId}`,
        timestamp: new Date().toISOString(),
      });

      // Refresh tests from API to show the new test
      await refreshTests();

      // Show success toast
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
        navigate("/tests");
      }, 2000);

      // Reset form
      setFormData(createEmptyTestForm(loggedInUser));
      onPhotosClear();
    } catch (err) {
      // Extract error message from various error formats
      let errorMessage = "Failed to create test";
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === "string") {
        errorMessage = err;
      } else if (err && typeof err === "object" && "detail" in err) {
        errorMessage = String(err.detail);
      }
      setError(errorMessage);
      console.error("Error creating test:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return {
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
    handleSubmit,
  };
}

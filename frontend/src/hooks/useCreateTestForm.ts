import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  buildTestSubmitFormData,
  createEmptyTestForm,
  type TestFormData,
} from "@/lib/forms/test-form";
import { createTest as createTestAPI } from "@/lib/api/tests";
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

  const handleSubmit = async (e: FormEvent, selectedPhotos: File[]) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Build form data for submission
      const submitFormData = buildTestSubmitFormData(formData, selectedPhotos);

      // Create test via API
      const result = await createTestAPI(submitFormData);
      console.log("Test created:", result);

      const createdTestId = result?.test?.id
        ? String(result.test.id)
        : "unknown";

      addAuditEvent({
        id: `audit-${Date.now()}`,
        event: `Created test ${createdTestId}`,
        timestamp: new Date().toISOString(),
      });

      // Refresh tests from API to show the new test
      console.log("Refreshing tests...");
      await refreshTests();
      console.log("Tests refreshed successfully");

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
      setError(err instanceof Error ? err.message : "Failed to create test");
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
    handleChange,
    handleTextareaChange,
    handleTestTypeChange,
    handleStatusChange,
    handleSubmit,
  };
}

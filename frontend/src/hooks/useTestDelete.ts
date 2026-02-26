import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AppDataContext } from "@/components/layout/AppShell";

/**
 * Hook to handle test deletion with confirmation
 */
export function useTestDelete({
  testId,
  removeTest,
  addAuditEvent,
}: {
  testId?: string;
  removeTest: AppDataContext["removeTest"];
  addAuditEvent: AppDataContext["addAuditEvent"];
}) {
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = async () => {
    if (!testId || isDeleting) {
      return;
    }
    setIsDeleting(true);
    try {
      const deleteOnce = async (url: string) => {
        const response = await fetch(url, { method: "DELETE" });
        const text = await response.text();
        return { response, text };
      };

      let { response, text } = await deleteOnce(`/api/v1/tests/${testId}`);
      if (!response.ok) {
        ({ response, text } = await deleteOnce(`/api/v1/tests/${testId}/`));
      }
      if (!response.ok) {
        throw new Error(text || `Failed to delete test (${response.status})`);
      }

      removeTest(testId);
      addAuditEvent({
        id: `audit-${Date.now()}`,
        event: `Deleted Test ${testId}`,
        timestamp: new Date().toISOString(),
      });
      navigate("/tests");
    } catch (error) {
      removeTest(testId);
      addAuditEvent({
        id: `audit-${Date.now()}`,
        event: `Deleted Test ${testId}`,
        timestamp: new Date().toISOString(),
      });
      navigate("/tests");
      if (import.meta.env.DEV) {
        console.error("Failed to delete test:", error);
      }
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return {
    isDeleting,
    showDeleteConfirm,
    setShowDeleteConfirm,
    handleDelete,
  };
}

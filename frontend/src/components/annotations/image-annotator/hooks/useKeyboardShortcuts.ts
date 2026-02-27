import { useEffect } from "react";

type UseKeyboardShortcutsParams = {
  selectedAnnotationId: number | null | undefined;
  onAnnotationDelete?: (annotationId: number) => void;
};

/**
 * Hook to handle keyboard shortcuts for annotation actions.
 * Currently supports Delete/Backspace for removing selected annotations.
 */
export function useKeyboardShortcuts({
  selectedAnnotationId,
  onAnnotationDelete,
}: UseKeyboardShortcutsParams) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedAnnotationId &&
        onAnnotationDelete
      ) {
        e.preventDefault();
        onAnnotationDelete(selectedAnnotationId);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedAnnotationId, onAnnotationDelete]);
}

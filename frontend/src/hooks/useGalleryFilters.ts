import { useState, useMemo } from "react";

export interface GalleryFilters {
  severity: string;
  category: string;
  testType: string;
  testStatus: string;
  hasDefects: string;
  verification: string;
}

/**
 * Custom hook for managing gallery filter state
 */
export function useGalleryFilters() {
  const [severityFilter, setSeverityFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [testTypeFilter, setTestTypeFilter] = useState("");
  const [testStatusFilter, setTestStatusFilter] = useState("");
  const [hasDefectsFilter, setHasDefectsFilter] = useState("");
  const [verificationFilter, setVerificationFilter] = useState("");

  const filters: GalleryFilters = {
    severity: severityFilter,
    category: categoryFilter,
    testType: testTypeFilter,
    testStatus: testStatusFilter,
    hasDefects: hasDefectsFilter,
    verification: verificationFilter,
  };

  const clearAllFilters = () => {
    setSeverityFilter("");
    setCategoryFilter("");
    setTestTypeFilter("");
    setTestStatusFilter("");
    setHasDefectsFilter("");
    setVerificationFilter("");
  };

  const hasActiveFilters = Boolean(
    severityFilter ||
    categoryFilter ||
    testTypeFilter ||
    testStatusFilter ||
    hasDefectsFilter ||
    verificationFilter,
  );

  const hasAdvancedFilters = Boolean(
    severityFilter ||
    categoryFilter ||
    testTypeFilter ||
    hasDefectsFilter ||
    verificationFilter,
  );

  // Convert to API filter format - memoized to prevent unnecessary re-renders
  const apiFilters = useMemo(
    () => ({
      severity: severityFilter || undefined,
      category_id: categoryFilter ? Number(categoryFilter) : undefined,
      test_type: testTypeFilter || undefined,
      test_status: testStatusFilter || undefined,
      has_defects: hasDefectsFilter ? hasDefectsFilter === "true" : undefined,
      verification_status: verificationFilter || undefined,
    }),
    [
      severityFilter,
      categoryFilter,
      testTypeFilter,
      testStatusFilter,
      hasDefectsFilter,
      verificationFilter,
    ],
  );

  return {
    filters,
    apiFilters,
    hasActiveFilters,
    hasAdvancedFilters,
    clearAllFilters,
    // Individual setters
    setSeverityFilter,
    setCategoryFilter,
    setTestTypeFilter,
    setTestStatusFilter,
    setHasDefectsFilter,
    setVerificationFilter,
  };
}

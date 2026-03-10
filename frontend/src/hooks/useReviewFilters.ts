import { useState, useMemo } from "react";

export interface ReviewFilters {
  severity: string;
  category: string;
  testType: string;
  testStatus: string;
  hasDefects: string;
  verificationStatus: string;
  reviewStatus: string;
}

/**
 * Custom hook for managing review page filter state
 */
export function useReviewFilters() {
  const [severityFilter, setSeverityFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [testTypeFilter, setTestTypeFilter] = useState("");
  const [testStatusFilter, setTestStatusFilter] = useState("");
  const [hasDefectsFilter, setHasDefectsFilter] = useState("");
  const [verificationStatusFilter, setVerificationStatusFilter] = useState("");
  const [reviewStatusFilter, setReviewStatusFilter] = useState("");

  const filters: ReviewFilters = {
    severity: severityFilter,
    category: categoryFilter,
    testType: testTypeFilter,
    testStatus: testStatusFilter,
    hasDefects: hasDefectsFilter,
    verificationStatus: verificationStatusFilter,
    reviewStatus: reviewStatusFilter,
  };

  const clearAllFilters = () => {
    setSeverityFilter("");
    setCategoryFilter("");
    setTestTypeFilter("");
    setTestStatusFilter("");
    setHasDefectsFilter("");
    setVerificationStatusFilter("");
    setReviewStatusFilter("");
  };

  const hasActiveFilters = Boolean(
    severityFilter ||
    categoryFilter ||
    testTypeFilter ||
    testStatusFilter ||
    hasDefectsFilter ||
    verificationStatusFilter ||
    reviewStatusFilter,
  );

  const hasAdvancedFilters = Boolean(
    severityFilter ||
    categoryFilter ||
    testTypeFilter ||
    hasDefectsFilter ||
    verificationStatusFilter,
  );

  // Convert to API filter format and client-side filter format - memoized to prevent unnecessary re-renders
  const apiFilters = useMemo(
    () => ({
      severity: severityFilter || undefined,
      category_id: categoryFilter ? Number(categoryFilter) : undefined,
      test_type: testTypeFilter || undefined,
      test_status: testStatusFilter || undefined,
      has_defects: hasDefectsFilter ? hasDefectsFilter === "true" : undefined,
      verification_status: verificationStatusFilter || undefined,
      review_status: reviewStatusFilter || undefined,
    }),
    [
      severityFilter,
      categoryFilter,
      testTypeFilter,
      testStatusFilter,
      hasDefectsFilter,
      verificationStatusFilter,
      reviewStatusFilter,
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
    setVerificationStatusFilter,
    setReviewStatusFilter,
  };
}

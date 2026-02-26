import { useState, useCallback } from "react";
import { DEFAULT_SORT } from "@/lib/constants/testsListConstants";

export function useTestsListFilters() {
  const [statusFilter, setStatusFilter] = useState("");
  const [testTypeFilter, setTestTypeFilter] = useState("");
  const [assignedToFilter, setAssignedToFilter] = useState("");
  const [dateRangeFilter, setDateRangeFilter] = useState("");
  const [sortBy, setSortBy] = useState(DEFAULT_SORT);

  const hasActiveFilters =
    Boolean(statusFilter) ||
    Boolean(testTypeFilter) ||
    Boolean(assignedToFilter) ||
    Boolean(dateRangeFilter) ||
    sortBy !== DEFAULT_SORT;

  const clearAllFilters = useCallback(() => {
    setStatusFilter("");
    setTestTypeFilter("");
    setAssignedToFilter("");
    setDateRangeFilter("");
    setSortBy(DEFAULT_SORT);
  }, []);

  return {
    filters: {
      status: statusFilter,
      testType: testTypeFilter,
      assignedTo: assignedToFilter,
      dateRange: dateRangeFilter,
      sortBy,
    },
    hasActiveFilters,
    clearAllFilters,
    setStatusFilter,
    setTestTypeFilter,
    setAssignedToFilter,
    setDateRangeFilter,
    setSortBy,
  };
}

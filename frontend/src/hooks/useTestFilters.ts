import { useState } from "react";
import type { DateRangeFilter } from "@/lib/utils/tests";

export interface TestFilters {
  status: string;
  testType: string;
  assignedTo: string;
  dateRange: DateRangeFilter;
}

/**
 * Custom hook for managing test filter state
 */
export function useTestFilters() {
  const [statusFilter, setStatusFilter] = useState("");
  const [testTypeFilter, setTestTypeFilter] = useState("");
  const [assignedToFilter, setAssignedToFilter] = useState("");
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeFilter>("");

  const filters: TestFilters = {
    status: statusFilter,
    testType: testTypeFilter,
    assignedTo: assignedToFilter,
    dateRange: dateRangeFilter,
  };

  const updateFilter = (filterName: keyof TestFilters, value: string) => {
    switch (filterName) {
      case "status":
        setStatusFilter(value);
        break;
      case "testType":
        setTestTypeFilter(value);
        break;
      case "assignedTo":
        setAssignedToFilter(value);
        break;
      case "dateRange":
        setDateRangeFilter(value as DateRangeFilter);
        break;
    }
  };

  const clearFilters = () => {
    setStatusFilter("");
    setTestTypeFilter("");
    setAssignedToFilter("");
    setDateRangeFilter("");
  };

  const hasActiveFilters = Boolean(
    statusFilter || testTypeFilter || assignedToFilter || dateRangeFilter
  );

  return {
    filters,
    updateFilter,
    clearFilters,
    hasActiveFilters,
    // Individual setters for direct use
    setStatusFilter,
    setTestTypeFilter,
    setAssignedToFilter,
    setDateRangeFilter,
  };
}

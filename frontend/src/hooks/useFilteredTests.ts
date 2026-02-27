import { useMemo } from "react";
import {
  tokenizeSearchQuery,
  createSearchableText,
  matchesAllTokens,
  isInDateRange,
  sortTests,
  type SortableTest,
  type SortOption,
  type DateRangeFilter,
} from "@/lib/utils/tests";
import { STATUS_LABELS } from "@/lib/constants";
import type { TestStatus } from "@/lib/db-constants";

export interface FilterableTest extends SortableTest {
  id: string | number;
  jiraId?: string | null;
  productName?: string | null;
  testType: string;
  requester?: string | null;
  assignedTo?: string | null;
  deadline?: string | null;
  deadlineAt?: string | null;
  status: TestStatus;
  createdAt?: string | null;
}

export interface FilterOptions {
  searchQuery: string;
  statusFilter: string;
  testTypeFilter: string;
  assignedToFilter: string;
  dateRangeFilter: DateRangeFilter;
  sortBy: SortOption;
}

/**
 * Custom hook that filters and sorts tests based on multiple criteria
 * @param tests - Array of tests to filter
 * @param options - Filter and sort options
 */
export function useFilteredTests<T extends FilterableTest>(
  tests: T[],
  options: FilterOptions
): T[] {
  const {
    searchQuery,
    statusFilter,
    testTypeFilter,
    assignedToFilter,
    dateRangeFilter,
    sortBy,
  } = options;

  return useMemo(() => {
    const tokens = tokenizeSearchQuery(searchQuery);

    // Apply filters
    const filtered = tests.filter((test) => {
      // Status filter
      if (statusFilter && test.status !== statusFilter) {
        return false;
      }

      // Test type filter
      if (testTypeFilter && test.testType !== testTypeFilter) {
        return false;
      }

      // Assigned to filter
      if (assignedToFilter) {
        const assignedTo = test.assignedTo?.toLowerCase() || "";
        if (!assignedTo.includes(assignedToFilter.toLowerCase())) {
          return false;
        }
      }

      // Date range filter
      if (!isInDateRange(test.deadlineAt ?? null, dateRangeFilter)) {
        return false;
      }

      // Search query filter
      if (tokens.length > 0) {
        const haystack = createSearchableText([
          test.id,
          test.jiraId ?? null,
          test.productName ?? null,
          test.testType,
          test.requester ?? null,
          test.assignedTo ?? null,
          test.deadline ?? null,
          test.status,
          STATUS_LABELS[test.status],
        ]);

        if (!matchesAllTokens(haystack, tokens)) {
          return false;
        }
      }

      return true;
    });

    // Apply sorting
    return sortTests(filtered, sortBy);
  }, [
    tests,
    searchQuery,
    statusFilter,
    testTypeFilter,
    assignedToFilter,
    dateRangeFilter,
    sortBy,
  ]);
}

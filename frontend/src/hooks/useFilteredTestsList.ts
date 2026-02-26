import { useMemo } from "react";
import { formatEnumLabel } from "@/lib/db-constants";
import type { Test } from "@/lib/db-constants";
import { isInDateRange } from "@/lib/utils/tests/dateFiltersTestsList";
import { sortTests } from "@/lib/utils/tests/testSortingList";

interface FilterOptions {
  status: string;
  testType: string;
  assignedTo: string;
  dateRange: string;
  sortBy: string;
}

export function useFilteredTestsList(
  tests: Test[],
  searchQuery: string,
  filters: FilterOptions
) {
  const { status, testType, assignedTo, dateRange, sortBy } = filters;

  return useMemo(() => {
    const normalizedQuery = searchQuery.toLowerCase();
    const tokens = normalizedQuery.split(/\s+/).filter(Boolean);

    const filtered = tests.filter((test) => {
      if (status && test.status !== status) return false;
      if (testType && test.testType !== testType) return false;

      if (assignedTo) {
        const assignedToValue = test.assignedTo?.toLowerCase() || "";
        if (!assignedToValue.includes(assignedTo.toLowerCase())) return false;
      }

      if (!isInDateRange(test.deadlineAt ?? null, dateRange)) return false;

      if (tokens.length === 0) return true;

      const haystack = [
        test.id,
        test.jiraId,
        test.productName,
        test.testType,
        test.requester,
        test.assignedTo || "",
        test.deadline || "",
        test.status,
        formatEnumLabel(test.status),
      ]
        .join(" ")
        .toLowerCase();

      return tokens.every((token) => haystack.includes(token));
    });

    return sortTests(filtered, sortBy);
  }, [tests, searchQuery, status, testType, assignedTo, dateRange, sortBy]);
}

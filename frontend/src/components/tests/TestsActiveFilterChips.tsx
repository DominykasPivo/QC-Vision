import { Button } from "@/components/ui/button";
import { formatEnumLabel, type TestStatus } from "@/lib/db-constants";
import { STATUS_FILTER_CHIP_CLASS, DEFAULT_SORT } from "@/lib/constants/testsListConstants";

interface TestsActiveFilterChipsProps {
  searchQuery: string;
  statusFilter: string;
  testTypeFilter: string;
  assignedToFilter: string;
  dateRangeFilter: string;
  sortBy: string;
  onClearAll: () => void;
}

export function TestsActiveFilterChips({
  searchQuery,
  statusFilter,
  testTypeFilter,
  assignedToFilter,
  dateRangeFilter,
  sortBy,
  onClearAll,
}: TestsActiveFilterChipsProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-sm font-semibold text-slate-600">Active filters:</span>

      {searchQuery && (
        <span className="rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
          Search: "{searchQuery}"
        </span>
      )}

      {statusFilter && (
        <span
          className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
            STATUS_FILTER_CHIP_CLASS[statusFilter as TestStatus]
          }`}
        >
          Status: {formatEnumLabel(statusFilter)}
        </span>
      )}

      {testTypeFilter && (
        <span className="rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
          Type: {formatEnumLabel(testTypeFilter)}
        </span>
      )}

      {assignedToFilter && (
        <span className="rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
          Assigned: {assignedToFilter}
        </span>
      )}

      {dateRangeFilter && (
        <span className="rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
          Deadline: {formatEnumLabel(dateRangeFilter)}
        </span>
      )}

      {sortBy !== DEFAULT_SORT && (
        <span className="rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
          Sorted
        </span>
      )}

      <Button
        type="button"
        variant="outline"
        className="h-8 rounded-full border border-slate-300 bg-slate-50 px-3 text-xs font-semibold text-slate-700"
        onClick={onClearAll}
      >
        Clear All
      </Button>
    </div>
  );
}

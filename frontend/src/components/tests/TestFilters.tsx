import {
  formatEnumLabel,
  TEST_STATUSES,
  TEST_TYPES,
  type TestStatus,
} from "@/lib/db-constants";
import {
  STATUS_LABELS,
  SORT_OPTIONS,
  DATE_RANGE_OPTIONS,
} from "@/lib/constants";
import { FilterSelect } from "@/components/filters/FilterSelect";
import { FilterInput } from "@/components/filters/FilterInput";
import type { DateRangeFilter, SortOption } from "@/lib/utils/tests";

interface TestFiltersProps {
  statusFilter: string;
  testTypeFilter: string;
  assignedToFilter: string;
  dateRangeFilter: DateRangeFilter;
  sortBy: SortOption;
  onStatusChange: (value: string) => void;
  onTestTypeChange: (value: string) => void;
  onAssignedToChange: (value: string) => void;
  onDateRangeChange: (value: DateRangeFilter) => void;
  onSortChange: (value: SortOption) => void;
  onPageReset: () => void;
}

export function TestFilters({
  statusFilter,
  testTypeFilter,
  assignedToFilter,
  dateRangeFilter,
  sortBy,
  onStatusChange,
  onTestTypeChange,
  onAssignedToChange,
  onDateRangeChange,
  onSortChange,
  onPageReset,
}: TestFiltersProps) {
  return (
    <div className="hidden flex-wrap gap-3 xl:gap-4 lg:flex">
      {/* Status Filter */}
      <FilterSelect
        value={statusFilter}
        placeholder="All Statuses"
        options={TEST_STATUSES.map((status) => ({
          value: status,
          label: STATUS_LABELS[status as TestStatus],
        }))}
        onChange={(value) => {
          onStatusChange(value);
          onPageReset();
        }}
        className="h-11 w-full rounded-full border border-[#BFD2F8] bg-[#EAF1FF] px-5 text-sm font-semibold text-[#1D4ED8] sm:w-auto lg:h-[52px] lg:px-6 lg:text-[16px]"
      />

      {/* Test Type Filter */}
      <FilterSelect
        value={testTypeFilter}
        placeholder="All Types"
        options={TEST_TYPES.map((type) => ({
          value: type,
          label: formatEnumLabel(type),
        }))}
        onChange={(value) => {
          onTestTypeChange(value);
          onPageReset();
        }}
        className="h-11 w-full rounded-full border border-[#CFD8E3] bg-white px-5 text-sm font-medium text-[#334155] sm:w-auto lg:h-[52px] lg:px-6 lg:text-[16px]"
      />

      {/* Assigned To Filter */}
      <FilterInput
        value={assignedToFilter}
        placeholder="Assigned To..."
        onChange={(value) => {
          onAssignedToChange(value);
          onPageReset();
        }}
        className="h-11 w-full rounded-full border border-[#CFD8E3] bg-white px-5 text-sm font-medium text-[#334155] placeholder:text-[#334155] sm:w-auto lg:h-[52px] lg:px-6 lg:text-[16px]"
      />

      {/* Date Range Filter */}
      <FilterSelect
        value={dateRangeFilter}
        placeholder="All Deadlines"
        options={DATE_RANGE_OPTIONS.map((option) => ({
          value: option.value,
          label: option.label,
        }))}
        onChange={(value) => {
          onDateRangeChange(value as DateRangeFilter);
          onPageReset();
        }}
        className="h-11 w-full rounded-full border border-[#CFD8E3] bg-white px-5 text-sm font-medium text-[#334155] sm:w-auto lg:h-[52px] lg:px-6 lg:text-[16px]"
      />

      {/* Sort By */}
      <FilterSelect
        value={sortBy}
        placeholder="Sort By"
        options={SORT_OPTIONS.map((option) => ({
          value: option.value,
          label: option.label,
        }))}
        onChange={(value) => {
          onSortChange(value as SortOption);
          onPageReset();
        }}
        className="h-11 w-full rounded-full border border-[#CFD8E3] bg-white px-5 text-sm font-medium text-[#334155] sm:w-auto lg:h-[52px] lg:px-6 lg:text-[16px]"
      />
    </div>
  );
}

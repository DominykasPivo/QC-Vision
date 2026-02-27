import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
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
import type { SortOption } from "@/lib/utils/tests";

interface TestFiltersProps {
  statusFilter: string;
  testTypeFilter: string;
  assignedToFilter: string;
  dateRangeFilter: string;
  sortBy: SortOption;
  onStatusChange: (value: string) => void;
  onTestTypeChange: (value: string) => void;
  onAssignedToChange: (value: string) => void;
  onDateRangeChange: (value: string) => void;
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
  const handleFilterChange = (
    filterSetter: (value: string) => void,
    value: string,
  ): void => {
    const actualValue = value === "all" ? "" : value;
    filterSetter(actualValue);
    onPageReset();
  };

  return (
    <div className="hidden flex-wrap gap-3 xl:gap-4 lg:flex">
      {/* Status Filter */}
      <Select
        value={statusFilter || "all"}
        onValueChange={(value) => handleFilterChange(onStatusChange, value)}
      >
        <SelectTrigger className="h-11 w-full rounded-full border border-[#BFD2F8] bg-[#EAF1FF] px-5 text-sm font-semibold text-[#1D4ED8] sm:w-auto lg:h-[52px] lg:px-6 lg:text-[16px]">
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          {TEST_STATUSES.map((status) => (
            <SelectItem key={status} value={status}>
              {STATUS_LABELS[status as TestStatus]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Test Type Filter */}
      <Select
        value={testTypeFilter || "all"}
        onValueChange={(value) => handleFilterChange(onTestTypeChange, value)}
      >
        <SelectTrigger className="h-11 w-full rounded-full border border-[#CFD8E3] bg-white px-5 text-sm font-medium text-[#334155] sm:w-auto lg:h-[52px] lg:px-6 lg:text-[16px]">
          <SelectValue placeholder="All Types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          {TEST_TYPES.map((type) => (
            <SelectItem key={type} value={type}>
              {formatEnumLabel(type)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Assigned To Filter */}
      <Input
        type="text"
        value={assignedToFilter}
        onChange={(event) => {
          onAssignedToChange(event.target.value);
          onPageReset();
        }}
        placeholder="Assigned To..."
        className="h-11 w-full rounded-full border border-[#CFD8E3] bg-white px-5 text-sm font-medium text-[#334155] placeholder:text-[#334155] sm:w-auto lg:h-[52px] lg:px-6 lg:text-[16px]"
      />

      {/* Date Range Filter */}
      <Select
        value={dateRangeFilter || "all"}
        onValueChange={(value) => handleFilterChange(onDateRangeChange, value)}
      >
        <SelectTrigger className="h-11 w-full rounded-full border border-[#CFD8E3] bg-white px-5 text-sm font-medium text-[#334155] sm:w-auto lg:h-[52px] lg:px-6 lg:text-[16px]">
          <SelectValue placeholder="All Deadlines" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Deadlines</SelectItem>
          {DATE_RANGE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Sort By */}
      <Select
        value={sortBy}
        onValueChange={(value) => {
          onSortChange(value as SortOption);
          onPageReset();
        }}
      >
        <SelectTrigger className="h-11 w-full rounded-full border border-[#CFD8E3] bg-white px-5 text-sm font-medium text-[#334155] sm:w-auto lg:h-[52px] lg:px-6 lg:text-[16px]">
          <SelectValue placeholder="Newest First" />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

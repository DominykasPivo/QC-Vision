import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { formatEnumLabel, TEST_STATUSES, TEST_TYPES } from "@/lib/db-constants";
import {
  SORT_OPTIONS,
  DATE_RANGE_OPTIONS,
} from "@/lib/constants/testsListConstants";

interface TestsListFiltersProps {
  statusFilter: string;
  testTypeFilter: string;
  assignedToFilter: string;
  dateRangeFilter: string;
  sortBy: string;
  onStatusChange: (value: string) => void;
  onTestTypeChange: (value: string) => void;
  onAssignedToChange: (value: string) => void;
  onDateRangeChange: (value: string) => void;
  onSortByChange: (value: string) => void;
  onPageReset: () => void;
}

export function TestsListFilters({
  statusFilter,
  testTypeFilter,
  assignedToFilter,
  dateRangeFilter,
  sortBy,
  onStatusChange,
  onTestTypeChange,
  onAssignedToChange,
  onDateRangeChange,
  onSortByChange,
  onPageReset,
}: TestsListFiltersProps) {
  const handleFilterChange =
    (setter: (value: string) => void) => (value: string) => {
      setter(value === "all" ? "" : value);
      onPageReset();
    };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onAssignedToChange(e.target.value);
    onPageReset();
  };

  const triggerCls =
    "h-12 rounded-full border border-slate-200 bg-white px-5 text-sm text-slate-900 shadow-sm";

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
      <Select
        value={statusFilter || "all"}
        onValueChange={handleFilterChange(onStatusChange)}
      >
        <SelectTrigger className={triggerCls}>
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          {TEST_STATUSES.map((status) => (
            <SelectItem key={status} value={status}>
              {formatEnumLabel(status)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={testTypeFilter || "all"}
        onValueChange={handleFilterChange(onTestTypeChange)}
      >
        <SelectTrigger className={triggerCls}>
          <SelectValue placeholder="Test Type" />
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

      <Input
        type="text"
        className="h-12 rounded-full border border-slate-200 bg-white px-5 text-sm text-slate-900 shadow-sm placeholder:text-slate-500"
        placeholder="Assigned to..."
        value={assignedToFilter}
        onChange={handleInputChange}
      />

      <Select
        value={dateRangeFilter || "all"}
        onValueChange={handleFilterChange(onDateRangeChange)}
      >
        <SelectTrigger className={triggerCls}>
          <SelectValue placeholder="Deadline" />
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

      <Select value={sortBy} onValueChange={handleFilterChange(onSortByChange)}>
        <SelectTrigger className={triggerCls}>
          <SelectValue placeholder="Sort by" />
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

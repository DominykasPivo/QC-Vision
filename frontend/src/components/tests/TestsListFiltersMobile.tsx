import { ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatEnumLabel, TEST_STATUSES, TEST_TYPES } from "@/lib/db-constants";
import {
  SORT_OPTIONS,
  DATE_RANGE_OPTIONS,
} from "@/lib/constants/testsListConstants";

interface TestsListFiltersMobileProps {
  isOpen: boolean;
  onClose: () => void;
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

export function TestsListFiltersMobile({
  isOpen,
  onClose,
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
}: TestsListFiltersMobileProps) {
  if (!isOpen) return null;

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
    "h-14 rounded-2xl border border-slate-200 bg-white px-5 text-base text-slate-900 shadow-sm";

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/45"
        aria-label="Close filters"
        onClick={onClose}
      />
      <div className="relative flex min-h-full items-center justify-center p-4">
        <div className="flex max-h-[86vh] w-[92%] max-w-[520px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
          <div className="border-b border-slate-200 px-6 py-6">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-full border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-700"
              onClick={onClose}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Go Back
            </Button>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
              Filters
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Narrow down your tests
            </p>
          </div>

          <div className="flex-1 overflow-y-auto bg-slate-50 px-6 py-6">
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Status
                </p>
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
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Type
                </p>
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
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Assigned To
                </p>
                <Input
                  type="text"
                  className={triggerCls}
                  placeholder="Assigned to..."
                  value={assignedToFilter}
                  onChange={handleInputChange}
                />
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Deadline
                </p>
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
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Sort
                </p>
                <Select
                  value={sortBy}
                  onValueChange={handleFilterChange(onSortByChange)}
                >
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
            </div>
          </div>

          <div className="sticky bottom-0 border-t border-slate-200 bg-white px-6 pb-6 pt-4">
            <Button
              type="button"
              className="relative h-14 w-full rounded-2xl text-sm font-bold uppercase tracking-wide"
              onClick={onClose}
            >
              Apply
              <Check className="absolute right-4 h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

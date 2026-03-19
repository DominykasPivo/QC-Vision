import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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

interface TestFiltersMobileProps {
  isOpen: boolean;
  onClose: () => void;
  statusFilter: string;
  testTypeFilter: string;
  assignedToFilter: string;
  dateRangeFilter: DateRangeFilter;
  sortBy: SortOption;
  hasAdvancedFilters: boolean;
  onStatusChange: (value: string) => void;
  onTestTypeChange: (value: string) => void;
  onAssignedToChange: (value: string) => void;
  onDateRangeChange: (value: DateRangeFilter) => void;
  onSortChange: (value: SortOption) => void;
  onPageReset: () => void;
}

export function TestFiltersMobile({
  isOpen,
  onClose,
  statusFilter,
  testTypeFilter,
  assignedToFilter,
  dateRangeFilter,
  sortBy,
  hasAdvancedFilters,
  onStatusChange,
  onTestTypeChange,
  onAssignedToChange,
  onDateRangeChange,
  onSortChange,
  onPageReset,
}: TestFiltersMobileProps) {
  return (
    <>
      {/* Mobile Filter Toggle */}
      <div className="flex items-center gap-3 lg:hidden">
        <div className="min-w-0 flex-1">
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
            className="h-11 w-full rounded-full border border-[#BFD2F8] bg-[#EAF1FF] px-5 text-sm font-semibold text-[#1D4ED8]"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "h-11 w-11 shrink-0 rounded-full border bg-white p-0 shadow-sm",
            hasAdvancedFilters
              ? "border-[#BFD2F8] bg-[#EAF1FF] text-[#1D4ED8]"
              : "border-[#CFD8E3] text-[#64748B]",
          )}
          aria-label="Open advanced filters"
          onClick={() => !isOpen && onClose()}
        >
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      {/* Mobile Filter Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/45"
            aria-label="Close advanced filters"
            onClick={onClose}
          />
          <div className="relative flex min-h-full items-center justify-center p-4">
            <div className="flex max-h-[84vh] w-full max-w-[420px] flex-col overflow-hidden rounded-[24px] border border-[#D5DFEC] bg-white shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#E2E8F0] px-5 py-4">
                <div>
                  <h3 className="text-lg font-semibold text-[#0F172A]">
                    Advanced Filters
                  </h3>
                  <p className="text-sm text-[#64748B]">
                    Adjust your test list filters
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 w-9 rounded-full border-[#CFD8E3] p-0 text-[#64748B]"
                  aria-label="Close advanced filters"
                  onClick={onClose}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Filter Content */}
              <div className="flex-1 space-y-4 overflow-y-auto bg-[#F8FAFF] px-5 py-5">
                {/* Test Type Filter */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                    All Types
                  </p>
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
                    className="h-11 w-full rounded-full border border-[#CFD8E3] bg-white px-5 text-sm font-medium text-[#334155]"
                  />
                </div>

                {/* Assigned To Filter */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                    Assigned To
                  </p>
                  <FilterInput
                    value={assignedToFilter}
                    placeholder="Assigned To..."
                    onChange={(value) => {
                      onAssignedToChange(value);
                      onPageReset();
                    }}
                    className="h-11 w-full rounded-full border border-[#CFD8E3] bg-white px-5 text-sm font-medium text-[#334155] placeholder:text-[#64748B]"
                  />
                </div>

                {/* Date Range Filter */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                    All Deadlines
                  </p>
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
                    className="h-11 w-full rounded-full border border-[#CFD8E3] bg-white px-5 text-sm font-medium text-[#334155]"
                  />
                </div>

                {/* Sort By */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                    Newest First
                  </p>
                  <FilterSelect
                    value={sortBy}
                    placeholder="Newest First"
                    options={SORT_OPTIONS.map((option) => ({
                      value: option.value,
                      label: option.label,
                    }))}
                    onChange={(value) => {
                      onSortChange(value as SortOption);
                      onPageReset();
                    }}
                    className="h-11 w-full rounded-full border border-[#CFD8E3] bg-white px-5 text-sm font-medium text-[#334155]"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-[#E2E8F0] bg-white px-5 py-4">
                <Button
                  type="button"
                  className="h-11 w-full rounded-[12px] bg-[#2563EB] text-sm font-semibold text-white hover:bg-[#1D4ED8]"
                  onClick={onClose}
                >
                  Apply Filters
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEFECT_SEVERITIES,
  TEST_STATUSES,
  TEST_TYPES,
  formatEnumLabel,
} from "@/lib/db-constants";
import { cn } from "@/lib/utils";
import { MOBILE_TRIGGER_CLS, VERIFICATION_STATUSES } from "@/lib/constants";
import type { CategoryRecord } from "@/hooks/useCategories";

interface GalleryFiltersMobileProps {
  isOpen: boolean;
  onClose: () => void;
  severityFilter: string;
  categoryFilter: string;
  testTypeFilter: string;
  testStatusFilter: string;
  hasDefectsFilter: string;
  verificationFilter: string;
  hasAdvancedFilters: boolean;
  categories: CategoryRecord[];
  onSeverityChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onTestTypeChange: (value: string) => void;
  onTestStatusChange: (value: string) => void;
  onHasDefectsChange: (value: string) => void;
  onVerificationChange: (value: string) => void;
  onPageReset: () => void;
}

export function GalleryFiltersMobile({
  isOpen,
  onClose,
  severityFilter,
  categoryFilter,
  testTypeFilter,
  testStatusFilter,
  hasDefectsFilter,
  verificationFilter,
  hasAdvancedFilters,
  categories,
  onSeverityChange,
  onCategoryChange,
  onTestTypeChange,
  onTestStatusChange,
  onHasDefectsChange,
  onVerificationChange,
  onPageReset,
}: GalleryFiltersMobileProps) {
  const handleFilterChange = (
    filterSetter: (value: string) => void,
    value: string
  ): void => {
    const actualValue = value === "all" ? "" : value;
    filterSetter(actualValue);
    onPageReset();
  };

  return (
    <>
      {/* Mobile Filter Toggle */}
      <div className="mt-4 flex items-center gap-3 md:hidden">
        <div className="min-w-0 flex-1">
          <Select
            value={testStatusFilter || "all"}
            onValueChange={(v) => handleFilterChange(onTestStatusChange, v)}
          >
            <SelectTrigger className="h-11 w-full rounded-full border border-[#BFD2F8] bg-[#EAF1FF] px-5 text-sm font-semibold text-[#1D4ED8]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {TEST_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {formatEnumLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "h-11 w-11 shrink-0 rounded-full border bg-white p-0 shadow-sm",
            hasAdvancedFilters
              ? "border-[#BFD2F8] bg-[#EAF1FF] text-[#1D4ED8]"
              : "border-[#CFD8E3] text-[#64748B]"
          )}
          aria-label="Open advanced filters"
          onClick={() => !isOpen && onClose()}
        >
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      {/* Mobile Filter Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
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
                    Adjust your gallery filters
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
                {/* Severity */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                    Severity
                  </p>
                  <Select
                    value={severityFilter || "all"}
                    onValueChange={(v) => handleFilterChange(onSeverityChange, v)}
                  >
                    <SelectTrigger className={MOBILE_TRIGGER_CLS}>
                      <SelectValue placeholder="Severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Severities</SelectItem>
                      {DEFECT_SEVERITIES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {formatEnumLabel(s)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                    Category
                  </p>
                  <Select
                    value={categoryFilter || "all"}
                    onValueChange={(v) => handleFilterChange(onCategoryChange, v)}
                  >
                    <SelectTrigger className={MOBILE_TRIGGER_CLS}>
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Test Type */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                    Test Type
                  </p>
                  <Select
                    value={testTypeFilter || "all"}
                    onValueChange={(v) => handleFilterChange(onTestTypeChange, v)}
                  >
                    <SelectTrigger className={MOBILE_TRIGGER_CLS}>
                      <SelectValue placeholder="Test Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {TEST_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {formatEnumLabel(t)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Has Defects */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                    Defects
                  </p>
                  <Select
                    value={hasDefectsFilter || "all"}
                    onValueChange={(v) => handleFilterChange(onHasDefectsChange, v)}
                  >
                    <SelectTrigger className={MOBILE_TRIGGER_CLS}>
                      <SelectValue placeholder="Defects" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Photos</SelectItem>
                      <SelectItem value="true">With Defects</SelectItem>
                      <SelectItem value="false">Without Defects</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Verification */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                    Verification
                  </p>
                  <Select
                    value={verificationFilter || "all"}
                    onValueChange={(v) => handleFilterChange(onVerificationChange, v)}
                  >
                    <SelectTrigger className={MOBILE_TRIGGER_CLS}>
                      <SelectValue placeholder="Verification" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Verifications</SelectItem>
                      {VERIFICATION_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {formatEnumLabel(s)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

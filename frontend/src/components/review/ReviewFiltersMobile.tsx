import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FilterSelect } from "@/components/filters/FilterSelect";
import { FilterInput } from "@/components/filters/FilterInput";
import {
  REVIEW_STATUSES,
  TEST_TYPES,
  type ReviewStatus,
  formatEnumLabel,
} from "@/lib/db-constants";
import { VERIFICATION_STATUSES } from "@/lib/constants";
import { isReviewer } from "@/lib/auth";

interface ReviewFiltersMobileProps {
  isOpen: boolean;
  onClose: () => void;
  testTypeFilter: string;
  reviewStatusFilter: string;
  verificationStatusFilter: string;
  assignedToFilter: string;
  jiraIdFilter: string;
  productNameFilter: string;
  hasAdvancedFilters: boolean;
  onTestTypeChange: (value: string) => void;
  onReviewStatusChange: (value: string) => void;
  onVerificationStatusChange: (value: string) => void;
  onAssignedToChange: (value: string) => void;
  onJiraIdChange: (value: string) => void;
  onProductNameChange: (value: string) => void;
  onPageReset: () => void;
}

const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  pending: "Pending Review",
  approved: "Approved",
  rejected: "Rejected",
};

export function ReviewFiltersMobile({
  isOpen,
  onClose,
  testTypeFilter,
  reviewStatusFilter,
  verificationStatusFilter,
  assignedToFilter,
  jiraIdFilter,
  productNameFilter,
  hasAdvancedFilters,
  onTestTypeChange,
  onReviewStatusChange,
  onVerificationStatusChange,
  onAssignedToChange,
  onJiraIdChange,
  onProductNameChange,
  onPageReset,
}: ReviewFiltersMobileProps) {
  return (
    <>
      {/* Mobile Filter Toggle */}
      <div className="flex items-center gap-3 lg:hidden">
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
                    Adjust your review filters
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
                    Test Type
                  </p>
                  <FilterSelect
                    value={testTypeFilter}
                    placeholder="All Types"
                    options={TEST_TYPES.map((t) => ({
                      value: t,
                      label: formatEnumLabel(t),
                    }))}
                    onChange={(v) => {
                      onTestTypeChange(v);
                      onPageReset();
                    }}
                    className="h-11 w-full rounded-full border border-[#BFD2F8] bg-[#EAF1FF] px-5 text-sm font-semibold text-[#1D4ED8]"
                  />
                </div>

                {/* Review Status Filter */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                    Review Status
                  </p>
                  <FilterSelect
                    value={reviewStatusFilter}
                    placeholder="All Statuses"
                    options={REVIEW_STATUSES.map((status) => ({
                      value: status,
                      label: REVIEW_STATUS_LABELS[status],
                    }))}
                    onChange={(v) => {
                      onReviewStatusChange(v);
                      onPageReset();
                    }}
                    className="h-11 w-full rounded-full border border-[#BFD2F8] bg-[#EAF1FF] px-5 text-sm font-semibold text-[#1D4ED8]"
                  />
                </div>

                {/* Verification Status Filter - Only for Reviewers */}
                {isReviewer() && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                      Photo Verification
                    </p>
                    <FilterSelect
                      value={verificationStatusFilter}
                      placeholder="All Verifications"
                      options={VERIFICATION_STATUSES.map((s) => ({
                        value: s,
                        label: formatEnumLabel(s),
                      }))}
                      onChange={(v) => {
                        onVerificationStatusChange(v);
                        onPageReset();
                      }}
                      className="h-11 w-full rounded-full border border-[#BFD2F8] bg-[#EAF1FF] px-5 text-sm font-semibold text-[#1D4ED8]"
                    />
                  </div>
                )}

                {/* Assigned To Filter */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                    Assigned To
                  </p>
                  <FilterInput
                    value={assignedToFilter}
                    placeholder="Assigned To..."
                    onChange={(v) => {
                      onAssignedToChange(v);
                      onPageReset();
                    }}
                    className="h-11 w-full rounded-full border border-[#CFD8E3] bg-white px-5 text-sm font-medium text-[#334155] placeholder:text-[#64748B]"
                  />
                </div>

                {/* Jira ID / Test ID Filter */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                    Gyra ID
                  </p>
                  <FilterInput
                    value={jiraIdFilter}
                    placeholder="Gyra ID..."
                    onChange={(v) => {
                      onJiraIdChange(v);
                      onPageReset();
                    }}
                    className="h-11 w-full rounded-full border border-[#CFD8E3] bg-white px-5 text-sm font-medium text-[#334155] placeholder:text-[#64748B]"
                  />
                </div>

                {/* Product Name Filter */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                    Product Name
                  </p>
                  <FilterInput
                    value={productNameFilter}
                    placeholder="Product Name..."
                    onChange={(v) => {
                      onProductNameChange(v);
                      onPageReset();
                    }}
                    className="h-11 w-full rounded-full border border-[#CFD8E3] bg-white px-5 text-sm font-medium text-[#334155] placeholder:text-[#64748B]"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-[#E2E8F0] bg-white px-5 py-4">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full rounded-full border-[#CFD8E3] text-sm font-semibold text-[#0F172A]"
                  onClick={onClose}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

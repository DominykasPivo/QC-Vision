import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TEST_TYPES,
  REVIEW_STATUSES,
  formatEnumLabel,
} from "@/lib/db-constants";
import { cn } from "@/lib/utils";
import { isReviewer } from "@/lib/auth";
import { MOBILE_TRIGGER_CLS, VERIFICATION_STATUSES } from "@/lib/constants";

interface ReviewPageFiltersMobileProps {
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

export function ReviewPageFiltersMobile({
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
}: ReviewPageFiltersMobileProps) {
  const handleFilterChange = (
    filterSetter: (value: string) => void,
    value: string,
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
            value={testTypeFilter || "all"}
            onValueChange={(v) => handleFilterChange(onTestTypeChange, v)}
          >
            <SelectTrigger className={MOBILE_TRIGGER_CLS}>
              <SelectValue placeholder="Test Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {TEST_TYPES.map((s) => (
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
              : "border-[#CFD8E3] text-[#64748B]",
          )}
          aria-label="Open advanced filters"
          onClick={onClose}
        >
          <Filter className="h-5 w-5" />
        </Button>
      </div>

      {/* Mobile Filter Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Panel */}
          <div className="relative m-4 max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Filters</h2>
              <Button
                type="button"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={onClose}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-4">
              {/* Test Type Filter */}
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Test Type
                </label>
                <Select
                  value={testTypeFilter || "all"}
                  onValueChange={(v) => handleFilterChange(onTestTypeChange, v)}
                >
                  <SelectTrigger className={MOBILE_TRIGGER_CLS}>
                    <SelectValue placeholder="All Types" />
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

              {/* Review Status Filter */}
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Review Status
                </label>
                <Select
                  value={reviewStatusFilter || "all"}
                  onValueChange={(v) =>
                    handleFilterChange(onReviewStatusChange, v)
                  }
                >
                  <SelectTrigger className={MOBILE_TRIGGER_CLS}>
                    <SelectValue placeholder="All Reviews" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Reviews</SelectItem>
                    {REVIEW_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {formatEnumLabel(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Verification Status Filter - Only for Reviewers */}
              {isReviewer() && (
                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Photo Verification
                  </label>
                  <Select
                    value={verificationStatusFilter || "all"}
                    onValueChange={(v) =>
                      handleFilterChange(onVerificationStatusChange, v)
                    }
                  >
                    <SelectTrigger className={MOBILE_TRIGGER_CLS}>
                      <SelectValue placeholder="All Verifications" />
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
              )}

              {/* Assigned To Filter */}
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Assigned To
                </label>
                <Input
                  type="text"
                  value={assignedToFilter}
                  onChange={(event) => {
                    onAssignedToChange(event.target.value);
                    onPageReset();
                  }}
                  placeholder="Assigned To..."
                  className="h-11 rounded-full border border-[#CFD8E3] bg-white px-5 text-sm font-medium text-[#334155] placeholder:text-[#64748B]"
                />
              </div>

              {/* Jira ID / Test ID Filter */}
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Gyra ID
                </label>
                <Input
                  type="text"
                  value={jiraIdFilter}
                  onChange={(event) => {
                    onJiraIdChange(event.target.value);
                    onPageReset();
                  }}
                  placeholder="Gyra ID..."
                  className="h-11 rounded-full border border-[#CFD8E3] bg-white px-5 text-sm font-medium text-[#334155] placeholder:text-[#64748B]"
                />
              </div>

              {/* Product Name Filter */}
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Product Name
                </label>
                <Input
                  type="text"
                  value={productNameFilter}
                  onChange={(event) => {
                    onProductNameChange(event.target.value);
                    onPageReset();
                  }}
                  placeholder="Product Name..."
                  className="h-11 rounded-full border border-[#CFD8E3] bg-white px-5 text-sm font-medium text-[#334155] placeholder:text-[#64748B]"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

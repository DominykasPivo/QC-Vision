import { FilterSelect, FilterInput } from "@/components/filters";
import {
  REVIEW_STATUSES,
  TEST_TYPES,
  type ReviewStatus,
  formatEnumLabel,
} from "@/lib/db-constants";
import { VERIFICATION_STATUSES } from "@/lib/constants";
import { isReviewer } from "@/lib/auth";

interface ReviewFiltersProps {
  testTypeFilter: string;
  reviewStatusFilter: string;
  verificationStatusFilter: string;
  assignedToFilter: string;
  jiraIdFilter: string;
  productNameFilter: string;
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

export function ReviewFilters({
  testTypeFilter,
  reviewStatusFilter,
  verificationStatusFilter,
  assignedToFilter,
  jiraIdFilter,
  productNameFilter,
  onTestTypeChange,
  onReviewStatusChange,
  onVerificationStatusChange,
  onAssignedToChange,
  onJiraIdChange,
  onProductNameChange,
  onPageReset,
}: ReviewFiltersProps) {
  return (
    <div className="hidden flex-wrap gap-3 xl:gap-4 lg:flex">
      {/* Test Type Filter */}
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
      />

      {/* Review Status Filter */}
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
      />

      {/* Verification Status Filter - Only for Reviewers */}
      {isReviewer() && (
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
        />
      )}

      {/* Assigned To Filter */}
      <FilterInput
        value={assignedToFilter}
        placeholder="Assigned To..."
        onChange={(v) => {
          onAssignedToChange(v);
          onPageReset();
        }}
      />

      {/* Jira ID / Test ID Filter */}
      <FilterInput
        value={jiraIdFilter}
        placeholder="Gyra ID..."
        onChange={(v) => {
          onJiraIdChange(v);
          onPageReset();
        }}
      />

      {/* Product Name Filter */}
      <FilterInput
        value={productNameFilter}
        placeholder="Product Name..."
        onChange={(v) => {
          onProductNameChange(v);
          onPageReset();
        }}
      />
    </div>
  );
}

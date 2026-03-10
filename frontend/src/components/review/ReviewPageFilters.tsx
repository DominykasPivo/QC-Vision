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
import { DESKTOP_TRIGGER_CLS, VERIFICATION_STATUSES } from "@/lib/constants";
import { isReviewer } from "@/lib/auth";

interface ReviewPageFiltersProps {
  testTypeFilter: string;
  reviewStatusFilter: string;
  verificationStatusFilter: string;
  onTestTypeChange: (value: string) => void;
  onReviewStatusChange: (value: string) => void;
  onVerificationStatusChange: (value: string) => void;
  onPageReset: () => void;
}

export function ReviewPageFilters({
  testTypeFilter,
  reviewStatusFilter,
  verificationStatusFilter,
  onTestTypeChange,
  onReviewStatusChange,
  onVerificationStatusChange,
  onPageReset,
}: ReviewPageFiltersProps) {
  const handleFilterChange = (
    filterSetter: (value: string) => void,
    value: string,
  ): void => {
    const actualValue = value === "all" ? "" : value;
    filterSetter(actualValue);
    onPageReset();
  };

  return (
    <div className="mt-4 hidden md:block">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
        {/* Test Type Filter */}
        <Select
          value={testTypeFilter || "all"}
          onValueChange={(v) => handleFilterChange(onTestTypeChange, v)}
        >
          <SelectTrigger className={DESKTOP_TRIGGER_CLS}>
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

        {/* Review Status Filter */}
        <Select
          value={reviewStatusFilter || "all"}
          onValueChange={(v) => handleFilterChange(onReviewStatusChange, v)}
        >
          <SelectTrigger className={DESKTOP_TRIGGER_CLS}>
            <SelectValue placeholder="Review Status" />
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

        {/* Verification Status Filter - Only for Reviewers */}
        {isReviewer() && (
          <Select
            value={verificationStatusFilter || "all"}
            onValueChange={(v) =>
              handleFilterChange(onVerificationStatusChange, v)
            }
          >
            <SelectTrigger className={DESKTOP_TRIGGER_CLS}>
              <SelectValue placeholder="Photo Verification" />
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
        )}
      </div>
    </div>
  );
}

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
import { DESKTOP_TRIGGER_CLS, VERIFICATION_STATUSES } from "@/lib/constants";
import { isReviewer } from "@/lib/auth";
import type { CategoryRecord } from "@/hooks/useCategories";

interface GalleryFiltersProps {
  severityFilter: string;
  categoryFilter: string;
  testTypeFilter: string;
  testStatusFilter: string;
  hasDefectsFilter: string;
  verificationFilter: string;
  categories: CategoryRecord[];
  onSeverityChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onTestTypeChange: (value: string) => void;
  onTestStatusChange: (value: string) => void;
  onHasDefectsChange: (value: string) => void;
  onVerificationChange: (value: string) => void;
  onPageReset: () => void;
}

export function GalleryFilters({
  severityFilter,
  categoryFilter,
  testTypeFilter,
  testStatusFilter,
  hasDefectsFilter,
  verificationFilter,
  categories,
  onSeverityChange,
  onCategoryChange,
  onTestTypeChange,
  onTestStatusChange,
  onHasDefectsChange,
  onVerificationChange,
  onPageReset,
}: GalleryFiltersProps) {
  const handleFilterChange = (
    filterSetter: (value: string) => void,
    value: string,
  ): void => {
    const actualValue = value === "all" ? "" : value;
    filterSetter(actualValue);
    onPageReset();
  };

  return (
    <div className="mt-4 hidden lg:block">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
        {/* Severity Filter */}
        <Select
          value={severityFilter || "all"}
          onValueChange={(v) => handleFilterChange(onSeverityChange, v)}
        >
          <SelectTrigger className={DESKTOP_TRIGGER_CLS}>
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

        {/* Category Filter */}
        <Select
          value={categoryFilter || "all"}
          onValueChange={(v) => handleFilterChange(onCategoryChange, v)}
        >
          <SelectTrigger className={DESKTOP_TRIGGER_CLS}>
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

        {/* Test Status Filter */}
        <Select
          value={testStatusFilter || "all"}
          onValueChange={(v) => handleFilterChange(onTestStatusChange, v)}
        >
          <SelectTrigger className={DESKTOP_TRIGGER_CLS}>
            <SelectValue placeholder="Test Status" />
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

        {/* Has Defects Filter */}
        <Select
          value={hasDefectsFilter || "all"}
          onValueChange={(v) => handleFilterChange(onHasDefectsChange, v)}
        >
          <SelectTrigger className={DESKTOP_TRIGGER_CLS}>
            <SelectValue placeholder="Defects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Photos</SelectItem>
            <SelectItem value="true">With Defects</SelectItem>
            <SelectItem value="false">Without Defects</SelectItem>
          </SelectContent>
        </Select>

        {/* Verification Filter - Only for Reviewers */}
        {isReviewer() && (
          <Select
            value={verificationFilter || "all"}
            onValueChange={(v) => handleFilterChange(onVerificationChange, v)}
          >
            <SelectTrigger className={DESKTOP_TRIGGER_CLS}>
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
        )}
      </div>
    </div>
  );
}

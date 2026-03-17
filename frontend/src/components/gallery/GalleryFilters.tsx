import {
  DEFECT_SEVERITIES,
  TEST_STATUSES,
  TEST_TYPES,
  formatEnumLabel,
} from "@/lib/db-constants";
import { DESKTOP_TRIGGER_CLS, VERIFICATION_STATUSES } from "@/lib/constants";
import { isReviewer } from "@/lib/auth";
import { FilterSelect } from "@/components/filters/FilterSelect";
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
  return (
    <div className="mt-4 hidden md:block">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
        {/* Severity Filter */}
        <FilterSelect
          value={severityFilter}
          placeholder="Severity"
          options={DEFECT_SEVERITIES.map((s) => ({
            value: s,
            label: formatEnumLabel(s),
          }))}
          onChange={(v) => {
            onSeverityChange(v);
            onPageReset();
          }}
          className={DESKTOP_TRIGGER_CLS}
        />

        {/* Category Filter */}
        <FilterSelect
          value={categoryFilter}
          placeholder="Category"
          options={categories.map((c) => ({
            value: String(c.id),
            label: c.name,
          }))}
          onChange={(v) => {
            onCategoryChange(v);
            onPageReset();
          }}
          className={DESKTOP_TRIGGER_CLS}
        />

        {/* Test Type Filter */}
        <FilterSelect
          value={testTypeFilter}
          placeholder="Test Type"
          options={TEST_TYPES.map((t) => ({
            value: t,
            label: formatEnumLabel(t),
          }))}
          onChange={(v) => {
            onTestTypeChange(v);
            onPageReset();
          }}
          className={DESKTOP_TRIGGER_CLS}
        />

        {/* Test Status Filter */}
        <FilterSelect
          value={testStatusFilter}
          placeholder="Test Status"
          options={TEST_STATUSES.map((s) => ({
            value: s,
            label: formatEnumLabel(s),
          }))}
          onChange={(v) => {
            onTestStatusChange(v);
            onPageReset();
          }}
          className={DESKTOP_TRIGGER_CLS}
        />

        {/* Has Defects Filter */}
        <FilterSelect
          value={hasDefectsFilter}
          placeholder="Defects"
          options={[
            { value: "true", label: "With Defects" },
            { value: "false", label: "Without Defects" },
          ]}
          onChange={(v) => {
            onHasDefectsChange(v);
            onPageReset();
          }}
          className={DESKTOP_TRIGGER_CLS}
        />

        {/* Verification Filter - Only for Reviewers */}
        {isReviewer() && (
          <FilterSelect
            value={verificationFilter}
            placeholder="Verification"
            options={VERIFICATION_STATUSES.map((s) => ({
              value: s,
              label: formatEnumLabel(s),
            }))}
            onChange={(v) => {
              onVerificationChange(v);
              onPageReset();
            }}
            className={DESKTOP_TRIGGER_CLS}
          />
        )}
      </div>
    </div>
  );
}

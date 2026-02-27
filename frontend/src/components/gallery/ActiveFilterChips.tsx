import { Button } from "@/components/ui/button";
import { formatEnumLabel } from "@/lib/db-constants";
import type { CategoryRecord } from "@/hooks/useCategories";

interface ActiveFilterChipsProps {
  severityFilter: string;
  categoryFilter: string;
  testTypeFilter: string;
  testStatusFilter: string;
  hasDefectsFilter: string;
  verificationFilter: string;
  categories: CategoryRecord[];
  onClearAll: () => void;
}

export function ActiveFilterChips({
  severityFilter,
  categoryFilter,
  testTypeFilter,
  testStatusFilter,
  hasDefectsFilter,
  verificationFilter,
  categories,
  onClearAll,
}: ActiveFilterChipsProps) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-1.5">
      <span className="text-sm font-semibold text-slate-600">
        Active filters:
      </span>
      {severityFilter && (
        <span className="rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
          Severity: {formatEnumLabel(severityFilter)}
        </span>
      )}
      {categoryFilter && (
        <span className="rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
          Category:{" "}
          {categories.find((c) => String(c.id) === categoryFilter)?.name ??
            categoryFilter}
        </span>
      )}
      {testTypeFilter && (
        <span className="rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
          Type: {formatEnumLabel(testTypeFilter)}
        </span>
      )}
      {testStatusFilter && (
        <span className="rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
          Status: {formatEnumLabel(testStatusFilter)}
        </span>
      )}
      {hasDefectsFilter && (
        <span className="rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
          {hasDefectsFilter === "true" ? "With Defects" : "Without Defects"}
        </span>
      )}
      {verificationFilter && (
        <span className="rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
          Verification: {formatEnumLabel(verificationFilter)}
        </span>
      )}
      <Button
        type="button"
        variant="outline"
        className="h-8 rounded-full border border-slate-300 bg-slate-50 px-3 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-100"
        onClick={onClearAll}
      >
        Clear All Filters
      </Button>
    </div>
  );
}

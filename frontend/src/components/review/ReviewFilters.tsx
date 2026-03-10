import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { REVIEW_STATUSES, type ReviewStatus } from "@/lib/db-constants";

interface ReviewFiltersProps {
  reviewStatusFilter: string;
  assignedToFilter: string;
  jiraIdFilter: string;
  productNameFilter: string;
  onReviewStatusChange: (value: string) => void;
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
  reviewStatusFilter,
  assignedToFilter,
  jiraIdFilter,
  productNameFilter,
  onReviewStatusChange,
  onAssignedToChange,
  onJiraIdChange,
  onProductNameChange,
  onPageReset,
}: ReviewFiltersProps) {
  const handleFilterChange = <T extends string>(
    filterSetter: (value: T) => void,
    value: string,
  ): void => {
    const actualValue = (value === "all" ? "" : value) as T;
    filterSetter(actualValue);
    onPageReset();
  };

  return (
    <div className="hidden flex-wrap gap-3 xl:gap-4 lg:flex">
      {/* Review Status Filter */}
      <Select
        value={reviewStatusFilter || "all"}
        onValueChange={(value) =>
          handleFilterChange(onReviewStatusChange, value)
        }
      >
        <SelectTrigger className="h-11 w-full rounded-full border border-[#BFD2F8] bg-[#EAF1FF] px-5 text-sm font-semibold text-[#1D4ED8] sm:w-auto lg:h-[52px] lg:px-6 lg:text-[16px]">
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          {REVIEW_STATUSES.map((status) => (
            <SelectItem key={status} value={status}>
              {REVIEW_STATUS_LABELS[status]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Assigned To Filter */}
      <Input
        type="text"
        value={assignedToFilter}
        onChange={(event) => {
          onAssignedToChange(event.target.value);
          onPageReset();
        }}
        placeholder="Assigned To..."
        className="h-11 w-full rounded-full border border-[#CFD8E3] bg-white px-5 text-sm font-medium text-[#334155] placeholder:text-[#334155] sm:w-auto lg:h-[52px] lg:px-6 lg:text-[16px]"
      />

      {/* Jira ID / Test ID Filter */}
      <Input
        type="text"
        value={jiraIdFilter}
        onChange={(event) => {
          onJiraIdChange(event.target.value);
          onPageReset();
        }}
        placeholder="Gyra ID..."
        className="h-11 w-full rounded-full border border-[#CFD8E3] bg-white px-5 text-sm font-medium text-[#334155] placeholder:text-[#334155] sm:w-auto lg:h-[52px] lg:px-6 lg:text-[16px]"
      />

      {/* Product Name Filter */}
      <Input
        type="text"
        value={productNameFilter}
        onChange={(event) => {
          onProductNameChange(event.target.value);
          onPageReset();
        }}
        placeholder="Product Name..."
        className="h-11 w-full rounded-full border border-[#CFD8E3] bg-white px-5 text-sm font-medium text-[#334155] placeholder:text-[#334155] sm:w-auto lg:h-[52px] lg:px-6 lg:text-[16px]"
      />
    </div>
  );
}

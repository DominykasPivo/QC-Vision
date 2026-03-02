import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatEnumLabel, TEST_STATUSES, TEST_TYPES } from "@/lib/db-constants";
import { spacing } from "@/lib/ui/spacing";
import type { TestFormData } from "@/lib/forms/test-form";
import {
  CONTROL_CLASS,
  MUTED_CONTROL_CLASS,
  TEXTAREA_CLASS,
} from "@/lib/constants/createTestConstants";

interface TestFormFieldsProps {
  formData: TestFormData;
  isLoading: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTextareaChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onTestTypeChange: (value: string) => void;
  onStatusChange: (value: string) => void;
}

export function TestFormFields({
  formData,
  isLoading,
  onInputChange,
  onTextareaChange,
  onTestTypeChange,
  onStatusChange,
}: TestFormFieldsProps) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <div className={spacing.fieldGroup}>
          <label
            className="text-base font-semibold text-slate-900 md:text-lg"
            htmlFor="jiraId"
          >
            Jira ID <span className="text-red-500">*</span>
          </label>
          <Input
            type="text"
            id="jiraId"
            name="jiraId"
            density="spacious"
            className={CONTROL_CLASS}
            placeholder="e.g. GY-12345"
            value={formData.jiraId}
            onChange={onInputChange}
            required
            disabled={isLoading}
          />
        </div>

        <div className={spacing.fieldGroup}>
          <label
            className="text-base font-semibold text-slate-900 md:text-lg"
            htmlFor="productName"
          >
            Product Name <span className="text-red-500">*</span>
          </label>
          <Input
            type="text"
            id="productName"
            name="productName"
            density="spacious"
            className={CONTROL_CLASS}
            placeholder="e.g. Blue Polo Shirt"
            value={formData.productName}
            onChange={onInputChange}
            required
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className={spacing.fieldGroup}>
          <label
            className="text-base font-semibold text-slate-900 md:text-lg"
            htmlFor="testType"
          >
            Test Type <span className="text-red-500">*</span>
          </label>
          <Select
            value={formData.testType}
            onValueChange={onTestTypeChange}
            disabled={isLoading}
          >
            <SelectTrigger
              id="testType"
              className={CONTROL_CLASS}
              density="spacious"
            >
              <SelectValue placeholder="Select test type" />
            </SelectTrigger>
            <SelectContent>
              {TEST_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {formatEnumLabel(type)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className={spacing.fieldGroup}>
          <label
            className="text-base font-semibold text-slate-900 md:text-lg"
            htmlFor="requester"
          >
            Requester
          </label>
          <Input
            type="text"
            id="requester"
            name="requester"
            density="spacious"
            className={MUTED_CONTROL_CLASS}
            placeholder="Enter requester name"
            value={formData.requester}
            onChange={onInputChange}
            required
            disabled
            readOnly
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className={spacing.fieldGroup}>
          <label
            className="text-base font-semibold text-slate-900 md:text-lg"
            htmlFor="assignedTo"
          >
            Assigned To (Optional)
          </label>
          <Input
            type="text"
            id="assignedTo"
            name="assignedTo"
            density="spacious"
            className={CONTROL_CLASS}
            placeholder="Enter assignee name"
            value={formData.assignedTo}
            onChange={onInputChange}
            disabled={isLoading}
          />
        </div>

        <div className={spacing.fieldGroup}>
          <label
            className="text-base font-semibold text-slate-900 md:text-lg"
            htmlFor="deadline"
          >
            Deadline
          </label>
          <Input
            type="date"
            id="deadline"
            name="deadline"
            density="spacious"
            className={CONTROL_CLASS}
            value={formData.deadline}
            onChange={onInputChange}
            disabled={isLoading}
          />
        </div>
      </div>

      <div className={spacing.fieldGroup}>
        <label
          className="text-base font-semibold text-slate-900 md:text-lg"
          htmlFor="description"
        >
          Description (Optional)
        </label>
        <textarea
          id="description"
          name="description"
          className={TEXTAREA_CLASS}
          placeholder="Enter test description"
          value={formData.description}
          onChange={onTextareaChange}
          disabled={isLoading}
          rows={4}
        />
      </div>

      <div className={spacing.fieldGroup}>
        <label
          className="text-base font-semibold text-slate-900 md:text-lg"
          htmlFor="status"
        >
          Status
        </label>
        <Select
          value={formData.status}
          onValueChange={onStatusChange}
          disabled={isLoading}
        >
          <SelectTrigger
            id="status"
            className={CONTROL_CLASS}
            density="spacious"
          >
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            {TEST_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {formatEnumLabel(status)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}

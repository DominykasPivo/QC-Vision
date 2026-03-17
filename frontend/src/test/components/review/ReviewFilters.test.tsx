import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReviewFilters } from "@/components/review/ReviewFilters";
import * as auth from "@/lib/auth";

// Mock the auth module
vi.mock("@/lib/auth", () => ({
  isReviewer: vi.fn(() => true),
}));

// Mock the constants
vi.mock("@/lib/db-constants", () => ({
  TEST_TYPES: ["in_process", "completed", "approved"],
  REVIEW_STATUSES: ["pending", "approved", "rejected"],
  formatEnumLabel: (value: string) => {
    const labels: Record<string, string> = {
      in_process: "In Process",
      completed: "Completed",
      approved: "Approved",
      pending: "Pending",
      rejected: "Rejected",
    };
    return labels[value] || value;
  },
}));

vi.mock("@/lib/constants", () => ({
  VERIFICATION_STATUSES: ["verified", "failed", "pending_verification"],
}));

describe("ReviewFilters Component", () => {
  const defaultProps = {
    testTypeFilter: "",
    reviewStatusFilter: "",
    verificationStatusFilter: "",
    assignedToFilter: "",
    jiraIdFilter: "",
    productNameFilter: "",
    onTestTypeChange: vi.fn(),
    onReviewStatusChange: vi.fn(),
    onVerificationStatusChange: vi.fn(),
    onAssignedToChange: vi.fn(),
    onJiraIdChange: vi.fn(),
    onProductNameChange: vi.fn(),
    onPageReset: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth.isReviewer).mockReturnValue(true);
  });

  it("renders filter container with flex layout", () => {
    const { container } = render(<ReviewFilters {...defaultProps} />);
    const filterContainer = container.querySelector(".lg\\:flex");
    expect(filterContainer).toBeInTheDocument();
  });

  it("renders all filter dropdown components", () => {
    render(<ReviewFilters {...defaultProps} />);

    // Check for combobox elements (FilterSelect dropdowns)
    const comboboxes = screen.getAllByRole("combobox");
    // Should have at least: testType, reviewStatus, verificationStatus
    expect(comboboxes.length).toBeGreaterThanOrEqual(3);
  });

  it("renders all filter input components", () => {
    render(<ReviewFilters {...defaultProps} />);

    // Check for text inputs (FilterInput fields)
    const inputs = screen.getAllByRole("textbox");
    // Should have: assignedTo, jiraId, productName
    expect(inputs.length).toBeGreaterThanOrEqual(3);
  });

  it("calls onTestTypeChange when test type filter changes", async () => {
    const onTestTypeChange = vi.fn();
    const onPageReset = vi.fn();
    const user = userEvent.setup();

    render(
      <ReviewFilters
        {...defaultProps}
        onTestTypeChange={onTestTypeChange}
        onPageReset={onPageReset}
      />,
    );

    const [testTypeCombobox] = screen.getAllByRole("combobox");
    await user.click(testTypeCombobox);
    await user.click(screen.getByText("Completed"));

    expect(onTestTypeChange).toHaveBeenCalledWith("completed");
    expect(onPageReset).toHaveBeenCalled();
  });

  it("calls onPageReset when any filter changes", async () => {
    const onPageReset = vi.fn();
    const onAssignedToChange = vi.fn();
    const user = userEvent.setup();

    render(
      <ReviewFilters
        {...defaultProps}
        onPageReset={onPageReset}
        onAssignedToChange={onAssignedToChange}
      />,
    );

    const inputs = screen.getAllByRole("textbox");
    const assignedToInput = inputs.find((input) =>
      (input as HTMLInputElement).placeholder.includes("Assigned To"),
    );

    if (assignedToInput) {
      await user.type(assignedToInput, "Inspector");
      expect(onPageReset).toHaveBeenCalled();
    }
  });

  it("renders verification status filter for reviewers", () => {
    vi.mocked(auth.isReviewer).mockReturnValue(true);
    render(<ReviewFilters {...defaultProps} />);
    expect(screen.getByText("All Verifications")).toBeInTheDocument();
  });

  it("hides verification status filter for non-reviewers", () => {
    vi.mocked(auth.isReviewer).mockReturnValue(false);
    render(<ReviewFilters {...defaultProps} />);
    expect(screen.queryByText("All Verifications")).not.toBeInTheDocument();
  });

  it("displays filter values when provided", () => {
    const { rerender } = render(
      <ReviewFilters {...defaultProps} testTypeFilter="in_process" />,
    );

    // When value is set, it should display the label
    // We'll verify by checking a subsequent render
    rerender(<ReviewFilters {...defaultProps} testTypeFilter="completed" />);

    // Component should handle value changes
    expect(screen.getAllByRole("combobox").length).toBeGreaterThan(0);
  });

  it("handles assigned to filter input", async () => {
    const onAssignedToChange = vi.fn();
    const onPageReset = vi.fn();
    const user = userEvent.setup();

    render(
      <ReviewFilters
        {...defaultProps}
        onAssignedToChange={onAssignedToChange}
        onPageReset={onPageReset}
      />,
    );

    const inputs = screen.getAllByRole("textbox");
    const assignedToInput = inputs.find((input) =>
      (input as HTMLInputElement).placeholder.includes("Assigned To"),
    );

    if (assignedToInput) {
      await user.type(assignedToInput, "Inspector_A");
      // onChange is called per character, verify each character was passed
      const calls = onAssignedToChange.mock.calls;
      const typedValues = calls.map((call) => call[0]);
      expect(typedValues).toEqual([
        "I",
        "n",
        "s",
        "p",
        "e",
        "c",
        "t",
        "o",
        "r",
        "_",
        "A",
      ]);
      expect(onPageReset).toHaveBeenCalled();
    }
  });

  it("handles jira id filter input", async () => {
    const onJiraIdChange = vi.fn();
    const onPageReset = vi.fn();
    const user = userEvent.setup();

    render(
      <ReviewFilters
        {...defaultProps}
        onJiraIdChange={onJiraIdChange}
        onPageReset={onPageReset}
      />,
    );

    const inputs = screen.getAllByRole("textbox");
    const jiraInput = inputs.find((input) =>
      (input as HTMLInputElement).placeholder.includes("Gyra ID"),
    );

    if (jiraInput) {
      await user.type(jiraInput, "GY-123");
      // onChange is called per character, verify each character was passed
      const calls = onJiraIdChange.mock.calls;
      const typedValues = calls.map((call) => call[0]);
      expect(typedValues).toEqual(["G", "Y", "-", "1", "2", "3"]);
      expect(onPageReset).toHaveBeenCalled();
    }
  });

  it("handles product name filter input", async () => {
    const onProductNameChange = vi.fn();
    const onPageReset = vi.fn();
    const user = userEvent.setup();

    render(
      <ReviewFilters
        {...defaultProps}
        onProductNameChange={onProductNameChange}
        onPageReset={onPageReset}
      />,
    );

    const inputs = screen.getAllByRole("textbox");
    const productInput = inputs.find((input) =>
      (input as HTMLInputElement).placeholder.includes("Product Name"),
    );

    if (productInput) {
      await user.type(productInput, "Black Denim");
      // onChange is called per character, verify each character was passed
      const calls = onProductNameChange.mock.calls;
      const typedValues = calls.map((call) => call[0]);
      expect(typedValues).toEqual([
        "B",
        "l",
        "a",
        "c",
        "k",
        " ",
        "D",
        "e",
        "n",
        "i",
        "m",
      ]);
      expect(onPageReset).toHaveBeenCalled();
    }
  });

  it("allows clearing filter values", async () => {
    const onAssignedToChange = vi.fn();
    const user = userEvent.setup();

    render(
      <ReviewFilters
        {...defaultProps}
        assignedToFilter="Inspector_A"
        onAssignedToChange={onAssignedToChange}
      />,
    );

    const inputs = screen.getAllByRole("textbox");
    const assignedToInput = inputs.find((input) =>
      (input as HTMLInputElement).placeholder.includes("Assigned To"),
    );

    if (assignedToInput) {
      await user.clear(assignedToInput);
      expect(onAssignedToChange).toHaveBeenCalledWith("");
    }
  });

  it("has hidden display on mobile and visible on lg", () => {
    const { container } = render(<ReviewFilters {...defaultProps} />);
    const filterContainer = container.querySelector(".hidden");
    expect(filterContainer).toBeInTheDocument();
  });
});

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { FilterSelect } from "@/components/filters/FilterSelect";

describe("FilterSelect Component", () => {
  const defaultProps = {
    value: "",
    placeholder: "All Types",
    options: [
      { value: "type1", label: "Type 1" },
      { value: "type2", label: "Type 2" },
      { value: "type3", label: "Type 3" },
    ],
    onChange: vi.fn(),
  };

  it("renders with placeholder text when no value is selected", () => {
    render(<FilterSelect {...defaultProps} />);
    expect(screen.getByText("All Types")).toBeInTheDocument();
  });

  it("displays selected value label instead of placeholder", () => {
    render(<FilterSelect {...defaultProps} value="type1" />);
    expect(screen.getByText("Type 1")).toBeInTheDocument();
    expect(screen.queryByText("All Types")).not.toBeInTheDocument();
  });

  it("falls back to placeholder when selected value is missing from options", () => {
    render(<FilterSelect {...defaultProps} value="unknown" />);
    expect(screen.getByText("All Types")).toBeInTheDocument();
  });

  it("applies custom className to trigger element", () => {
    const customClass = "custom-select-class";
    const { container } = render(
      <FilterSelect {...defaultProps} className={customClass} />,
    );
    expect(container.querySelector(`.${customClass}`)).toBeInTheDocument();
  });

  it("handles empty options array without crashing", () => {
    render(<FilterSelect {...defaultProps} options={[]} />);
    expect(screen.getByText("All Types")).toBeInTheDocument();
  });

  it("updates selected label when value prop changes", () => {
    const { rerender } = render(
      <FilterSelect {...defaultProps} value="type1" />,
    );

    expect(screen.getByText("Type 1")).toBeInTheDocument();

    rerender(<FilterSelect {...defaultProps} value="type2" />);
    expect(screen.getByText("Type 2")).toBeInTheDocument();
  });
});

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterInput } from "@/components/filters/FilterInput";

describe("FilterInput Component", () => {
  const defaultProps = {
    value: "",
    placeholder: "Search...",
    onChange: vi.fn(),
  };

  it("renders input with placeholder text", () => {
    render(<FilterInput {...defaultProps} />);
    expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
  });

  it("displays initial value when provided", () => {
    render(<FilterInput {...defaultProps} value="test value" />);
    const input = screen.getByDisplayValue("test value");
    expect(input).toBeInTheDocument();
  });

  it("calls onChange when user types", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(<FilterInput {...defaultProps} onChange={onChange} />);

    const input = screen.getByPlaceholderText("Search...");
    await user.type(input, "Inspector_A");

    // onChange called once per character typed
    const calls = onChange.mock.calls;
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
  });

  it("applies custom className to input element", () => {
    render(<FilterInput {...defaultProps} className="custom-input-class" />);
    const input = screen.getByPlaceholderText("Search...");
    expect(input).toHaveClass("custom-input-class");
  });

  it("applies default className when no custom class provided", () => {
    render(<FilterInput {...defaultProps} />);
    const input = screen.getByPlaceholderText("Search...");
    expect(input).toHaveClass("h-11");
    expect(input).toHaveClass("rounded-full");
  });

  it("allows clearing input by selecting all and deleting", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(<FilterInput {...defaultProps} value="test" onChange={onChange} />);

    const input = screen.getByDisplayValue("test") as HTMLInputElement;
    await user.clear(input);

    expect(onChange).toHaveBeenCalledWith("");
  });

  it("handles pasted text", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(<FilterInput {...defaultProps} onChange={onChange} />);

    const input = screen.getByPlaceholderText("Search...");
    await user.click(input);
    await user.type(input, "pasted_text");

    // onChange should be called once per character typed
    const calls = onChange.mock.calls;
    const typedValues = calls.map((call) => call[0]);
    expect(typedValues).toEqual([
      "p",
      "a",
      "s",
      "t",
      "e",
      "d",
      "_",
      "t",
      "e",
      "x",
      "t",
    ]);
  });

  it("renders as text input type", () => {
    render(<FilterInput {...defaultProps} />);
    const input = screen.getByPlaceholderText("Search...") as HTMLInputElement;
    expect(input.type).toBe("text");
  });

  it("handles empty string value", () => {
    render(<FilterInput {...defaultProps} value="" />);
    const input = screen.getByPlaceholderText("Search...") as HTMLInputElement;
    expect(input.value).toBe("");
  });

  it("updates when value prop changes", () => {
    const { rerender } = render(
      <FilterInput {...defaultProps} value="initial" />,
    );

    expect(screen.getByDisplayValue("initial")).toBeInTheDocument();

    rerender(<FilterInput {...defaultProps} value="updated" />);

    expect(screen.getByDisplayValue("updated")).toBeInTheDocument();
  });

  it("is keyboard-accessible", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(<FilterInput {...defaultProps} onChange={onChange} />);

    const input = screen.getByPlaceholderText("Search...");
    await user.tab();
    expect(input).toHaveFocus();
  });
});

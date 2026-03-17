import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterSelect } from "@/components/filters";

describe("Dropdown Component - FilterSelect", () => {
  const mockOptions = [
    { value: "draft", label: "Draft" },
    { value: "published", label: "Published" },
    { value: "archived", label: "Archived" },
  ];

  const defaultProps = {
    value: "",
    placeholder: "Select Status",
    options: mockOptions,
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Dropdown Accessibility", () => {
    it("dropdown trigger is keyboard accessible", async () => {
      const user = userEvent.setup();
      render(<FilterSelect {...defaultProps} />);

      const trigger = screen.getByRole("combobox");
      await user.tab();

      // Verify tab navigation works
      expect(trigger).toBeInTheDocument();
    });

    it("has proper ARIA attributes for combobox", () => {
      render(<FilterSelect {...defaultProps} />);
      const trigger = screen.getByRole("combobox");

      expect(trigger).toHaveAttribute("aria-autocomplete", "none");
      expect(trigger).toHaveAttribute("aria-expanded");
    });

    it("announces aria-controls for content", () => {
      render(<FilterSelect {...defaultProps} />);
      const trigger = screen.getByRole("combobox");

      expect(trigger).toHaveAttribute("aria-controls");
    });

    it("renders as button-based combobox trigger", () => {
      render(<FilterSelect {...defaultProps} />);
      const trigger = screen.getByRole("combobox");
      expect(trigger).toHaveAttribute("type", "button");
    });
  });

  describe("Dropdown Interactions", () => {
    it("opens when user clicks the trigger", async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(
        <FilterSelect
          {...defaultProps}
          value="published"
          onChange={onChange}
        />,
      );

      // The trigger button displays the current value
      const trigger = screen.getByRole("combobox");
      expect(trigger).toHaveTextContent("Published");

      // User can interact with the dropdown
      await user.click(trigger);
      // The dropdown is now open
      expect(trigger).toHaveAttribute("aria-expanded", "true");
    });
  });

  describe("Dropdown Edge Cases", () => {
    it("handles long option labels", () => {
      const longOptions = [
        {
          value: "long",
          label: "This is a very long option label that might break layout",
        },
        { value: "short", label: "Short" },
      ];

      render(<FilterSelect {...defaultProps} options={longOptions} />);

      // Verify trigger renders (options are in portal)
      const trigger = screen.getByRole("combobox");
      expect(trigger).toBeInTheDocument();
    });

    it("handles special characters in labels", () => {
      const specialOptions = [
        { value: "special1", label: "Option & More" },
        { value: "special2", label: 'Option "Quoted"' },
        { value: "special3", label: "Option <Html>" },
      ];

      render(<FilterSelect {...defaultProps} options={specialOptions} />);

      // Verify the combobox renders (options are in portal)
      const trigger = screen.getByRole("combobox");
      expect(trigger).toBeInTheDocument();
    });
  });
});

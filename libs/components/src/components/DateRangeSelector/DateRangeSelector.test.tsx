import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { DateRangeSelector } from "./DateRangeSelector";

describe("DateRangeSelector", () => {
  const mockRanges = [
    { label: "7 days", value: "7d", days: 7 },
    { label: "30 days", value: "30d", days: 30 },
    { label: "Custom", value: "custom" },
  ];

  it("should render with default value", () => {
    render(<DateRangeSelector />);

    // Should show default "30 days" selection
    expect(screen.getByText("30 days")).toBeInTheDocument();
  });

  it("should render with custom default value", () => {
    render(<DateRangeSelector defaultValue="7d" />);

    expect(screen.getByText("7 days")).toBeInTheDocument();
  });

  it("should render with custom ranges", () => {
    render(<DateRangeSelector ranges={mockRanges} defaultValue="7d" />);

    expect(screen.getByText("7 days")).toBeInTheDocument();
  });

  it("should show dropdown when trigger is clicked", () => {
    render(<DateRangeSelector ranges={mockRanges} />);

    const trigger = screen.getByRole("button");
    fireEvent.click(trigger);

    expect(screen.getByText("7 days")).toBeInTheDocument();
    expect(screen.getByText("Custom")).toBeInTheDocument();
  });

  it("should hide dropdown initially", () => {
    render(<DateRangeSelector ranges={mockRanges} />);

    // Only the selected option should be visible, not the dropdown options
    expect(screen.getAllByText("30 days")).toHaveLength(1);
  });

  it("should handle range selection", () => {
    const onChange = vi.fn();
    render(<DateRangeSelector ranges={mockRanges} onChange={onChange} />);

    const trigger = screen.getByRole("button");
    fireEvent.click(trigger);

    const sevenDayOption = screen.getAllByText("7 days").find((el) => el.tagName === "BUTTON" && el.getAttribute("aria-current") !== "true");
    fireEvent.click(sevenDayOption!);

    expect(onChange).toHaveBeenCalledWith({ label: "7 days", value: "7d", days: 7 });
  });

  it("should close dropdown after selection", () => {
    render(<DateRangeSelector ranges={mockRanges} defaultValue="30d" />);

    const trigger = screen.getByRole("button");
    fireEvent.click(trigger);

    // Dropdown should be open - should see both trigger and dropdown options
    expect(screen.getAllByText("30 days")).toHaveLength(2); // trigger + dropdown option
    expect(screen.getByText("7 days")).toBeInTheDocument();

    // Click the 7 days option
    const sevenDayOption = screen.getAllByText("7 days").find((el) => el.tagName === "BUTTON");
    fireEvent.click(sevenDayOption!);

    // Dropdown should be closed - only trigger text should be visible
    expect(screen.getAllByText("7 days")).toHaveLength(1);
  });

  it("should update selected state visually", () => {
    render(<DateRangeSelector ranges={mockRanges} defaultValue="7d" />);

    const trigger = screen.getByRole("button");
    fireEvent.click(trigger);

    // Find the dropdown option button (not the trigger)
    const options = screen.getAllByText("7 days");
    const selectedOption = options.find((el) => el.closest("button")?.getAttribute("aria-current") === "true");
    expect(selectedOption?.closest("button")).toHaveAttribute("aria-current", "true");
  });

  it("should close dropdown on outside click", () => {
    render(
      <div>
        <DateRangeSelector ranges={mockRanges} />
        <div data-testid="outside">Outside element</div>
      </div>,
    );

    const trigger = screen.getByRole("button");
    fireEvent.click(trigger);

    // Dropdown should be open - should have trigger + dropdown options
    expect(screen.getAllByText("30 days")).toHaveLength(2);

    // Click outside
    fireEvent.mouseDown(screen.getByTestId("outside"));

    // Dropdown should be closed - should only have trigger text
    expect(screen.getAllByText("30 days")).toHaveLength(1);
  });

  it("should apply custom className", () => {
    const { container } = render(<DateRangeSelector className="custom-selector" />);

    expect(container.firstChild).toHaveClass("custom-selector");
  });

  it("should have proper accessibility attributes", () => {
    render(<DateRangeSelector ranges={mockRanges} />);

    const trigger = screen.getByRole("button");
    expect(trigger).toHaveAttribute("aria-haspopup", "listbox");
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("should render calendar icon", () => {
    const { container } = render(<DateRangeSelector />);

    const icon = container.querySelector("svg");
    expect(icon).toBeInTheDocument();
  });

  it("should render chevron icon", () => {
    const { container } = render(<DateRangeSelector />);

    const chevrons = container.querySelectorAll("svg");
    expect(chevrons).toHaveLength(2); // Calendar icon + chevron
  });

  it("should fall back to first range when defaultValue not found", () => {
    render(<DateRangeSelector ranges={mockRanges} defaultValue="invalid" />);

    // Should fall back to first range "7 days"
    expect(screen.getByText("7 days")).toBeInTheDocument();
  });

  it("should toggle dropdown open/close on trigger click", () => {
    render(<DateRangeSelector ranges={mockRanges} />);

    const trigger = screen.getByRole("button");

    // Initially closed
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    // Click to open
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    // Click to close
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("should cleanup event listeners on unmount", () => {
    const removeEventListenerSpy = vi.spyOn(document, "removeEventListener");
    const { unmount } = render(<DateRangeSelector />);

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith("mousedown", expect.any(Function));

    removeEventListenerSpy.mockRestore();
  });
});

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Toggle } from "./Toggle";

describe("Toggle", () => {
  it("should render with default props", () => {
    render(<Toggle />);
    const toggle = screen.getByRole("switch");
    expect(toggle).toBeInTheDocument();
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(toggle).toHaveAttribute("aria-disabled", "false");
  });

  it("should render checked when defaultChecked is true", () => {
    render(<Toggle defaultChecked />);
    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "true");
  });

  it("should be controlled when checked prop is provided", () => {
    const { rerender } = render(<Toggle checked={false} />);
    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "false");

    rerender(<Toggle checked={true} />);
    expect(toggle).toHaveAttribute("aria-checked", "true");
  });

  it("should call onChange when clicked", () => {
    const onChange = vi.fn();
    render(<Toggle onChange={onChange} />);
    const toggle = screen.getByRole("switch");

    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith(true);

    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("should handle keyboard events", () => {
    const onChange = vi.fn();
    render(<Toggle onChange={onChange} />);
    const toggle = screen.getByRole("switch");

    fireEvent.keyDown(toggle, { key: " " });
    expect(onChange).toHaveBeenCalledWith(true);

    fireEvent.keyDown(toggle, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("should not respond to clicks or keyboard when disabled", () => {
    const onChange = vi.fn();
    render(<Toggle disabled onChange={onChange} />);
    const toggle = screen.getByRole("switch");

    expect(toggle).toHaveAttribute("aria-disabled", "true");
    expect(toggle).toHaveAttribute("tabIndex", "-1");

    fireEvent.click(toggle);
    fireEvent.keyDown(toggle, { key: " " });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("should render with different sizes", () => {
    const { rerender } = render(<Toggle size="sm" />);
    let toggle = screen.getByRole("switch");
    expect(toggle.className).toContain("sm");

    rerender(<Toggle size="lg" />);
    toggle = screen.getByRole("switch");
    expect(toggle.className).toContain("lg");
  });

  it("should render with label on the right by default", () => {
    render(<Toggle label="Test Label" />);
    const label = screen.getByText("Test Label");
    const _toggle = screen.getByRole("switch");

    expect(label).toBeInTheDocument();
    expect(screen.getByLabelText("Test Label")).toBe(screen.getByRole("checkbox"));
  });

  it("should render with label on the left when specified", () => {
    render(<Toggle label="Test Label" labelPosition="left" />);
    const label = screen.getByText("Test Label");
    expect(label).toBeInTheDocument();
  });

  it("should apply custom className", () => {
    const { container } = render(<Toggle className="custom-class" />);
    expect(container.firstChild).toHaveClass("custom-class");
  });

  it("should have proper accessibility attributes without label", () => {
    render(<Toggle />);
    const input = screen.getByRole("checkbox");
    expect(input).toHaveAttribute("aria-label", "Toggle");
  });

  it("should work with uncontrolled component pattern", () => {
    const onChange = vi.fn();
    render(<Toggle defaultChecked={false} onChange={onChange} />);
    const toggle = screen.getByRole("switch");

    expect(toggle).toHaveAttribute("aria-checked", "false");
    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith(true);
    expect(toggle).toHaveAttribute("aria-checked", "true");
  });
});

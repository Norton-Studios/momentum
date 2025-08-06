import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Alert } from "./Alert";

describe("Alert", () => {
  it("renders title and children correctly", () => {
    render(<Alert title="Test Title">Test message</Alert>);
    expect(screen.getByText("Test Title")).toBeInTheDocument();
    expect(screen.getByText("Test message")).toBeInTheDocument();
  });

  it("renders children without title", () => {
    render(<Alert>Test message only</Alert>);
    expect(screen.getByText("Test message only")).toBeInTheDocument();
  });

  it("applies info variant class by default", () => {
    render(<Alert>Info message</Alert>);
    const alert = screen.getByRole("alert");
    expect(alert.className).toContain("info");
  });

  it("applies success variant class", () => {
    render(<Alert variant="success">Success message</Alert>);
    const alert = screen.getByRole("alert");
    expect(alert.className).toContain("success");
  });

  it("applies warning variant class", () => {
    render(<Alert variant="warning">Warning message</Alert>);
    const alert = screen.getByRole("alert");
    expect(alert.className).toContain("warning");
  });

  it("applies error variant class", () => {
    render(<Alert variant="error">Error message</Alert>);
    const alert = screen.getByRole("alert");
    expect(alert.className).toContain("error");
  });

  it("shows dismiss button when dismissible is true", () => {
    render(<Alert dismissible>Can be dismissed</Alert>);
    const dismissButton = screen.getByRole("button", { name: /dismiss/i });
    expect(dismissButton).toBeInTheDocument();
  });

  it("does not show dismiss button when dismissible is false", () => {
    render(<Alert dismissible={false}>Cannot be dismissed</Alert>);
    const dismissButton = screen.queryByRole("button", { name: /dismiss/i });
    expect(dismissButton).not.toBeInTheDocument();
  });

  it("calls onDismiss when dismiss button is clicked", () => {
    const handleDismiss = vi.fn();
    render(
      <Alert dismissible onDismiss={handleDismiss}>
        Test
      </Alert>,
    );

    const dismissButton = screen.getByRole("button", { name: /dismiss/i });
    fireEvent.click(dismissButton);
    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });

  it("displays correct icon for each variant", () => {
    const { rerender } = render(<Alert variant="info">Info</Alert>);
    expect(screen.getByText("💡")).toBeInTheDocument();

    rerender(<Alert variant="success">Success</Alert>);
    expect(screen.getByText("✅")).toBeInTheDocument();

    rerender(<Alert variant="warning">Warning</Alert>);
    expect(screen.getByText("⚠️")).toBeInTheDocument();

    rerender(<Alert variant="error">Error</Alert>);
    expect(screen.getByText("❌")).toBeInTheDocument();
  });
});

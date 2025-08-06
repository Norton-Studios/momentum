import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { FormInput } from "./FormInput";

describe("FormInput", () => {
  it("should render basic input", () => {
    render(<FormInput placeholder="Enter text" />);
    const input = screen.getByPlaceholderText("Enter text");
    expect(input).toBeInTheDocument();
  });

  it("should render with label", () => {
    render(<FormInput label="Username" id="username" />);

    const label = screen.getByText("Username");
    const input = screen.getByLabelText("Username");

    expect(label).toBeInTheDocument();
    expect(input).toBeInTheDocument();
  });

  it("should show required asterisk when required", () => {
    render(<FormInput label="Email" required />);

    const asterisk = screen.getByText("*");
    expect(asterisk).toBeInTheDocument();
  });

  it("should display error message and error icon", () => {
    render(<FormInput label="Password" error="Password is required" />);

    const errorText = screen.getByText("Password is required");
    const errorIcon = screen.getByRole("generic").querySelector("svg");

    expect(errorText).toBeInTheDocument();
    expect(errorIcon).toBeInTheDocument();
  });

  it("should display success icon when success is true", () => {
    render(<FormInput label="Email" success />);

    const input = screen.getByLabelText("Email");
    const successIcon = input.parentElement?.querySelector("svg");

    expect(input.className).toContain("success");
    expect(successIcon).toBeInTheDocument();
  });

  it("should not show success icon when there is an error", () => {
    render(<FormInput label="Email" success error="Invalid email" />);

    const input = screen.getByLabelText("Email");
    expect(input.className).toContain("error");
    expect(input.className).not.toContain("success");
  });

  it("should display helper text", () => {
    render(<FormInput label="Password" helperText="Must be at least 8 characters" />);

    const helperText = screen.getByText("Must be at least 8 characters");
    expect(helperText).toBeInTheDocument();
  });

  it("should prioritize error over helper text", () => {
    render(<FormInput label="Password" helperText="Helper text" error="Error message" />);

    expect(screen.getByText("Error message")).toBeInTheDocument();
    expect(screen.queryByText("Helper text")).not.toBeInTheDocument();
  });

  it("should render with icon", () => {
    const TestIcon = <span data-testid="test-icon">🔍</span>;
    render(<FormInput label="Search" icon={TestIcon} />);

    const icon = screen.getByTestId("test-icon");
    const input = screen.getByLabelText("Search");

    expect(icon).toBeInTheDocument();
    expect(input.className).toContain("withIcon");
  });

  it("should apply fullWidth class", () => {
    const { container } = render(<FormInput fullWidth />);

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain("fullWidth");
  });

  it("should apply custom className", () => {
    const { container } = render(<FormInput className="custom-input" />);

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass("custom-input");
  });

  it("should forward ref to input element", () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<FormInput ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it("should handle input changes", () => {
    const onChange = vi.fn();
    render(<FormInput onChange={onChange} />);

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "test value" } });

    expect(onChange).toHaveBeenCalled();
  });

  it("should pass through all input props", () => {
    render(<FormInput type="email" placeholder="Enter email" disabled />);

    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("type", "email");
    expect(input).toHaveAttribute("placeholder", "Enter email");
    expect(input).toBeDisabled();
  });

  it("should have correct accessibility attributes", () => {
    render(<FormInput label="Username" id="username" required />);

    const input = screen.getByLabelText("Username");
    const label = screen.getByText("Username");

    expect(label).toHaveAttribute("for", "username");
    expect(input).toHaveAttribute("id", "username");
  });

  it("should display error styling correctly", () => {
    render(<FormInput error="Invalid input" />);

    const input = screen.getByRole("textbox");
    const errorText = screen.getByText("Invalid input");

    expect(input.className).toContain("error");
    expect(errorText.className).toContain("errorText");
  });
});

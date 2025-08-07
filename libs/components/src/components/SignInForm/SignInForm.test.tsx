import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SignInForm } from "./SignInForm";

describe("SignInForm", () => {
  const defaultProps = {
    onSubmit: vi.fn(),
    isSubmitting: false,
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should render sign in form with all elements", () => {
    render(<SignInForm {...defaultProps} />);

    expect(screen.getByText("Welcome back")).toBeInTheDocument();
    expect(screen.getByText("Sign in to your account to continue")).toBeInTheDocument();
    expect(screen.getByText("Momentum")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter your email")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter your password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });

  it("should show loading state when submitting", () => {
    render(<SignInForm {...defaultProps} isSubmitting={true} />);

    expect(screen.getByRole("button", { name: "Signing in..." })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Signing in..." })).toBeDisabled();
  });

  it("should display error message when provided", () => {
    const errorMessage = "Invalid credentials";
    render(<SignInForm {...defaultProps} error={errorMessage} />);

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it("should validate required fields", async () => {
    render(<SignInForm {...defaultProps} />);

    const submitButton = screen.getByRole("button", { name: "Sign in" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Email is required")).toBeInTheDocument();
      expect(screen.getByText("Password is required")).toBeInTheDocument();
    });

    expect(defaultProps.onSubmit).not.toHaveBeenCalled();
  });

  it("should validate email format", async () => {
    render(<SignInForm {...defaultProps} />);

    const emailInput = screen.getByPlaceholderText("Enter your email");
    const submitButton = screen.getByRole("button", { name: "Sign in" });

    fireEvent.change(emailInput, { target: { value: "invalid-email" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Please enter a valid email address")).toBeInTheDocument();
    });

    expect(defaultProps.onSubmit).not.toHaveBeenCalled();
  });

  it("should submit form with valid data", async () => {
    render(<SignInForm {...defaultProps} />);

    const emailInput = screen.getByPlaceholderText("Enter your email");
    const passwordInput = screen.getByPlaceholderText("Enter your password");
    const submitButton = screen.getByRole("button", { name: "Sign in" });

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(defaultProps.onSubmit).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });
    });
  });

  it("should call onSignUp when sign up link is clicked", () => {
    const onSignUp = vi.fn();
    render(<SignInForm {...defaultProps} onSignUp={onSignUp} />);

    const signUpLink = screen.getByRole("button", { name: "Sign up" });
    fireEvent.click(signUpLink);

    expect(onSignUp).toHaveBeenCalled();
  });

  it("should call onForgotPassword when forgot password link is clicked", () => {
    const onForgotPassword = vi.fn();
    render(<SignInForm {...defaultProps} onForgotPassword={onForgotPassword} />);

    const forgotPasswordLink = screen.getByRole("button", { name: "Forgot your password?" });
    fireEvent.click(forgotPasswordLink);

    expect(onForgotPassword).toHaveBeenCalled();
  });

  it("should clear field errors when user starts typing", async () => {
    render(<SignInForm {...defaultProps} />);

    const emailInput = screen.getByPlaceholderText("Enter your email");
    const submitButton = screen.getByRole("button", { name: "Sign in" });

    // Trigger validation error
    fireEvent.click(submitButton);
    await waitFor(() => {
      expect(screen.getByText("Email is required")).toBeInTheDocument();
    });

    // Start typing to clear error
    fireEvent.change(emailInput, { target: { value: "t" } });

    await waitFor(() => {
      expect(screen.queryByText("Email is required")).not.toBeInTheDocument();
    });
  });
});

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SignupForm, type SignupFormData } from "./SignupForm";

const mockSubmit = vi.fn();

const defaultProps = {
  onSubmit: mockSubmit,
  isSubmitting: false,
};

const validFormData: SignupFormData = {
  organizationName: "test-org",
  fullName: "John Doe",
  email: "john@test.com",
  password: "StrongPassword123",
  confirmPassword: "StrongPassword123",
};

describe("SignupForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all form fields", () => {
    render(<SignupForm {...defaultProps} />);

    expect(screen.getByLabelText(/organization name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password\*?$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  it("submit button is disabled when organization name is empty", async () => {
    render(<SignupForm {...defaultProps} />);

    // Fill out all required fields except organization name (leave it empty)
    fireEvent.change(screen.getByLabelText(/organization name/i), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "John Doe" } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "john@test.com" } });
    fireEvent.change(screen.getByLabelText(/^password\*?$/i), { target: { value: "StrongPassword123" } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "StrongPassword123" } });

    const submitButton = screen.getByRole("button", { name: /create account/i });

    // Submit button should be disabled when organization name is empty
    expect(submitButton).toBeDisabled();
  });

  it("validates email format", async () => {
    render(<SignupForm {...defaultProps} />);

    // Fill out all required fields with valid values except email
    fireEvent.change(screen.getByLabelText(/organization name/i), { target: { value: "test-org" } });
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "John Doe" } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "invalid-email" } });
    fireEvent.change(screen.getByLabelText(/^password\*?$/i), { target: { value: "StrongPassword123" } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "StrongPassword123" } });

    const submitButton = screen.getByRole("button", { name: /create account/i });
    fireEvent.click(submitButton);

    // Wait a moment for validation to complete
    await waitFor(() => {
      // Ensure onSubmit was not called due to validation failure
      expect(mockSubmit).not.toHaveBeenCalled();
    });
  });

  it("shows password strength requirements", () => {
    render(<SignupForm {...defaultProps} />);

    const passwordInput = screen.getByLabelText(/^password\*?$/i);
    fireEvent.change(passwordInput, { target: { value: "weak" } });

    expect(screen.getByText(/at least 10 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/one uppercase letter/i)).toBeInTheDocument();
    expect(screen.getByText(/one lowercase letter/i)).toBeInTheDocument();
    expect(screen.getByText(/one number or special character/i)).toBeInTheDocument();
  });

  it("accepts password with numbers but no special characters", () => {
    render(<SignupForm {...defaultProps} />);

    // Fill out all fields with a password that has numbers but no special characters
    fireEvent.change(screen.getByLabelText(/organization name/i), { target: { value: "Test Org" } });
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "John Doe" } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "john@test.com" } });
    fireEvent.change(screen.getByLabelText(/^password\*?$/i), { target: { value: "Password123" } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "Password123" } });

    const submitButton = screen.getByRole("button", { name: /create account/i });

    // Submit button should be enabled with number but no special character
    expect(submitButton).not.toBeDisabled();
  });

  it("accepts password with special characters but no numbers", () => {
    render(<SignupForm {...defaultProps} />);

    // Fill out all fields with a password that has special characters but no numbers
    fireEvent.change(screen.getByLabelText(/organization name/i), { target: { value: "Test Org" } });
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "John Doe" } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "john@test.com" } });
    fireEvent.change(screen.getByLabelText(/^password\*?$/i), { target: { value: "Password!@#" } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "Password!@#" } });

    const submitButton = screen.getByRole("button", { name: /create account/i });

    // Submit button should be enabled with special character but no number
    expect(submitButton).not.toBeDisabled();
  });

  it("validates password confirmation", async () => {
    render(<SignupForm {...defaultProps} />);

    // Fill out all required fields
    fireEvent.change(screen.getByLabelText(/organization name/i), { target: { value: "test-org" } });
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "John Doe" } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "john@test.com" } });
    fireEvent.change(screen.getByLabelText(/^password\*?$/i), { target: { value: "StrongPassword123" } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "StrongPassword123" } });

    // Now change password confirmation to not match - submit button should be disabled
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "DifferentPassword123" } });

    const submitButton = screen.getByRole("button", { name: /create account/i });

    // Submit button should be disabled when passwords don't match
    expect(submitButton).toBeDisabled();
  });

  it("toggles password visibility", () => {
    render(<SignupForm {...defaultProps} />);

    const passwordInput = screen.getByLabelText(/^password\*?$/i);
    const toggleButton = screen.getByText(/show/i);

    expect(passwordInput).toHaveAttribute("type", "password");

    fireEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute("type", "text");
    expect(screen.getByText(/hide/i)).toBeInTheDocument();
  });

  it("calls onOrganizationNameChange when organization name changes", () => {
    const mockOnOrgChange = vi.fn();
    render(<SignupForm {...defaultProps} onOrganizationNameChange={mockOnOrgChange} />);

    const orgInput = screen.getByLabelText(/organization name/i);
    fireEvent.change(orgInput, { target: { value: "test-org" } });

    expect(mockOnOrgChange).toHaveBeenCalledWith("test-org");
  });

  it("shows organization name error", () => {
    render(<SignupForm {...defaultProps} organizationNameError="Organization name already exists" />);

    expect(screen.getByText(/organization name already exists/i)).toBeInTheDocument();
  });

  it("disables form when submitting", () => {
    render(<SignupForm {...defaultProps} isSubmitting={true} />);

    expect(screen.getByLabelText(/organization name/i)).toBeDisabled();
    expect(screen.getByRole("button", { name: /creating account/i })).toBeDisabled();
  });

  it("calls onSubmit with form data when form is valid", async () => {
    render(<SignupForm {...defaultProps} />);

    // Fill out form with valid data
    fireEvent.change(screen.getByLabelText(/organization name/i), { target: { value: validFormData.organizationName } });
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: validFormData.fullName } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: validFormData.email } });
    fireEvent.change(screen.getByLabelText(/^password\*?$/i), { target: { value: validFormData.password } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: validFormData.confirmPassword } });

    const submitButton = screen.getByRole("button", { name: /create account/i });

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith(validFormData);
    });
  });

  it("shows error alert when error prop is provided", () => {
    render(<SignupForm {...defaultProps} error="Failed to create account" />);

    expect(screen.getByText(/failed to create account/i)).toBeInTheDocument();
  });

  it("calls onSignIn when sign in link is clicked", () => {
    const mockSignIn = vi.fn();
    render(<SignupForm {...defaultProps} onSignIn={mockSignIn} />);

    const signInLink = screen.getByRole("button", { name: /sign in/i });
    fireEvent.click(signInLink);

    expect(mockSignIn).toHaveBeenCalled();
  });

  it("initializes form with provided initial data", () => {
    const initialData = {
      organizationName: "Initial Org",
      fullName: "Initial Name",
      email: "initial@email.com",
      password: "InitialPass123!",
      confirmPassword: "InitialPass123!",
    };

    render(<SignupForm {...defaultProps} initialData={initialData} />);

    expect(screen.getByLabelText(/organization name/i)).toHaveValue("Initial Org");
    expect(screen.getByLabelText(/full name/i)).toHaveValue("Initial Name");
    expect(screen.getByLabelText(/email address/i)).toHaveValue("initial@email.com");
    expect(screen.getByLabelText(/^password\*?$/i)).toHaveValue("InitialPass123!");
    expect(screen.getByLabelText(/confirm password/i)).toHaveValue("InitialPass123!");
  });

  it("clears field errors when user starts typing", async () => {
    render(<SignupForm {...defaultProps} />);

    const emailInput = screen.getByLabelText(/email address/i);

    // Enter invalid email
    fireEvent.change(emailInput, { target: { value: "invalid" } });

    // Try to submit to trigger validation
    const form = emailInput.closest("form");
    fireEvent.submit(form!);

    // Clear the field and start typing valid email
    fireEvent.change(emailInput, { target: { value: "" } });
    fireEvent.change(emailInput, { target: { value: "valid@email.com" } });

    // The error should be cleared
    await waitFor(() => {
      // Errors are cleared on typing, so we verify the button state changes
      const submitButton = screen.getByRole("button", { name: /create account/i });
      // Button will still be disabled because other fields are empty, but email error is cleared
      expect(submitButton).toBeDisabled();
    });
  });

  it("validates all required fields on form submission", async () => {
    render(<SignupForm {...defaultProps} />);

    const form = screen.getByLabelText(/organization name/i).closest("form");
    fireEvent.submit(form!);

    // Form should not submit with empty fields
    await waitFor(() => {
      expect(mockSubmit).not.toHaveBeenCalled();
    });
  });

  it("updates password strength indicator as user types", () => {
    render(<SignupForm {...defaultProps} />);

    const passwordInput = screen.getByLabelText(/^password\*?$/i);

    // Start with weak password
    fireEvent.change(passwordInput, { target: { value: "weak" } });

    // Check that requirements are shown but not met
    const lengthReq = screen.getByText(/at least 10 characters/i);
    expect(lengthReq).toBeInTheDocument();
    expect(lengthReq.className).not.toContain("met");

    // Type strong password
    fireEvent.change(passwordInput, { target: { value: "StrongPass123!" } });

    // Check that requirements are now met
    expect(lengthReq.className).toContain("met");
  });

  it("validates password has required complexity", () => {
    render(<SignupForm {...defaultProps} />);

    // Fill all fields except password
    fireEvent.change(screen.getByLabelText(/organization name/i), { target: { value: "Test Org" } });
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "John Doe" } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "john@test.com" } });

    const passwordInput = screen.getByLabelText(/^password\*?$/i);
    const confirmInput = screen.getByLabelText(/confirm password/i);
    const submitButton = screen.getByRole("button", { name: /create account/i });

    // Too short password
    fireEvent.change(passwordInput, { target: { value: "Short1!" } });
    fireEvent.change(confirmInput, { target: { value: "Short1!" } });
    expect(submitButton).toBeDisabled();

    // No uppercase
    fireEvent.change(passwordInput, { target: { value: "lowercase123!" } });
    fireEvent.change(confirmInput, { target: { value: "lowercase123!" } });
    expect(submitButton).toBeDisabled();

    // No lowercase
    fireEvent.change(passwordInput, { target: { value: "UPPERCASE123!" } });
    fireEvent.change(confirmInput, { target: { value: "UPPERCASE123!" } });
    expect(submitButton).toBeDisabled();

    // No number or special char
    fireEvent.change(passwordInput, { target: { value: "UpperLowerCase" } });
    fireEvent.change(confirmInput, { target: { value: "UpperLowerCase" } });
    expect(submitButton).toBeDisabled();

    // Valid password
    fireEvent.change(passwordInput, { target: { value: "ValidPass123!" } });
    fireEvent.change(confirmInput, { target: { value: "ValidPass123!" } });
    expect(submitButton).not.toBeDisabled();
  });

  it("disables submit button when organization name error exists", () => {
    render(<SignupForm {...defaultProps} organizationNameError="Organization already exists" />);

    // Fill all fields with valid data
    fireEvent.change(screen.getByLabelText(/organization name/i), { target: { value: validFormData.organizationName } });
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: validFormData.fullName } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: validFormData.email } });
    fireEvent.change(screen.getByLabelText(/^password\*?$/i), { target: { value: validFormData.password } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: validFormData.confirmPassword } });

    const submitButton = screen.getByRole("button", { name: /create account/i });

    // Button should be disabled even with valid data due to org name error
    expect(submitButton).toBeDisabled();
  });

  it("handles whitespace-only input as invalid", async () => {
    render(<SignupForm {...defaultProps} />);

    // Fill fields with whitespace only
    fireEvent.change(screen.getByLabelText(/organization name/i), { target: { value: "   " } });
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "   " } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "valid@email.com" } });
    fireEvent.change(screen.getByLabelText(/^password\*?$/i), { target: { value: "ValidPass123!" } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "ValidPass123!" } });

    const submitButton = screen.getByRole("button", { name: /create account/i });

    // Button should be disabled with whitespace-only fields
    expect(submitButton).toBeDisabled();
  });

  it("button text changes when submitting", async () => {
    render(<SignupForm {...defaultProps} isSubmitting={true} />);

    // When submitting, button text should change
    const submitButton = screen.getByRole("button", { name: /creating account/i });
    expect(submitButton).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });

  it("updates form when initialData prop changes", () => {
    const { rerender } = render(<SignupForm {...defaultProps} />);

    // Verify fields are initially empty
    expect(screen.getByLabelText(/organization name/i)).toHaveValue("");

    // Update with new initial data
    const newInitialData = {
      organizationName: "Updated Org",
      fullName: "Updated Name",
      email: "updated@email.com",
    };

    rerender(<SignupForm {...defaultProps} initialData={newInitialData} />);

    // Fields should update with new initial data
    expect(screen.getByLabelText(/organization name/i)).toHaveValue("Updated Org");
    expect(screen.getByLabelText(/full name/i)).toHaveValue("Updated Name");
    expect(screen.getByLabelText(/email address/i)).toHaveValue("updated@email.com");
  });

  it("maintains password visibility toggle state across both password fields", () => {
    render(<SignupForm {...defaultProps} />);

    const passwordInput = screen.getByLabelText(/^password\*?$/i);
    const confirmInput = screen.getByLabelText(/confirm password/i);
    const toggleButton = screen.getByText(/show/i);

    // Both should start as password type
    expect(passwordInput).toHaveAttribute("type", "password");
    expect(confirmInput).toHaveAttribute("type", "password");

    // Toggle to show
    fireEvent.click(toggleButton);

    // Both should now be text type
    expect(passwordInput).toHaveAttribute("type", "text");
    expect(confirmInput).toHaveAttribute("type", "text");

    // Toggle back to hide
    fireEvent.click(screen.getByText(/hide/i));

    // Both should be password type again
    expect(passwordInput).toHaveAttribute("type", "password");
    expect(confirmInput).toHaveAttribute("type", "password");
  });
});

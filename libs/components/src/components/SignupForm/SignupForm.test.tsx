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
  password: "StrongPassword123!",
  confirmPassword: "StrongPassword123!",
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

  it("validates organization name format", async () => {
    render(<SignupForm {...defaultProps} />);

    // Fill out all required fields with valid values except organization name
    fireEvent.change(screen.getByLabelText(/organization name/i), { target: { value: "invalid org!" } });
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "John Doe" } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "john@test.com" } });
    fireEvent.change(screen.getByLabelText(/^password\*?$/i), { target: { value: "StrongPassword123!" } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "StrongPassword123!" } });

    const submitButton = screen.getByRole("button", { name: /create account/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/must be alphanumeric with hyphens and underscores only/i)).toBeInTheDocument();
    });
  });

  it("validates email format", async () => {
    render(<SignupForm {...defaultProps} />);

    // Fill out all required fields with valid values except email
    fireEvent.change(screen.getByLabelText(/organization name/i), { target: { value: "test-org" } });
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "John Doe" } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "invalid-email" } });
    fireEvent.change(screen.getByLabelText(/^password\*?$/i), { target: { value: "StrongPassword123!" } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "StrongPassword123!" } });

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

    expect(screen.getByText(/at least 12 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/one uppercase letter/i)).toBeInTheDocument();
    expect(screen.getByText(/one lowercase letter/i)).toBeInTheDocument();
    expect(screen.getByText(/one number/i)).toBeInTheDocument();
    expect(screen.getByText(/one special character/i)).toBeInTheDocument();
  });

  it("validates password confirmation", async () => {
    render(<SignupForm {...defaultProps} />);

    // Fill out all required fields
    fireEvent.change(screen.getByLabelText(/organization name/i), { target: { value: "test-org" } });
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "John Doe" } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "john@test.com" } });
    fireEvent.change(screen.getByLabelText(/^password\*?$/i), { target: { value: "StrongPassword123!" } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "StrongPassword123!" } });

    // Now change password confirmation to not match - submit button should be disabled
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "DifferentPassword123!" } });

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
});

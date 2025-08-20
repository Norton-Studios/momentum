import type React from "react";
import { useState } from "react";
import { FormInput } from "../FormInput/FormInput";
import { Alert } from "../Alert/Alert";
import styles from "./SignupForm.module.css";

export interface SignupFormData {
  organizationName: string;
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface SignupFormProps {
  onSubmit: (data: SignupFormData) => Promise<void>;
  isSubmitting?: boolean;
  error?: string;
  organizationNameError?: string;
  onOrganizationNameChange?: (name: string) => void;
  onSignIn?: () => void;
}

export function SignupForm({ onSubmit, isSubmitting = false, error, organizationNameError, onOrganizationNameChange, onSignIn }: SignupFormProps) {
  const [formData, setFormData] = useState<SignupFormData>({
    organizationName: "",
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [passwordStrength, setPasswordStrength] = useState({
    hasLowercase: false,
    hasUppercase: false,
    hasNumber: false,
    hasSpecial: false,
    hasLength: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<Partial<SignupFormData>>({});

  const validatePassword = (password: string) => {
    const strength = {
      hasLowercase: /[a-z]/.test(password),
      hasUppercase: /[A-Z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecial: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
      hasLength: password.length >= 12,
    };
    setPasswordStrength(strength);
    return strength;
  };

  const handleInputChange = (field: keyof SignupFormData, value: string) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);

    // Clear field error when user starts typing
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    }

    // Special handling for organization name
    if (field === "organizationName") {
      onOrganizationNameChange?.(value);
    }

    // Validate password in real-time
    if (field === "password") {
      validatePassword(value);
    }
  };

  const validateForm = (): boolean => {
    const errors: Partial<SignupFormData> = {};

    if (!formData.organizationName.trim()) {
      errors.organizationName = "Organization name is required";
    } else if (!/^[a-zA-Z0-9-_]+$/.test(formData.organizationName)) {
      errors.organizationName = "Organization name must be alphanumeric with hyphens and underscores only";
    }

    if (!formData.fullName.trim()) {
      errors.fullName = "Full name is required";
    }

    if (!formData.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      errors.password = "Password is required";
    } else {
      const strength = validatePassword(formData.password);
      if (!Object.values(strength).every(Boolean)) {
        errors.password = "Password does not meet requirements";
      }
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || isSubmitting) {
      return;
    }

    await onSubmit(formData);
  };

  const getPasswordStrengthColor = () => {
    const validCount = Object.values(passwordStrength).filter(Boolean).length;
    if (validCount < 2) return "#ef4444"; // red
    if (validCount < 4) return "#f59e0b"; // yellow
    return "#10b981"; // green
  };

  const isFormValid =
    Object.values(passwordStrength).every(Boolean) &&
    formData.password === formData.confirmPassword &&
    formData.organizationName.trim() &&
    formData.fullName.trim() &&
    formData.email.trim() &&
    !organizationNameError;

  return (
    <div className="auth-container">
      <div className="auth-card auth-card-wide">
        <div className="auth-logo">
          <div className="auth-logo-icon" />
          <span className="auth-logo-text">Momentum</span>
        </div>
        <div className="auth-header">
          <h1 className="auth-title">Create Your Account</h1>
          <p className="auth-subtitle">Start measuring your team's productivity</p>
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <FormInput
            id="organizationName"
            label="Organization Name"
            type="text"
            value={formData.organizationName}
            onChange={(value) => handleInputChange("organizationName", value)}
            error={formErrors.organizationName || organizationNameError}
            placeholder="acme-corp"
            required
            disabled={isSubmitting}
            helperText="This will be your organization's unique identifier"
          />

          <FormInput
            id="fullName"
            label="Full Name"
            type="text"
            value={formData.fullName}
            onChange={(value) => handleInputChange("fullName", value)}
            error={formErrors.fullName}
            placeholder="John Doe"
            required
            disabled={isSubmitting}
          />

          <FormInput
            id="email"
            label="Email Address"
            type="email"
            value={formData.email}
            onChange={(value) => handleInputChange("email", value)}
            error={formErrors.email}
            placeholder="john@acme-corp.com"
            required
            disabled={isSubmitting}
          />

          <div className={styles.passwordField}>
            <FormInput
              id="password"
              label="Password"
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={(value) => handleInputChange("password", value)}
              error={formErrors.password}
              placeholder="Create a strong password"
              required
              disabled={isSubmitting}
            />

            <button type="button" className={styles.togglePassword} onClick={() => setShowPassword(!showPassword)} disabled={isSubmitting}>
              {showPassword ? "Hide" : "Show"}
            </button>

            {formData.password && (
              <div className={styles.passwordStrength}>
                <div className={styles.strengthBar}>
                  <div
                    className={styles.strengthFill}
                    style={{
                      width: `${(Object.values(passwordStrength).filter(Boolean).length / 5) * 100}%`,
                      backgroundColor: getPasswordStrengthColor(),
                    }}
                  />
                </div>
                <div className={styles.requirements}>
                  <div className={`${styles.requirement} ${passwordStrength.hasLength ? styles.met : ""}`}>✓ At least 12 characters</div>
                  <div className={`${styles.requirement} ${passwordStrength.hasUppercase ? styles.met : ""}`}>✓ One uppercase letter</div>
                  <div className={`${styles.requirement} ${passwordStrength.hasLowercase ? styles.met : ""}`}>✓ One lowercase letter</div>
                  <div className={`${styles.requirement} ${passwordStrength.hasNumber ? styles.met : ""}`}>✓ One number</div>
                  <div className={`${styles.requirement} ${passwordStrength.hasSpecial ? styles.met : ""}`}>✓ One special character</div>
                </div>
              </div>
            )}
          </div>

          <FormInput
            id="confirmPassword"
            label="Confirm Password"
            type={showPassword ? "text" : "password"}
            value={formData.confirmPassword}
            onChange={(value) => handleInputChange("confirmPassword", value)}
            error={formErrors.confirmPassword}
            placeholder="Confirm your password"
            required
            disabled={isSubmitting}
          />

          <button type="submit" disabled={!isFormValid || isSubmitting} className="auth-submit-button">
            {isSubmitting ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        {onSignIn && (
          <div className="auth-prompt">
            <span className="auth-prompt-text">Already have an account?</span>{" "}
            <button type="button" onClick={onSignIn} className="auth-link-button" disabled={isSubmitting}>
              Sign in
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

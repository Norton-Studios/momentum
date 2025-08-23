import type React from "react";
import { useState, useEffect } from "react";
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
  initialData?: Partial<SignupFormData>;
}

export function SignupForm({ onSubmit, isSubmitting = false, error, organizationNameError, onOrganizationNameChange, onSignIn, initialData }: SignupFormProps) {
  const [formData, setFormData] = useState<SignupFormData>({
    organizationName: initialData?.organizationName || "",
    fullName: initialData?.fullName || "",
    email: initialData?.email || "",
    password: initialData?.password || "",
    confirmPassword: initialData?.confirmPassword || "",
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

  // Update form data when initialData prop changes
  useEffect(() => {
    if (initialData) {
      const newFormData = {
        organizationName: initialData?.organizationName || "",
        fullName: initialData?.fullName || "",
        email: initialData?.email || "",
        password: initialData?.password || "",
        confirmPassword: initialData?.confirmPassword || "",
      };
      setFormData(newFormData);

      // Re-validate password if it exists
      if (initialData?.password) {
        const strength = {
          hasLowercase: /[a-z]/.test(initialData.password),
          hasUppercase: /[A-Z]/.test(initialData.password),
          hasNumber: /\d/.test(initialData.password),
          hasSpecial: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(initialData.password),
          hasLength: initialData.password.length >= 10,
        };
        setPasswordStrength(strength);
      }
    }
  }, [initialData]);

  const validatePassword = (password: string) => {
    const strength = {
      hasLowercase: /[a-z]/.test(password),
      hasUppercase: /[A-Z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecial: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
      hasLength: password.length >= 10,
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
      // Require length, lowercase, uppercase, and (number OR special character)
      const requiredChecks = [strength.hasLength, strength.hasLowercase, strength.hasUppercase, strength.hasNumber || strength.hasSpecial];
      if (!requiredChecks.every(Boolean)) {
        errors.password = "Password must be at least 10 characters with uppercase, lowercase, and number or special character";
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
    // Count required criteria (length, uppercase, lowercase, number OR special)
    const requiredCount = [
      passwordStrength.hasLength,
      passwordStrength.hasUppercase,
      passwordStrength.hasLowercase,
      passwordStrength.hasNumber || passwordStrength.hasSpecial,
    ].filter(Boolean).length;

    if (requiredCount < 2) return "#ef4444"; // red
    if (requiredCount < 4) return "#f59e0b"; // yellow
    return "#10b981"; // green
  };

  const isFormValid =
    passwordStrength.hasLength &&
    passwordStrength.hasLowercase &&
    passwordStrength.hasUppercase &&
    (passwordStrength.hasNumber || passwordStrength.hasSpecial) &&
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
            placeholder="Acme Corporation"
            required
            disabled={isSubmitting}
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
                      width: `${([passwordStrength.hasLength, passwordStrength.hasUppercase, passwordStrength.hasLowercase, passwordStrength.hasNumber || passwordStrength.hasSpecial].filter(Boolean).length / 4) * 100}%`,
                      backgroundColor: getPasswordStrengthColor(),
                    }}
                  />
                </div>
                <div className={styles.requirements}>
                  <div className={`${styles.requirement} ${passwordStrength.hasLength ? styles.met : ""}`}>✓ At least 10 characters</div>
                  <div className={`${styles.requirement} ${passwordStrength.hasUppercase ? styles.met : ""}`}>✓ One uppercase letter</div>
                  <div className={`${styles.requirement} ${passwordStrength.hasLowercase ? styles.met : ""}`}>✓ One lowercase letter</div>
                  <div className={`${styles.requirement} ${passwordStrength.hasNumber || passwordStrength.hasSpecial ? styles.met : ""}`}>
                    ✓ One number or special character
                  </div>
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

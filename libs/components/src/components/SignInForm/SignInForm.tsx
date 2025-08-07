import type React from "react";
import { useState } from "react";
import { Button } from "../Button/Button";
import { FormInput } from "../FormInput/FormInput";
import { Alert } from "../Alert/Alert";
import styles from "./SignInForm.module.css";

export interface SignInFormData {
  email: string;
  password: string;
}

export interface SignInFormProps {
  onSubmit: (data: SignInFormData) => Promise<void>;
  isSubmitting?: boolean;
  error?: string;
  onForgotPassword?: () => void;
  onSignUp?: () => void;
}

export function SignInForm({ onSubmit, isSubmitting = false, error, onForgotPassword, onSignUp }: SignInFormProps) {
  const [formData, setFormData] = useState<SignInFormData>({
    email: "",
    password: "",
  });

  const [formErrors, setFormErrors] = useState<Partial<SignInFormData>>({});

  const handleInputChange = (field: keyof SignInFormData) => (value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear field error when user starts typing
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Partial<SignInFormData> = {};

    if (!formData.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Please enter a valid email address";
    }

    if (!formData.password.trim()) {
      errors.password = "Password is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || isSubmitting) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch (_err) {
      // Error handling is managed by the parent component
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.formWrapper}>
        <div className={styles.header}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}></div>
            <span className={styles.logoText}>Momentum</span>
          </div>
          <h1 className={styles.title}>Welcome back</h1>
          <p className={styles.subtitle}>Sign in to your account to continue</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          {error && (
            <Alert variant="error" className={styles.errorAlert}>
              {error}
            </Alert>
          )}

          <div className={styles.formFields}>
            <FormInput
              id="email"
              label="Email address"
              type="email"
              value={formData.email}
              onChange={handleInputChange("email")}
              error={formErrors.email}
              placeholder="Enter your email"
              required
              disabled={isSubmitting}
              autoComplete="email"
            />

            <FormInput
              id="password"
              label="Password"
              type="password"
              value={formData.password}
              onChange={handleInputChange("password")}
              error={formErrors.password}
              placeholder="Enter your password"
              required
              disabled={isSubmitting}
              autoComplete="current-password"
            />
          </div>

          <div className={styles.actions}>
            <Button type="submit" variant="primary" size="lg" disabled={isSubmitting} className={styles.submitButton}>
              {isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
          </div>

          <div className={styles.links}>
            {onForgotPassword && (
              <button type="button" onClick={onForgotPassword} className={styles.forgotPasswordLink} disabled={isSubmitting}>
                Forgot your password?
              </button>
            )}
          </div>

          {onSignUp && (
            <div className={styles.signUpPrompt}>
              <span className={styles.signUpText}>Don't have an account?</span>{" "}
              <button type="button" onClick={onSignUp} className={styles.signUpLink} disabled={isSubmitting}>
                Sign up
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

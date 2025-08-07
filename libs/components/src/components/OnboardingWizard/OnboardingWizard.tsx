import type React from "react";
import styles from "./OnboardingWizard.module.css";

export interface WizardStep {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  current: boolean;
}

export interface OnboardingWizardProps {
  steps: WizardStep[];
  children: React.ReactNode;
  onStepClick?: (stepId: string) => void;
}

export function OnboardingWizard({ steps, children, onStepClick }: OnboardingWizardProps) {
  return (
    <div className={styles.wizard}>
      <div className={styles.sidebar}>
        <div className={styles.header}>
          <h1 className={styles.title}>Welcome to Momentum</h1>
          <p className={styles.subtitle}>Let's set up your organization</p>
        </div>

        <nav className={styles.stepNav}>
          {steps.map((step, index) => (
            <button
              key={step.id}
              type="button"
              className={`${styles.step} ${step.completed ? styles.completed : ""} ${step.current ? styles.current : ""}`}
              onClick={() => onStepClick?.(step.id)}
              disabled={!step.completed && !step.current}
            >
              <div className={styles.stepNumber}>{step.completed ? <span className={styles.checkmark}>✓</span> : <span>{index + 1}</span>}</div>
              <div className={styles.stepContent}>
                <div className={styles.stepTitle}>{step.title}</div>
                {step.description && <div className={styles.stepDescription}>{step.description}</div>}
              </div>
            </button>
          ))}
        </nav>
      </div>

      <main className={styles.content}>{children}</main>
    </div>
  );
}

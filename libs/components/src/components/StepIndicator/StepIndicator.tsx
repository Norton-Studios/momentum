import React from "react";
import { clsx } from "clsx";
import styles from "./StepIndicator.module.css";

export interface Step {
  id: string;
  label: string;
  description?: string;
}

export interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({ steps, currentStep, className }) => {
  return (
    <div className={clsx(styles.container, className)}>
      <div className={styles.progressBar}>
        <div className={styles.progressFill} style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }} />
      </div>

      <div className={styles.steps}>
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isCompleted = stepNumber < currentStep;

          return (
            <div
              key={step.id}
              className={clsx(styles.step, {
                [styles.active]: isActive,
                [styles.completed]: isCompleted,
              })}
            >
              <div className={styles.stepNumber}>
                {isCompleted ? (
                  <svg className={styles.checkmark} viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  stepNumber
                )}
              </div>
              <div className={styles.stepContent}>
                <div className={styles.stepLabel}>{step.label}</div>
                {step.description && <div className={styles.stepDescription}>{step.description}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

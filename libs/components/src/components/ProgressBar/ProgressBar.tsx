import type React from "react";
import { clsx } from "clsx";
import styles from "./ProgressBar.module.css";

export interface ProgressBarProps {
  value: number;
  max?: number;
  variant?: "default" | "success" | "warning" | "danger";
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  animated?: boolean;
  striped?: boolean;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  variant = "default",
  size = "md",
  showLabel = false,
  animated = false,
  striped = false,
  className,
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className={clsx(styles.progressBar, styles[size], className)}>
      <div
        className={clsx(styles.fill, styles[variant], {
          [styles.animated]: animated,
          [styles.striped]: striped,
        })}
        style={{ width: `${percentage}%` }}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        {showLabel && <span className={styles.label}>{Math.round(percentage)}%</span>}
      </div>
    </div>
  );
};

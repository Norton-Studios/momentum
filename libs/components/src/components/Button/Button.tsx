import type React from "react";
import { clsx } from "clsx";
import styles from "./Button.module.css";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  gradient?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ variant = "primary", size = "md", fullWidth = false, gradient = false, className, children, ...props }) => {
  return (
    <button
      className={clsx(
        styles.button,
        styles[variant],
        styles[size],
        {
          [styles.fullWidth]: fullWidth,
          [styles.gradient]: gradient,
        },
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
};

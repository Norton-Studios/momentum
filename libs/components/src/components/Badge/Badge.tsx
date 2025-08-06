import React from "react";
import { clsx } from "clsx";
import styles from "./Badge.module.css";

export interface BadgeProps {
  variant?: "default" | "primary" | "success" | "warning" | "danger" | "info";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ variant = "default", size = "md", children, className }) => {
  return <span className={clsx(styles.badge, styles[variant], styles[size], className)}>{children}</span>;
};

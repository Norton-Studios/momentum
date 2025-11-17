import type { ReactNode } from "react";
import "./button.css";

export function Button({ children, variant = "primary", type = "button", onClick, disabled = false, className = "" }: ButtonProps) {
  const baseClass = variant === "primary" ? "btn-primary" : "btn-secondary";

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${baseClass} ${className}`}>
      {children}
    </button>
  );
}

interface ButtonProps {
  children: ReactNode;
  variant?: "primary" | "secondary";
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

import React from "react";
import { clsx } from "clsx";
import styles from "./TeamMember.module.css";

export interface TeamMemberProps {
  name: string;
  initials?: string;
  role?: string;
  avatarUrl?: string;
  size?: "sm" | "md" | "lg";
  status?: "online" | "offline" | "away";
  onClick?: () => void;
  className?: string;
}

export const TeamMember: React.FC<TeamMemberProps> = ({ name, initials, role, avatarUrl, size = "md", status, onClick, className }) => {
  const displayInitials =
    initials ||
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  const isClickable = !!onClick;

  return (
    <div
      className={clsx(styles.member, styles[size], { [styles.clickable]: isClickable }, className)}
      onClick={onClick}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={(e) => {
        if (isClickable && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className={styles.avatarWrapper}>
        {avatarUrl ? <img src={avatarUrl} alt={name} className={styles.avatar} /> : <div className={styles.avatarInitials}>{displayInitials}</div>}
        {status && <span className={clsx(styles.statusIndicator, styles[status])} />}
      </div>

      <div className={styles.info}>
        <div className={styles.name}>{name}</div>
        {role && <div className={styles.role}>{role}</div>}
      </div>
    </div>
  );
};

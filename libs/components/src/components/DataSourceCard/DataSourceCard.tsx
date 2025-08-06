import type React from "react";
import { clsx } from "clsx";
import styles from "./DataSourceCard.module.css";

export interface DataSourceCardProps {
  provider: "github" | "gitlab" | "bitbucket" | string;
  title: string;
  description: string;
  features?: string[];
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  icon?: React.ReactNode;
  className?: string;
}

export const DataSourceCard: React.FC<DataSourceCardProps> = ({
  provider,
  title,
  description,
  features = [],
  selected = false,
  disabled = false,
  onClick,
  icon,
  className,
}) => {
  const handleClick = () => {
    if (!disabled && onClick) {
      onClick();
    }
  };

  const defaultIcons: Record<string, React.ReactNode> = {
    github: (
      <svg viewBox="0 0 24 24" fill="#333">
        <path d="M12 0C5.374 0 0 5.373 0 12 0 17.302 3.438 21.8 8.207 23.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
      </svg>
    ),
    gitlab: (
      <svg viewBox="0 0 24 24" fill="#FC6D26">
        <path d="M23.955 13.587l-1.342-4.135-2.664-8.189c-.135-.423-.73-.423-.867 0L16.418 9.45H7.582L4.919 1.263c-.135-.423-.73-.423-.867 0L1.388 9.452-.955 13.587a.863.863 0 00.31 1.05L12 24l11.645-9.365a.863.863 0 00.31-1.05" />
      </svg>
    ),
    bitbucket: (
      <svg viewBox="0 0 24 24" fill="#0052CC">
        <path d="M.778 1.213a.768.768 0 00-.768.892l3.263 19.81c.084.5.515.868 1.022.873H19.95a.772.772 0 00.77-.646l3.27-20.03a.768.768 0 00-.768-.891zM14.52 15.53H9.22L8.175 9.909h7.959z" />
      </svg>
    ),
  };

  const displayIcon = icon || defaultIcons[provider] || null;

  return (
    <div
      className={clsx(
        styles.card,
        {
          [styles.selected]: selected,
          [styles.disabled]: disabled,
          [styles.clickable]: !!onClick && !disabled,
        },
        className,
      )}
      {...(onClick &&
        !disabled && {
          onClick: handleClick,
          role: "button",
          tabIndex: 0,
          onKeyDown: (e: React.KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleClick();
            }
          },
        })}
    >
      {displayIcon && <div className={styles.icon}>{displayIcon}</div>}

      <h3 className={styles.title}>{title}</h3>
      <p className={styles.description}>{description}</p>

      {features.length > 0 && (
        <ul className={styles.features}>
          {features.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
      )}

      {selected && (
        <div className={styles.checkmark}>
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      )}
    </div>
  );
};

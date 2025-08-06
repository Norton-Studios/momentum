import React from 'react';
import { clsx } from 'clsx';
import styles from './Card.module.css';

export interface CardProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
  variant?: 'default' | 'gradient' | 'outlined';
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  title,
  description,
  icon,
  selected = false,
  disabled = false,
  onClick,
  children,
  variant = 'default',
  className,
}) => {
  const isClickable = !!onClick && !disabled;

  return (
    <div
      className={clsx(
        styles.card,
        styles[variant],
        {
          [styles.selected]: selected,
          [styles.disabled]: disabled,
          [styles.clickable]: isClickable,
        },
        className
      )}
      onClick={isClickable ? onClick : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={(e) => {
        if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {icon && <div className={styles.icon}>{icon}</div>}
      
      {(title || description) && (
        <div className={styles.content}>
          {title && <h3 className={styles.title}>{title}</h3>}
          {description && <p className={styles.description}>{description}</p>}
        </div>
      )}
      
      {children && <div className={styles.body}>{children}</div>}
      
      {selected && (
        <div className={styles.checkmark}>
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </div>
  );
};
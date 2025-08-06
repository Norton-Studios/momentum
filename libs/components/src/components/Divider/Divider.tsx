import React from 'react';
import { clsx } from 'clsx';
import styles from './Divider.module.css';

export interface DividerProps {
  text?: string;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export const Divider: React.FC<DividerProps> = ({
  text,
  orientation = 'horizontal',
  className,
}) => {
  if (text) {
    return (
      <div className={clsx(styles.dividerWithText, className)}>
        <span className={styles.line} />
        <span className={styles.text}>{text}</span>
        <span className={styles.line} />
      </div>
    );
  }

  return (
    <div
      className={clsx(
        styles.divider,
        styles[orientation],
        className
      )}
    />
  );
};
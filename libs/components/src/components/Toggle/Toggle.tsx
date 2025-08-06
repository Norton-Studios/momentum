import React from 'react';
import { clsx } from 'clsx';
import styles from './Toggle.module.css';

export interface ToggleProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  labelPosition?: 'left' | 'right';
  className?: string;
}

export const Toggle: React.FC<ToggleProps> = ({
  checked: controlledChecked,
  defaultChecked = false,
  onChange,
  disabled = false,
  size = 'md',
  label,
  labelPosition = 'right',
  className,
}) => {
  const [internalChecked, setInternalChecked] = React.useState(defaultChecked);
  const isChecked = controlledChecked !== undefined ? controlledChecked : internalChecked;

  const handleChange = () => {
    if (disabled) return;
    
    const newChecked = !isChecked;
    if (controlledChecked === undefined) {
      setInternalChecked(newChecked);
    }
    onChange?.(newChecked);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleChange();
    }
  };

  const toggle = (
    <div
      className={clsx(
        styles.toggle,
        styles[size],
        {
          [styles.checked]: isChecked,
          [styles.disabled]: disabled,
        }
      )}
      onClick={handleChange}
      onKeyDown={handleKeyDown}
      role="switch"
      aria-checked={isChecked}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
    >
      <span className={styles.slider} />
    </div>
  );

  if (!label) {
    return <div className={className}>{toggle}</div>;
  }

  return (
    <label 
      className={clsx(
        styles.container,
        styles[`label${labelPosition.charAt(0).toUpperCase()}${labelPosition.slice(1)}`],
        { [styles.disabled]: disabled },
        className
      )}
    >
      {labelPosition === 'left' && <span className={styles.label}>{label}</span>}
      {toggle}
      {labelPosition === 'right' && <span className={styles.label}>{label}</span>}
    </label>
  );
};
import type React from "react";
import { useState, useRef, useEffect } from "react";
import { clsx } from "clsx";
import styles from "./DateRangeSelector.module.css";

export interface DateRange {
  label: string;
  value: string;
  days?: number;
}

export interface DateRangeSelectorProps {
  ranges?: DateRange[];
  defaultValue?: string;
  onChange?: (range: DateRange) => void;
  className?: string;
}

const defaultRanges: DateRange[] = [
  { label: "7 days", value: "7d", days: 7 },
  { label: "30 days", value: "30d", days: 30 },
  { label: "90 days", value: "90d", days: 90 },
  { label: "1 year", value: "1y", days: 365 },
  { label: "Custom", value: "custom" },
];

export const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({ ranges = defaultRanges, defaultValue = "30d", onChange, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState(() => ranges.find((r) => r.value === defaultValue) || ranges[0]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (range: DateRange) => {
    setSelected(range);
    setIsOpen(false);
    onChange?.(range);
  };

  return (
    <div className={clsx(styles.container, className)} ref={dropdownRef}>
      <button className={styles.trigger} onClick={() => setIsOpen(!isOpen)} aria-haspopup="listbox" aria-expanded={isOpen}>
        <span className={styles.label}>
          <svg className={styles.icon} viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zM4 8h12v8H4V8z"
              clipRule="evenodd"
            />
          </svg>
          {selected.label}
        </span>
        <svg className={styles.chevron} viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <ul className={styles.list} >
            {ranges.map((range) => (
              <li key={range.value}>
                <button
                  className={clsx(styles.option, {
                    [styles.selected]: selected.value === range.value,
                  })}
                  onClick={() => handleSelect(range)}
                  role="option"
                  aria-selected={selected.value === range.value}
                >
                  {range.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

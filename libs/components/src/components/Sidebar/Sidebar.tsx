import type React from "react";
import { useState } from "react";
import { clsx } from "clsx";
import styles from "./Sidebar.module.css";

export interface NavItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  href?: string;
  children?: NavItem[];
}

export interface SidebarProps {
  items: NavItem[];
  activeItem?: string;
  onItemClick?: (item: NavItem) => void;
  className?: string;
  logo?: React.ReactNode;
  footer?: React.ReactNode;
}

export const Sidebar: React.FC<SidebarProps> = ({ items, activeItem, onItemClick, className, logo, footer }) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const renderNavItem = (item: NavItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);
    const isActive = activeItem === item.id;

    return (
      <li key={item.id} className={styles.navItem}>
        <button
          className={clsx(styles.navButton, {
            [styles.active]: isActive,
            [styles.hasChildren]: hasChildren,
            [styles.expanded]: isExpanded,
          })}
          style={{ paddingLeft: `${16 + level * 16}px` }}
          onClick={() => {
            if (hasChildren) {
              toggleExpanded(item.id);
            }
            onItemClick?.(item);
          }}
        >
          {item.icon && <span className={styles.icon}>{item.icon}</span>}
          <span className={styles.label}>{item.label}</span>
          {hasChildren && (
            <svg className={styles.chevron} viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M7.293 4.707a1 1 0 010-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L8.586 10 5.293 6.707z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </button>
        {hasChildren && isExpanded && <ul className={styles.subNav}>{item.children!.map((child) => renderNavItem(child, level + 1))}</ul>}
      </li>
    );
  };

  return (
    <aside className={clsx(styles.sidebar, className)}>
      {logo && <div className={styles.logo}>{logo}</div>}

      <nav className={styles.nav}>
        <ul className={styles.navList}>{items.map((item) => renderNavItem(item))}</ul>
      </nav>

      {footer && <div className={styles.footer}>{footer}</div>}
    </aside>
  );
};

import React from 'react';
import { clsx } from 'clsx';
import styles from './RepositoryCard.module.css';

export interface RepositoryCardProps {
  name: string;
  description?: string;
  language?: string;
  languageColor?: string;
  visibility?: 'public' | 'private';
  lastUpdated?: string;
  stars?: number;
  selected?: boolean;
  onSelectionChange?: (selected: boolean) => void;
  className?: string;
}

export const RepositoryCard: React.FC<RepositoryCardProps> = ({
  name,
  description,
  language,
  languageColor = '#333',
  visibility = 'public',
  lastUpdated,
  stars,
  selected = false,
  onSelectionChange,
  className,
}) => {
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSelectionChange?.(e.target.checked);
  };

  return (
    <div className={clsx(styles.card, { [styles.selected]: selected }, className)}>
      {onSelectionChange && (
        <input
          type="checkbox"
          className={styles.checkbox}
          checked={selected}
          onChange={handleCheckboxChange}
          aria-label={`Select repository ${name}`}
        />
      )}
      
      <div className={styles.content}>
        <div className={styles.header}>
          <h3 className={styles.name}>{name}</h3>
          <span className={clsx(styles.visibility, styles[visibility])}>
            {visibility === 'private' ? '🔒' : '🌐'} {visibility}
          </span>
        </div>
        
        {description && (
          <p className={styles.description}>{description}</p>
        )}
        
        <div className={styles.metadata}>
          {language && (
            <div className={styles.language}>
              <span 
                className={styles.languageDot} 
                style={{ backgroundColor: languageColor }}
              />
              <span>{language}</span>
            </div>
          )}
          
          {stars !== undefined && (
            <div className={styles.stars}>
              ⭐ {stars}
            </div>
          )}
          
          {lastUpdated && (
            <div className={styles.updated}>
              Updated {lastUpdated}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
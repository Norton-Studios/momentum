import React from 'react';
import { clsx } from 'clsx';
import styles from './MetricCard.module.css';

export interface MetricCardProps {
  title: string;
  value: string | number;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  gradient?: 'cve' | 'stability' | 'velocity' | 'performance' | 'primary';
  icon?: React.ReactNode;
  sparklineData?: number[];
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  trend,
  gradient = 'primary',
  icon,
  sparklineData,
  className,
}) => {
  const trendIcon = trend?.direction === 'up' ? '↑' : '↓';
  const trendPositive = 
    (gradient === 'cve' && trend?.direction === 'down') ||
    (gradient !== 'cve' && trend?.direction === 'up');

  return (
    <div className={clsx(styles.card, styles[gradient], className)}>
      <div className={styles.header}>
        <h3 className={styles.title}>{title}</h3>
        {icon && <div className={styles.icon}>{icon}</div>}
      </div>
      
      <div className={styles.value}>{value}</div>
      
      {trend && (
        <div className={clsx(styles.trend, trendPositive ? styles.positive : styles.negative)}>
          <span className={styles.trendIcon}>{trendIcon}</span>
          <span>{Math.abs(trend.value)}%</span>
        </div>
      )}
      
      {sparklineData && (
        <div className={styles.sparkline}>
          <svg viewBox="0 0 100 40" className={styles.sparklineSvg}>
            <polyline
              points={sparklineData
                .map((val, i) => `${(i / (sparklineData.length - 1)) * 100},${40 - (val / Math.max(...sparklineData)) * 40}`)
                .join(' ')}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
        </div>
      )}
    </div>
  );
};
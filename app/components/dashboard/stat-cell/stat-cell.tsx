import type { TrendValue } from "~/lib/dashboard/date-range.js";
import { formatTrendString } from "~/lib/dashboard/date-range.js";
import "./stat-cell.css";

export function StatCell({ label, value, trend, subtitle }: StatCellProps) {
  const formattedValue = typeof value === "number" ? value.toLocaleString() : value;

  return (
    <div className="stat-cell">
      <div className="stat-cell-label">{label}</div>
      <div className="stat-cell-value">{formattedValue}</div>
      {trend ? <div className={`stat-cell-trend ${trend.type}`}>{formatTrendString(trend)}</div> : subtitle ? <div className="stat-cell-subtitle">{subtitle}</div> : null}
    </div>
  );
}

interface StatCellProps {
  label: string;
  value: number | string;
  trend?: TrendValue;
  subtitle?: string;
}

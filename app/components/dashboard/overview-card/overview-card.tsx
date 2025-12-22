import type { TrendValue } from "~/lib/dashboard/date-range.js";
import { formatTrendString } from "~/lib/dashboard/date-range.js";
import "./overview-card.css";

export function OverviewCard({ label, value, trend, subtitle }: OverviewCardProps) {
  const formattedValue = typeof value === "number" ? value.toLocaleString() : value;

  return (
    <div className="overview-card">
      <div className="overview-label">{label}</div>
      <div className="overview-value">{formattedValue}</div>
      {trend ? (
        <div className={`overview-change ${trend.type}`}>{formatTrendString(trend)} from last period</div>
      ) : (
        <div className="overview-change">{subtitle || "Active projects"}</div>
      )}
    </div>
  );
}

interface OverviewCardProps {
  label: string;
  value: number | string;
  trend?: TrendValue;
  subtitle?: string;
}

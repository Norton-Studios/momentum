import "./metric-box.css";

export function MetricBox({ label, value, trend, trendType = "neutral" }: MetricBoxProps) {
  return (
    <div className="metric-box">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      {trend && <div className={`metric-trend ${trendType}`}>{trend}</div>}
    </div>
  );
}

interface MetricBoxProps {
  label: string;
  value: string | number;
  trend?: string;
  trendType?: "positive" | "negative" | "neutral";
}

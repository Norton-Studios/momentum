import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import "./charts.css";

const SEVERITY_COLORS = {
  critical: "#b85c5c",
  high: "#d4915c",
  medium: "#c9a961",
  low: "#5f8a5f",
};

export function StackedBarChart({ data }: StackedBarChartProps) {
  if (data.length === 0) {
    return <EmptyChart message="No data available" />;
  }

  return (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--mid-gray)" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "var(--mid-gray)" }} axisLine={false} tickLine={false} width={35} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--off-white)" }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="critical" stackId="severity" fill={SEVERITY_COLORS.critical} name="Critical" />
          <Bar dataKey="high" stackId="severity" fill={SEVERITY_COLORS.high} name="High" />
          <Bar dataKey="medium" stackId="severity" fill={SEVERITY_COLORS.medium} name="Medium" />
          <Bar dataKey="low" stackId="severity" fill={SEVERITY_COLORS.low} name="Low" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length || !label) return null;

  const total = payload.reduce((sum, item) => sum + (item.value || 0), 0);

  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{label}</p>
      {payload.map((item) => (
        <p key={item.name} style={{ color: item.color, fontSize: 13 }}>
          {item.name}: {item.value}
        </p>
      ))}
      <p className="chart-tooltip-value">Total: {total}</p>
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="chart-container chart-empty">
      <p>{message}</p>
    </div>
  );
}

interface StackedBarDataPoint {
  label: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

interface StackedBarChartProps {
  data: StackedBarDataPoint[];
}

interface TooltipProps {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string }[];
  label?: string;
}

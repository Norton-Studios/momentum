import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ChartDataPoint } from "~/lib/dashboard/date-range.js";
import "./charts.css";

export function TrendBarChart({ data, color = "var(--gold)" }: TrendBarChartProps) {
  if (data.length === 0) {
    return <EmptyChart message="No data available" />;
  }

  return (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <XAxis dataKey="date" tickFormatter={formatDateLabel} tick={{ fontSize: 11, fill: "var(--mid-gray)" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 11, fill: "var(--mid-gray)" }} axisLine={false} tickLine={false} width={35} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--off-white)" }} />
          <Bar dataKey="value" fill={color} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length || !label) return null;

  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{formatFullDate(label)}</p>
      <p className="chart-tooltip-value">{payload[0].value?.toLocaleString()}</p>
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

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatFullDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

interface TrendBarChartProps {
  data: ChartDataPoint[];
  color?: string;
}

interface TooltipProps {
  active?: boolean;
  payload?: { value?: number }[];
  label?: string;
}

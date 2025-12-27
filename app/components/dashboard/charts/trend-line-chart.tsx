import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ChartDataPoint } from "~/lib/dashboard/date-range.js";
import "./charts.css";

export function TrendLineChart({ data, color = "var(--gold)", unit = "" }: TrendLineChartProps) {
  if (data.length === 0) {
    return <EmptyChart message="No data available" />;
  }

  return (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <XAxis dataKey="date" tickFormatter={formatDateLabel} tick={{ fontSize: 11, fill: "var(--mid-gray)" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 11, fill: "var(--mid-gray)" }} axisLine={false} tickLine={false} width={35} domain={[0, "auto"]} />
          <Tooltip content={<CustomTooltip unit={unit} />} />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: color }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function CustomTooltip({ active, payload, label, unit }: TooltipProps) {
  if (!active || !payload?.length || !label) return null;

  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{formatFullDate(label)}</p>
      <p className="chart-tooltip-value">
        {payload[0].value?.toLocaleString()}
        {unit}
      </p>
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

interface TrendLineChartProps {
  data: ChartDataPoint[];
  color?: string;
  unit?: string;
}

interface TooltipProps {
  active?: boolean;
  payload?: { value?: number }[];
  label?: string;
  unit?: string;
}

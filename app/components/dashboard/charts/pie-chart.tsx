import { Cell, Pie, PieChart as RechartsPieChart, ResponsiveContainer, Tooltip } from "recharts";
import "./charts.css";

const DEFAULT_COLORS = ["var(--gold)", "var(--mid-gray)", "var(--dark-gray)", "var(--light-gray)", "var(--black)"];

export function PieChart({ data }: PieChartProps) {
  if (data.length === 0) {
    return <EmptyChart message="No data available" />;
  }

  const chartData = data.map((d, i) => ({
    ...d,
    fill: d.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length],
  }));

  return (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsPieChart margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
          <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={renderLabel} labelLine={false}>
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
}

function renderLabel(props: { name?: string; percent?: number }) {
  if (!props.name || !props.percent || props.percent < 0.05) return null;
  return `${props.name} (${(props.percent * 100).toFixed(0)}%)`;
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;

  const item = payload[0];
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{item.name}</p>
      <p className="chart-tooltip-value">{item.value?.toLocaleString()}</p>
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

interface PieChartDataPoint {
  name: string;
  value: number;
  color?: string;
}

interface PieChartProps {
  data: PieChartDataPoint[];
}

interface TooltipProps {
  active?: boolean;
  payload?: { name?: string; value?: number }[];
}

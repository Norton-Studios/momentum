import "./commit-heatmap.css";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CommitHeatmap({ data, totalCommits }: CommitHeatmapProps) {
  if (data.length === 0) {
    return (
      <div className="commit-heatmap-empty">
        <p>No commit data available for this period</p>
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const weekCount = Math.max(...data.map((d) => d.weekNumber)) + 1;

  return (
    <div className="commit-heatmap">
      <div className="heatmap-header">
        <div className="heatmap-label">Commit Activity</div>
        <div className="heatmap-value">{totalCommits.toLocaleString()}</div>
      </div>
      <div className="heatmap-container">
        <div className="heatmap-labels">
          {DAY_LABELS.map((label, i) => (
            <span key={label} className={`heatmap-day-label ${i % 2 === 0 ? "" : "hidden-mobile"}`}>
              {label}
            </span>
          ))}
        </div>
        <div className="heatmap-grid" style={{ "--week-count": weekCount } as React.CSSProperties}>
          {data.map((day) => (
            <div
              key={day.date}
              className="heatmap-cell"
              data-level={getLevel(day.count, maxCount)}
              style={{
                gridRow: day.dayOfWeek + 1,
                gridColumn: day.weekNumber + 1,
              }}
              title={`${day.date}: ${day.count} commit${day.count !== 1 ? "s" : ""}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function getLevel(count: number, max: number): number {
  if (count === 0) return 0;
  const ratio = count / max;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

interface HeatmapDay {
  date: string;
  count: number;
  dayOfWeek: number;
  weekNumber: number;
}

interface CommitHeatmapProps {
  data: HeatmapDay[];
  totalCommits: number;
}

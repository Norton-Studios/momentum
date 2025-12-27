const PRESET_DAYS = {
  "7d": 7,
  "30d": 30,
  "60d": 60,
  "90d": 90,
} as const;

type PresetKey = keyof typeof PRESET_DAYS;

function isPresetKey(value: string): value is PresetKey {
  return value in PRESET_DAYS;
}

export function parseDateRange(searchParams: URLSearchParams): DateRange {
  const preset = searchParams.get("preset");
  const startParam = searchParams.get("start");
  const endParam = searchParams.get("end");

  if (preset && isPresetKey(preset)) {
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - PRESET_DAYS[preset]);
    startDate.setHours(0, 0, 0, 0);

    return { startDate, endDate, preset };
  }

  if (startParam && endParam) {
    const startDate = new Date(startParam);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(endParam);
    endDate.setHours(23, 59, 59, 999);

    if (!Number.isNaN(startDate.getTime()) && !Number.isNaN(endDate.getTime())) {
      return { startDate, endDate, preset: "custom" };
    }
  }

  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - PRESET_DAYS["90d"]);
  startDate.setHours(0, 0, 0, 0);

  return { startDate, endDate, preset: "90d" };
}

export function getPreviousPeriod(range: DateRange): DateRange {
  const durationMs = range.endDate.getTime() - range.startDate.getTime();

  const previousEnd = new Date(range.startDate.getTime() - 1);
  previousEnd.setHours(23, 59, 59, 999);

  const previousStart = new Date(previousEnd.getTime() - durationMs);
  previousStart.setHours(0, 0, 0, 0);

  return { startDate: previousStart, endDate: previousEnd };
}

export function formatDateRange(range: DateRange): string {
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  };
  const startFormatted = range.startDate.toLocaleDateString("en-US", options);
  const endFormatted = range.endDate.toLocaleDateString("en-US", options);

  return `${startFormatted} - ${endFormatted}`;
}

export function buildSearchParams(range: DateRange): URLSearchParams {
  const params = new URLSearchParams();

  if (range.preset && range.preset !== "custom") {
    params.set("preset", range.preset);
  } else {
    params.set("start", range.startDate.toISOString().split("T")[0]);
    params.set("end", range.endDate.toISOString().split("T")[0]);
  }

  return params;
}

export function calculateTrend(current: number, previous: number): TrendValue {
  if (previous === 0) {
    return {
      value: current > 0 ? 100 : 0,
      type: current > 0 ? "positive" : "neutral",
    };
  }

  const percentChange = ((current - previous) / previous) * 100;

  return {
    value: Math.abs(Math.round(percentChange)),
    type: percentChange > 0 ? "positive" : percentChange < 0 ? "negative" : "neutral",
  };
}

export function formatTrendString(trend: TrendValue, invert = false): string {
  if (trend.type === "neutral") {
    return "0%";
  }

  const displayType = invert ? (trend.type === "positive" ? "negative" : "positive") : trend.type;

  const arrow = displayType === "positive" ? "↑" : "↓";
  return `${arrow} ${trend.value}%`;
}

export type DatePreset = "7d" | "30d" | "60d" | "90d" | "custom";

export interface DateRange {
  startDate: Date;
  endDate: Date;
  preset?: DatePreset;
}

export interface TrendValue {
  value: number;
  type: "positive" | "negative" | "neutral";
}

export interface ChartDataPoint {
  date: string;
  value: number;
}

export function formatDuration(ms: number | null): string {
  if (ms === null) return "N/A";

  const minutes = Math.round(ms / (1000 * 60));
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

export function formatHours(hours: number | null): string {
  if (hours === null) return "N/A";

  if (hours < 24) return `${hours.toFixed(1)}h`;

  const days = Math.floor(hours / 24);
  const remainingHours = Math.round(hours % 24);
  return `${days}d ${remainingHours}h`;
}

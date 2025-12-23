import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildSearchParams, calculateTrend, formatDateRange, formatDuration, formatHours, formatTrendString, getPreviousPeriod, parseDateRange } from "./date-range.js";

function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

describe("parseDateRange", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-15T12:00:00Z"));
  });

  it("returns 30d preset as default when no params provided", () => {
    const params = new URLSearchParams();
    const result = parseDateRange(params);

    expect(result.preset).toBe("30d");
    expect(toLocalDateString(result.startDate)).toBe("2024-12-16");
    expect(toLocalDateString(result.endDate)).toBe("2025-01-15");
  });

  it("parses 7d preset correctly", () => {
    const params = new URLSearchParams({ preset: "7d" });
    const result = parseDateRange(params);

    expect(result.preset).toBe("7d");
    expect(toLocalDateString(result.startDate)).toBe("2025-01-08");
  });

  it("parses 60d preset correctly", () => {
    const params = new URLSearchParams({ preset: "60d" });
    const result = parseDateRange(params);

    expect(result.preset).toBe("60d");
    expect(toLocalDateString(result.startDate)).toBe("2024-11-16");
  });

  it("parses 90d preset correctly", () => {
    const params = new URLSearchParams({ preset: "90d" });
    const result = parseDateRange(params);

    expect(result.preset).toBe("90d");
    expect(toLocalDateString(result.startDate)).toBe("2024-10-17");
  });

  it("parses custom date range from start/end params", () => {
    const params = new URLSearchParams({
      start: "2025-01-01",
      end: "2025-01-10",
    });
    const result = parseDateRange(params);

    expect(result.preset).toBe("custom");
    expect(toLocalDateString(result.startDate)).toBe("2025-01-01");
    expect(toLocalDateString(result.endDate)).toBe("2025-01-10");
  });

  it("falls back to default when invalid dates provided", () => {
    const params = new URLSearchParams({
      start: "invalid",
      end: "invalid",
    });
    const result = parseDateRange(params);

    expect(result.preset).toBe("30d");
  });

  it("falls back to default when invalid preset provided", () => {
    const params = new URLSearchParams({ preset: "invalid" });
    const result = parseDateRange(params);

    expect(result.preset).toBe("30d");
  });
});

describe("getPreviousPeriod", () => {
  it("returns previous period of same duration", () => {
    const range = {
      startDate: new Date("2025-01-10T00:00:00Z"),
      endDate: new Date("2025-01-15T23:59:59Z"),
    };
    const result = getPreviousPeriod(range);

    expect(result.endDate.getTime()).toBeLessThan(range.startDate.getTime());

    const originalDays = Math.ceil((range.endDate.getTime() - range.startDate.getTime()) / (1000 * 60 * 60 * 24));
    const previousDays = Math.ceil((result.endDate.getTime() - result.startDate.getTime()) / (1000 * 60 * 60 * 24));
    expect(previousDays).toBe(originalDays);
  });

  it("handles 30d range correctly", () => {
    const range = {
      startDate: new Date("2024-12-16T00:00:00Z"),
      endDate: new Date("2025-01-15T23:59:59Z"),
    };
    const result = getPreviousPeriod(range);

    expect(toLocalDateString(result.endDate)).toBe("2024-12-15");
  });
});

describe("formatDateRange", () => {
  it("formats date range as human readable string", () => {
    const range = {
      startDate: new Date("2025-01-01T00:00:00Z"),
      endDate: new Date("2025-01-15T23:59:59Z"),
    };
    const result = formatDateRange(range);

    expect(result).toContain("Jan");
    expect(result).toContain("2025");
    expect(result).toContain("-");
  });
});

describe("buildSearchParams", () => {
  it("builds params with preset for non-custom ranges", () => {
    const range = {
      startDate: new Date("2025-01-01"),
      endDate: new Date("2025-01-15"),
      preset: "30d" as const,
    };
    const result = buildSearchParams(range);

    expect(result.get("preset")).toBe("30d");
    expect(result.get("start")).toBeNull();
    expect(result.get("end")).toBeNull();
  });

  it("builds params with start/end for custom ranges", () => {
    const range = {
      startDate: new Date("2025-01-01"),
      endDate: new Date("2025-01-15"),
      preset: "custom" as const,
    };
    const result = buildSearchParams(range);

    expect(result.get("preset")).toBeNull();
    expect(result.get("start")).toBe("2025-01-01");
    expect(result.get("end")).toBe("2025-01-15");
  });
});

describe("calculateTrend", () => {
  it("returns positive trend when current is higher", () => {
    const result = calculateTrend(120, 100);

    expect(result.type).toBe("positive");
    expect(result.value).toBe(20);
  });

  it("returns negative trend when current is lower", () => {
    const result = calculateTrend(80, 100);

    expect(result.type).toBe("negative");
    expect(result.value).toBe(20);
  });

  it("returns neutral trend when values are equal", () => {
    const result = calculateTrend(100, 100);

    expect(result.type).toBe("neutral");
    expect(result.value).toBe(0);
  });

  it("handles zero previous value", () => {
    const result = calculateTrend(50, 0);

    expect(result.type).toBe("positive");
    expect(result.value).toBe(100);
  });

  it("handles both zero values", () => {
    const result = calculateTrend(0, 0);

    expect(result.type).toBe("neutral");
    expect(result.value).toBe(0);
  });
});

describe("formatTrendString", () => {
  it("formats positive trend with up arrow", () => {
    const result = formatTrendString({ value: 20, type: "positive" });

    expect(result).toBe("↑ 20%");
  });

  it("formats negative trend with down arrow", () => {
    const result = formatTrendString({ value: 15, type: "negative" });

    expect(result).toBe("↓ 15%");
  });

  it("formats neutral trend as 0%", () => {
    const result = formatTrendString({ value: 0, type: "neutral" });

    expect(result).toBe("0%");
  });

  it("inverts trend display when invert=true", () => {
    const result = formatTrendString({ value: 20, type: "positive" }, true);

    expect(result).toBe("↓ 20%");
  });
});

describe("formatDuration", () => {
  it("returns N/A for null value", () => {
    expect(formatDuration(null)).toBe("N/A");
  });

  it("formats duration in minutes for short durations", () => {
    expect(formatDuration(120000)).toBe("2m");
    expect(formatDuration(300000)).toBe("5m");
  });

  it("formats duration in hours and minutes for longer durations", () => {
    expect(formatDuration(3600000)).toBe("1h 0m");
    expect(formatDuration(5400000)).toBe("1h 30m");
    expect(formatDuration(7200000)).toBe("2h 0m");
  });
});

describe("formatHours", () => {
  it("returns N/A for null value", () => {
    expect(formatHours(null)).toBe("N/A");
  });

  it("formats hours with decimal for short durations", () => {
    expect(formatHours(1.5)).toBe("1.5h");
    expect(formatHours(18.2)).toBe("18.2h");
  });

  it("formats in days and hours for longer durations", () => {
    expect(formatHours(24)).toBe("1d 0h");
    expect(formatHours(36)).toBe("1d 12h");
    expect(formatHours(48)).toBe("2d 0h");
  });
});

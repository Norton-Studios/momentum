import type { PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { calculateDateRange } from "./date-calculator.js";

describe("calculateDateRange", () => {
  let mockDb: PrismaClient;

  beforeEach(() => {
    mockDb = {
      dataSourceRun: {
        findFirst: vi.fn(),
      },
    } as unknown as PrismaClient;
  });

  it("should use default window when no previous run exists", async () => {
    // Arrange
    const dataSourceId = "ds-123";
    const scriptName = "repository";
    const defaultWindowDays = 90;

    vi.mocked(mockDb.dataSourceRun.findFirst).mockResolvedValue(null);

    const now = new Date();
    const expectedStartDate = new Date(now.getTime() - defaultWindowDays * 24 * 60 * 60 * 1000);

    // Act
    const result = await calculateDateRange(mockDb, dataSourceId, scriptName, defaultWindowDays);

    // Assert
    expect(mockDb.dataSourceRun.findFirst).toHaveBeenCalledWith({
      where: {
        dataSourceId,
        scriptName,
        status: "COMPLETED",
        lastFetchedDataAt: { not: null },
      },
      orderBy: { completedAt: "desc" },
    });

    expect(result.endDate).toBeInstanceOf(Date);
    expect(result.startDate).toBeInstanceOf(Date);

    // Allow some tolerance for execution time
    const timeDiff = Math.abs(result.startDate.getTime() - expectedStartDate.getTime());
    expect(timeDiff).toBeLessThan(1000); // Within 1 second
  });

  it("should use lastFetchedDataAt from previous run when available", async () => {
    // Arrange
    const dataSourceId = "ds-123";
    const scriptName = "repository";
    const defaultWindowDays = 90;
    const lastFetchedAt = new Date("2025-01-01T00:00:00Z");

    vi.mocked(mockDb.dataSourceRun.findFirst).mockResolvedValue({
      id: "run-123",
      dataSourceId,
      scriptName,
      status: "COMPLETED",
      lastFetchedDataAt: lastFetchedAt,
      completedAt: new Date("2025-01-01T01:00:00Z"),
      startedAt: new Date("2025-01-01T00:00:00Z"),
      recordsImported: 100,
      recordsFailed: 0,
      durationMs: 3600000,
      errorMessage: null,
      metadata: null,
      createdAt: new Date("2025-01-01T00:00:00Z"),
      updatedAt: new Date("2025-01-01T01:00:00Z"),
    });

    // Act
    const result = await calculateDateRange(mockDb, dataSourceId, scriptName, defaultWindowDays);

    // Assert
    expect(result.startDate).toEqual(lastFetchedAt);
    expect(result.endDate).toBeInstanceOf(Date);
  });

  it("should return endDate as current time", async () => {
    // Arrange
    const dataSourceId = "ds-123";
    const scriptName = "repository";
    const defaultWindowDays = 90;

    vi.mocked(mockDb.dataSourceRun.findFirst).mockResolvedValue(null);

    const beforeCall = new Date();

    // Act
    const result = await calculateDateRange(mockDb, dataSourceId, scriptName, defaultWindowDays);

    const afterCall = new Date();

    // Assert
    expect(result.endDate.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime());
    expect(result.endDate.getTime()).toBeLessThanOrEqual(afterCall.getTime());
  });
});

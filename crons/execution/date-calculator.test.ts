import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DbClient } from "../db.ts";
import { calculateDateRanges } from "./date-calculator.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const INITIAL_WINDOW_DAYS = 7;
const BACKFILL_CHUNK_DAYS = 7;

describe("calculateDateRanges", () => {
  let mockDb: DbClient;

  beforeEach(() => {
    mockDb = {
      dataSourceRun: {
        findFirst: vi.fn(),
      },
    } as unknown as DbClient;
  });

  it("first import: returns initial window only, no backfill", async () => {
    // Arrange
    const dataSourceId = "ds-123";
    const scriptName = "commit";
    const targetWindowDays = 90;

    vi.mocked(mockDb.dataSourceRun.findFirst).mockResolvedValue(null);

    const beforeCall = new Date();

    // Act
    const result = await calculateDateRanges(mockDb, dataSourceId, scriptName, targetWindowDays);

    const afterCall = new Date();

    // Assert
    expect(result.forward).not.toBeNull();
    expect(result.backfill).toBeNull();
    expect(result.backfillComplete).toBe(false);

    // Forward range should be initial window (7 days)
    if (!result.forward) throw new Error("Expected forward range");
    const expectedStartDate = new Date(beforeCall.getTime() - INITIAL_WINDOW_DAYS * DAY_MS);
    const timeDiff = Math.abs(result.forward.startDate.getTime() - expectedStartDate.getTime());
    expect(timeDiff).toBeLessThan(1000);

    expect(result.forward.endDate.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime());
    expect(result.forward.endDate.getTime()).toBeLessThanOrEqual(afterCall.getTime());
  });

  it("second import: returns forward range and backfill chunk", async () => {
    // Arrange
    const dataSourceId = "ds-123";
    const scriptName = "commit";
    const targetWindowDays = 90;
    const now = new Date();
    const lastFetchedAt = new Date(now.getTime() - DAY_MS); // 1 day ago
    const earliestFetchedAt = new Date(now.getTime() - 8 * DAY_MS); // 8 days ago (after initial 7-day window)

    vi.mocked(mockDb.dataSourceRun.findFirst).mockResolvedValue({
      id: "run-123",
      dataSourceId,
      scriptName,
      status: "COMPLETED",
      lastFetchedDataAt: lastFetchedAt,
      earliestFetchedDataAt: earliestFetchedAt,
      completedAt: new Date(),
      startedAt: new Date(),
      recordsImported: 100,
      recordsFailed: 0,
      durationMs: 1000,
      errorMessage: null,
      metadata: null,
      importBatchId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Act
    const result = await calculateDateRanges(mockDb, dataSourceId, scriptName, targetWindowDays);

    // Assert
    expect(result.forward).not.toBeNull();
    expect(result.backfill).not.toBeNull();
    expect(result.backfillComplete).toBe(false);

    // Forward range: from lastFetchedAt to now
    if (!result.forward || !result.backfill) throw new Error("Expected forward and backfill ranges");
    expect(result.forward.startDate.getTime()).toBe(lastFetchedAt.getTime());

    // Backfill range: 7 days before earliestFetchedAt
    const expectedBackfillStart = new Date(earliestFetchedAt.getTime() - BACKFILL_CHUNK_DAYS * DAY_MS);
    expect(result.backfill.startDate.getTime()).toBe(expectedBackfillStart.getTime());
    expect(result.backfill.endDate.getTime()).toBe(earliestFetchedAt.getTime());
  });

  it("backfill complete: returns forward range only when 90 days reached", async () => {
    // Arrange
    const dataSourceId = "ds-123";
    const scriptName = "commit";
    const targetWindowDays = 90;
    const now = new Date();
    const lastFetchedAt = new Date(now.getTime() - DAY_MS);
    // Earliest fetched is more than 90 days ago
    const earliestFetchedAt = new Date(now.getTime() - 100 * DAY_MS);

    vi.mocked(mockDb.dataSourceRun.findFirst).mockResolvedValue({
      id: "run-123",
      dataSourceId,
      scriptName,
      status: "COMPLETED",
      lastFetchedDataAt: lastFetchedAt,
      earliestFetchedDataAt: earliestFetchedAt,
      completedAt: new Date(),
      startedAt: new Date(),
      recordsImported: 100,
      recordsFailed: 0,
      durationMs: 1000,
      errorMessage: null,
      metadata: null,
      importBatchId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Act
    const result = await calculateDateRanges(mockDb, dataSourceId, scriptName, targetWindowDays);

    // Assert
    expect(result.forward).not.toBeNull();
    expect(result.backfill).toBeNull();
    expect(result.backfillComplete).toBe(true);

    if (!result.forward) throw new Error("Expected forward range");
    expect(result.forward.startDate.getTime()).toBe(lastFetchedAt.getTime());
  });

  it("backfill chunk respects target boundary", async () => {
    // Arrange
    const dataSourceId = "ds-123";
    const scriptName = "commit";
    const targetWindowDays = 90;
    const now = new Date();
    const lastFetchedAt = new Date(now.getTime() - DAY_MS);
    // Earliest fetched is 88 days ago (only 2 days from target)
    const earliestFetchedAt = new Date(now.getTime() - 88 * DAY_MS);
    const targetBoundary = new Date(now.getTime() - targetWindowDays * DAY_MS);

    vi.mocked(mockDb.dataSourceRun.findFirst).mockResolvedValue({
      id: "run-123",
      dataSourceId,
      scriptName,
      status: "COMPLETED",
      lastFetchedDataAt: lastFetchedAt,
      earliestFetchedDataAt: earliestFetchedAt,
      completedAt: new Date(),
      startedAt: new Date(),
      recordsImported: 100,
      recordsFailed: 0,
      durationMs: 1000,
      errorMessage: null,
      metadata: null,
      importBatchId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Act
    const result = await calculateDateRanges(mockDb, dataSourceId, scriptName, targetWindowDays);

    // Assert
    expect(result.backfill).not.toBeNull();
    expect(result.backfillComplete).toBe(false);

    // Backfill should start at target boundary (90 days ago), not 7 days before earliest
    if (!result.backfill) throw new Error("Expected backfill range");
    const timeDiff = Math.abs(result.backfill.startDate.getTime() - targetBoundary.getTime());
    expect(timeDiff).toBeLessThan(1000);
  });

  it("handles legacy runs without earliestFetchedDataAt", async () => {
    // Arrange
    const dataSourceId = "ds-123";
    const scriptName = "commit";
    const targetWindowDays = 90;
    const now = new Date();
    const lastFetchedAt = new Date(now.getTime() - DAY_MS);

    // Legacy run without earliestFetchedDataAt
    vi.mocked(mockDb.dataSourceRun.findFirst).mockResolvedValue({
      id: "run-123",
      dataSourceId,
      scriptName,
      status: "COMPLETED",
      lastFetchedDataAt: lastFetchedAt,
      earliestFetchedDataAt: null,
      completedAt: new Date(),
      startedAt: new Date(),
      recordsImported: 100,
      recordsFailed: 0,
      durationMs: 1000,
      errorMessage: null,
      metadata: null,
      importBatchId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Act
    const result = await calculateDateRanges(mockDb, dataSourceId, scriptName, targetWindowDays);

    // Assert
    // Should estimate earliest based on initial window
    expect(result.backfill).not.toBeNull();
    if (!result.backfill) throw new Error("Expected backfill range");
    const estimatedEarliest = new Date(lastFetchedAt.getTime() - INITIAL_WINDOW_DAYS * DAY_MS);
    expect(result.backfill.endDate.getTime()).toBe(estimatedEarliest.getTime());
  });

  it("queries database with correct parameters", async () => {
    // Arrange
    const dataSourceId = "ds-123";
    const scriptName = "commit";
    const targetWindowDays = 90;

    vi.mocked(mockDb.dataSourceRun.findFirst).mockResolvedValue(null);

    // Act
    await calculateDateRanges(mockDb, dataSourceId, scriptName, targetWindowDays);

    // Assert
    expect(mockDb.dataSourceRun.findFirst).toHaveBeenCalledWith({
      where: {
        dataSourceId,
        scriptName,
        status: "COMPLETED",
      },
      orderBy: { completedAt: "desc" },
    });
  });
});

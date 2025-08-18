import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { calculateDateRange } from "./date-range";
import type { PrismaClient } from "@mmtm/database";

// Mock PrismaClient
const mockDb = {
  dataSourceRun: {
    findFirst: vi.fn(),
  },
} as unknown as PrismaClient;

describe("date-range", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock Date.now() to have predictable results
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T10:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("calculateDateRange", () => {
    it("should return 90 days ago as start date for first run", async () => {
      // No previous run exists
      (mockDb.dataSourceRun.findFirst as any).mockResolvedValue(null);

      const result = await calculateDateRange(
        mockDb,
        "tenant-1",
        "github",
        "repository",
        180 * 24 * 60 * 60 * 1000, // 180 days (longer than 90 days)
      );

      // Check that endDate is approximately "now" (within 1 second)
      const now = new Date("2024-01-15T10:00:00Z");
      expect(Math.abs(result.endDate.getTime() - now.getTime())).toBeLessThan(1000);

      // Check that startDate is approximately 90 days before endDate (allow for some variance)
      const daysDiff = (result.endDate.getTime() - result.startDate.getTime()) / (24 * 60 * 60 * 1000);
      expect(daysDiff).toBeGreaterThan(89);
      expect(daysDiff).toBeLessThan(91);

      expect(mockDb.dataSourceRun.findFirst).toHaveBeenCalledWith({
        where: {
          tenantId: "tenant-1",
          dataSource: "github",
          script: "repository",
          status: "COMPLETED",
        },
        orderBy: { completedAt: "desc" },
      });
    });

    it("should continue from last fetched data date when previous run exists and is recent", async () => {
      // Use a recent date within the 24-hour import window
      const lastFetchedDate = new Date("2024-01-14T12:00:00Z"); // Within 24 hours of "now"
      const mockLastRun = {
        id: "run-1",
        tenantId: "tenant-1",
        dataSource: "github",
        script: "repository",
        status: "COMPLETED",
        lastFetchedDataDate: lastFetchedDate,
        completedAt: new Date("2024-01-14T13:00:00Z"),
      };

      (mockDb.dataSourceRun.findFirst as any).mockResolvedValue(mockLastRun);

      const result = await calculateDateRange(
        mockDb,
        "tenant-1",
        "github",
        "repository",
        86400 * 1000, // 24 hours
      );

      // endDate should be approximately "now" (the mock time)
      const expectedEndDate = new Date("2024-01-15T10:00:00Z");
      expect(Math.abs(result.endDate.getTime() - expectedEndDate.getTime())).toBeLessThan(1000);

      // startDate should equal lastFetchedDate since it's within the import window
      expect(result.startDate.getTime()).toBe(lastFetchedDate.getTime());
    });

    it("should respect import window duration when last run is too old", async () => {
      const veryOldDate = new Date("2024-01-01T08:00:00Z"); // 14 days ago
      const mockLastRun = {
        id: "run-1",
        tenantId: "tenant-1",
        dataSource: "github",
        script: "repository",
        status: "COMPLETED",
        lastFetchedDataDate: veryOldDate,
        completedAt: new Date("2024-01-01T09:00:00Z"),
      };

      (mockDb.dataSourceRun.findFirst as any).mockResolvedValue(mockLastRun);

      const importWindowDuration = 7 * 24 * 60 * 60 * 1000; // 7 days
      const result = await calculateDateRange(mockDb, "tenant-1", "github", "repository", importWindowDuration);

      const expectedEndDate = new Date("2024-01-15T10:00:00Z");
      const expectedStartDate = new Date(expectedEndDate.getTime() - importWindowDuration); // 7 days ago

      expect(result.endDate).toEqual(expectedEndDate);
      expect(result.startDate).toEqual(expectedStartDate);
      expect(result.startDate).not.toEqual(veryOldDate); // Should not use the very old date
    });

    it("should handle previous run without lastFetchedDataDate", async () => {
      const mockLastRun = {
        id: "run-1",
        tenantId: "tenant-1",
        dataSource: "github",
        script: "repository",
        status: "COMPLETED",
        lastFetchedDataDate: null, // No last fetched date
        completedAt: new Date("2024-01-10T09:00:00Z"),
      };

      (mockDb.dataSourceRun.findFirst as any).mockResolvedValue(mockLastRun);

      const result = await calculateDateRange(
        mockDb,
        "tenant-1",
        "github",
        "repository",
        180 * 24 * 60 * 60 * 1000, // 180 days (longer than 90 days)
      );

      const expectedEndDate = new Date("2024-01-15T10:00:00Z");

      expect(Math.abs(result.endDate.getTime() - expectedEndDate.getTime())).toBeLessThan(1000);
      // Check that startDate is approximately 90 days before endDate (allow for some variance)
      const daysDiff = (result.endDate.getTime() - result.startDate.getTime()) / (24 * 60 * 60 * 1000);
      expect(daysDiff).toBeGreaterThan(89);
      expect(daysDiff).toBeLessThan(91);
    });

    it("should use import window duration when 90 days exceeds the limit", async () => {
      // No previous run exists
      (mockDb.dataSourceRun.findFirst as any).mockResolvedValue(null);

      const shortImportWindow = 7 * 24 * 60 * 60 * 1000; // 7 days
      const result = await calculateDateRange(mockDb, "tenant-1", "github", "repository", shortImportWindow);

      const expectedEndDate = new Date("2024-01-15T10:00:00Z");
      const expectedStartDate = new Date(expectedEndDate.getTime() - shortImportWindow); // 7 days ago, not 90

      expect(result.endDate).toEqual(expectedEndDate);
      expect(result.startDate).toEqual(expectedStartDate);
    });

    it("should handle very large import window duration", async () => {
      // No previous run exists
      (mockDb.dataSourceRun.findFirst as any).mockResolvedValue(null);

      const largeImportWindow = 365 * 24 * 60 * 60 * 1000; // 1 year
      const result = await calculateDateRange(mockDb, "tenant-1", "github", "repository", largeImportWindow);

      const expectedEndDate = new Date("2024-01-15T10:00:00Z");
      const expectedStartDate = new Date(expectedEndDate.getTime() - 90 * 24 * 60 * 60 * 1000); // Still 90 days ago

      expect(result.endDate).toEqual(expectedEndDate);
      expect(result.startDate).toEqual(expectedStartDate);
    });

    it("should handle recent last run within import window", async () => {
      const recentDate = new Date("2024-01-14T08:00:00Z"); // 1 day ago
      const mockLastRun = {
        id: "run-1",
        tenantId: "tenant-1",
        dataSource: "github",
        script: "repository",
        status: "COMPLETED",
        lastFetchedDataDate: recentDate,
        completedAt: new Date("2024-01-14T09:00:00Z"),
      };

      (mockDb.dataSourceRun.findFirst as any).mockResolvedValue(mockLastRun);

      const importWindowDuration = 7 * 24 * 60 * 60 * 1000; // 7 days
      const result = await calculateDateRange(mockDb, "tenant-1", "github", "repository", importWindowDuration);

      const expectedEndDate = new Date("2024-01-15T10:00:00Z");

      expect(result.endDate).toEqual(expectedEndDate);
      expect(result.startDate).toEqual(recentDate); // Should use the recent date as-is
    });

    it("should handle database errors gracefully", async () => {
      const error = new Error("Database connection failed");
      (mockDb.dataSourceRun.findFirst as any).mockRejectedValue(error);

      await expect(calculateDateRange(mockDb, "tenant-1", "github", "repository", 86400 * 1000)).rejects.toThrow("Database connection failed");
    });

    it("should handle zero import window duration", async () => {
      // No previous run exists
      (mockDb.dataSourceRun.findFirst as any).mockResolvedValue(null);

      const result = await calculateDateRange(
        mockDb,
        "tenant-1",
        "github",
        "repository",
        0, // Zero duration
      );

      const expectedEndDate = new Date("2024-01-15T10:00:00Z");
      // With zero duration, maxStartDate equals endDate, so startDate should be endDate
      expect(result.endDate).toEqual(expectedEndDate);
      expect(result.startDate).toEqual(expectedEndDate);
    });

    it("should handle edge case where start date equals end date", async () => {
      const sameTime = new Date("2024-01-15T10:00:00Z");
      const mockLastRun = {
        id: "run-1",
        tenantId: "tenant-1",
        dataSource: "github",
        script: "repository",
        status: "COMPLETED",
        lastFetchedDataDate: sameTime,
        completedAt: sameTime,
      };

      (mockDb.dataSourceRun.findFirst as any).mockResolvedValue(mockLastRun);

      const result = await calculateDateRange(
        mockDb,
        "tenant-1",
        "github",
        "repository",
        86400 * 1000, // 24 hours
      );

      const expectedEndDate = new Date("2024-01-15T10:00:00Z");

      expect(result.endDate).toEqual(expectedEndDate);
      expect(result.startDate).toEqual(sameTime);
    });

    it("should query for correct tenant, data source, and script", async () => {
      (mockDb.dataSourceRun.findFirst as any).mockResolvedValue(null);

      await calculateDateRange(mockDb, "specific-tenant", "gitlab", "issues", 86400 * 1000);

      expect(mockDb.dataSourceRun.findFirst).toHaveBeenCalledWith({
        where: {
          tenantId: "specific-tenant",
          dataSource: "gitlab",
          script: "issues",
          status: "COMPLETED",
        },
        orderBy: { completedAt: "desc" },
      });
    });
  });
});

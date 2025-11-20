import type { PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { completeRun, createRun, failRun } from "./run-tracker.js";

describe("run-tracker", () => {
  let mockDb: PrismaClient;

  beforeEach(() => {
    mockDb = {
      dataSourceRun: {
        create: vi.fn(),
        update: vi.fn(),
        findUnique: vi.fn(),
      },
    } as unknown as PrismaClient;
  });

  describe("createRun", () => {
    it("should create a new run with RUNNING status", async () => {
      // Arrange
      const dataSourceId = "ds-123";
      const scriptName = "repository";
      const runId = "run-123";

      vi.mocked(mockDb.dataSourceRun.create).mockResolvedValue({
        id: runId,
        dataSourceId,
        scriptName,
        status: "RUNNING",
        startedAt: new Date(),
        recordsImported: 0,
        recordsFailed: 0,
        completedAt: null,
        durationMs: null,
        errorMessage: null,
        lastFetchedDataAt: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      const result = await createRun(mockDb, dataSourceId, scriptName);

      // Assert
      expect(result).toBe(runId);
      expect(mockDb.dataSourceRun.create).toHaveBeenCalledWith({
        data: {
          dataSourceId,
          scriptName,
          status: "RUNNING",
          startedAt: expect.any(Date),
          recordsImported: 0,
          recordsFailed: 0,
        },
      });
    });
  });

  describe("completeRun", () => {
    it("should mark run as COMPLETED with metrics", async () => {
      // Arrange
      const runId = "run-123";
      const recordsImported = 50;
      const startedAt = new Date("2025-01-01T00:00:00Z");
      const lastFetchedDataAt = new Date("2025-01-01T01:00:00Z");

      vi.mocked(mockDb.dataSourceRun.findUnique).mockResolvedValue({
        id: runId,
        dataSourceId: "ds-123",
        scriptName: "repository",
        status: "RUNNING",
        startedAt,
        recordsImported: 0,
        recordsFailed: 0,
        completedAt: null,
        durationMs: null,
        errorMessage: null,
        lastFetchedDataAt: null,
        metadata: null,
        createdAt: startedAt,
        updatedAt: startedAt,
      });

      vi.mocked(mockDb.dataSourceRun.update).mockResolvedValue({
        id: runId,
        dataSourceId: "ds-123",
        scriptName: "repository",
        status: "COMPLETED",
        startedAt,
        recordsImported,
        recordsFailed: 0,
        completedAt: new Date(),
        durationMs: 3600000,
        errorMessage: null,
        lastFetchedDataAt,
        metadata: null,
        createdAt: startedAt,
        updatedAt: new Date(),
      });

      // Act
      await completeRun(mockDb, runId, recordsImported, lastFetchedDataAt);

      // Assert
      expect(mockDb.dataSourceRun.findUnique).toHaveBeenCalledWith({
        where: { id: runId },
      });

      expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
        where: { id: runId },
        data: {
          status: "COMPLETED",
          recordsImported,
          lastFetchedDataAt,
          completedAt: expect.any(Date),
          durationMs: expect.any(Number),
        },
      });
    });

    it("should throw error if run not found", async () => {
      // Arrange
      const runId = "run-123";
      const recordsImported = 50;
      const lastFetchedDataAt = new Date();

      vi.mocked(mockDb.dataSourceRun.findUnique).mockResolvedValue(null);

      // Act & Assert
      await expect(completeRun(mockDb, runId, recordsImported, lastFetchedDataAt)).rejects.toThrow(`DataSourceRun ${runId} not found`);
    });
  });

  describe("failRun", () => {
    it("should mark run as FAILED with error message", async () => {
      // Arrange
      const runId = "run-123";
      const errorMessage = "Failed to connect to API";
      const startedAt = new Date("2025-01-01T00:00:00Z");

      vi.mocked(mockDb.dataSourceRun.findUnique).mockResolvedValue({
        id: runId,
        dataSourceId: "ds-123",
        scriptName: "repository",
        status: "RUNNING",
        startedAt,
        recordsImported: 0,
        recordsFailed: 0,
        completedAt: null,
        durationMs: null,
        errorMessage: null,
        lastFetchedDataAt: null,
        metadata: null,
        createdAt: startedAt,
        updatedAt: startedAt,
      });

      vi.mocked(mockDb.dataSourceRun.update).mockResolvedValue({
        id: runId,
        dataSourceId: "ds-123",
        scriptName: "repository",
        status: "FAILED",
        startedAt,
        recordsImported: 0,
        recordsFailed: 0,
        completedAt: new Date(),
        durationMs: 1000,
        errorMessage,
        lastFetchedDataAt: null,
        metadata: null,
        createdAt: startedAt,
        updatedAt: new Date(),
      });

      // Act
      await failRun(mockDb, runId, errorMessage);

      // Assert
      expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
        where: { id: runId },
        data: {
          status: "FAILED",
          errorMessage,
          completedAt: expect.any(Date),
          durationMs: expect.any(Number),
        },
      });
    });

    it("should throw error if run not found", async () => {
      // Arrange
      const runId = "run-123";
      const errorMessage = "Failed";

      vi.mocked(mockDb.dataSourceRun.findUnique).mockResolvedValue(null);

      // Act & Assert
      await expect(failRun(mockDb, runId, errorMessage)).rejects.toThrow(`DataSourceRun ${runId} not found`);
    });
  });
});

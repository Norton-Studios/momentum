import type { PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { acquireAdvisoryLock, acquireGlobalOrchestratorLock, releaseAdvisoryLock, releaseGlobalOrchestratorLock } from "./advisory-locks.js";

describe("advisory-locks", () => {
  let mockDb: PrismaClient;

  beforeEach(() => {
    mockDb = {
      $queryRaw: vi.fn(),
    } as unknown as PrismaClient;
  });

  describe("acquireGlobalOrchestratorLock", () => {
    it("should return true when lock is acquired", async () => {
      // Arrange
      vi.mocked(mockDb.$queryRaw).mockResolvedValue([{ pg_try_advisory_lock: true }]);

      // Act
      const result = await acquireGlobalOrchestratorLock(mockDb);

      // Assert
      expect(result).toBe(true);
      expect(mockDb.$queryRaw).toHaveBeenCalled();
    });

    it("should return false when lock cannot be acquired", async () => {
      // Arrange
      vi.mocked(mockDb.$queryRaw).mockResolvedValue([{ pg_try_advisory_lock: false }]);

      // Act
      const result = await acquireGlobalOrchestratorLock(mockDb);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe("releaseGlobalOrchestratorLock", () => {
    it("should call pg_advisory_unlock", async () => {
      // Arrange
      vi.mocked(mockDb.$queryRaw).mockResolvedValue([]);

      // Act
      await releaseGlobalOrchestratorLock(mockDb);

      // Assert
      expect(mockDb.$queryRaw).toHaveBeenCalled();
    });
  });

  describe("acquireAdvisoryLock", () => {
    it("should return true when lock is acquired", async () => {
      // Arrange
      const lockKey = "GITHUB:repository";
      vi.mocked(mockDb.$queryRaw).mockResolvedValue([{ pg_try_advisory_lock: true }]);

      // Act
      const result = await acquireAdvisoryLock(mockDb, lockKey);

      // Assert
      expect(result).toBe(true);
      expect(mockDb.$queryRaw).toHaveBeenCalled();
    });

    it("should return false when lock cannot be acquired", async () => {
      // Arrange
      const lockKey = "GITHUB:repository";
      vi.mocked(mockDb.$queryRaw).mockResolvedValue([{ pg_try_advisory_lock: false }]);

      // Act
      const result = await acquireAdvisoryLock(mockDb, lockKey);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe("releaseAdvisoryLock", () => {
    it("should call pg_advisory_unlock with correct lockKey", async () => {
      // Arrange
      const lockKey = "GITHUB:repository";
      vi.mocked(mockDb.$queryRaw).mockResolvedValue([]);

      // Act
      await releaseAdvisoryLock(mockDb, lockKey);

      // Assert
      expect(mockDb.$queryRaw).toHaveBeenCalled();
    });
  });
});

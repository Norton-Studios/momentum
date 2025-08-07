import { describe, it, expect, vi, beforeEach } from "vitest";
import { getOnboardingProgress, updateOnboardingProgress, completeOnboarding } from "./onboarding-progress";
import type { PrismaClient } from "@mmtm/database";

// Mock the PrismaClient
const mockDb = {
  onboardingProgress: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
  },
} as unknown as PrismaClient;

describe("onboarding-progress hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getOnboardingProgress", () => {
    const mockProgress = {
      id: "progress-id",
      tenantId: "tenant-id",
      currentStep: "data-sources",
      completedSteps: ["signup"],
      wizardData: { test: "data" },
      completed: false,
    };

    it("retrieves onboarding progress for tenant", async () => {
      (mockDb.onboardingProgress.findUnique as any).mockResolvedValue(mockProgress);

      const result = await getOnboardingProgress("tenant-id", mockDb);

      expect(mockDb.onboardingProgress.findUnique).toHaveBeenCalledWith({
        where: { tenantId: "tenant-id" },
      });
      expect(result).toEqual(mockProgress);
    });

    it("returns null when no progress found", async () => {
      (mockDb.onboardingProgress.findUnique as any).mockResolvedValue(null);

      const result = await getOnboardingProgress("non-existent-tenant", mockDb);

      expect(result).toBeNull();
    });
  });

  describe("updateOnboardingProgress", () => {
    const mockUpdatedProgress = {
      id: "progress-id",
      tenantId: "tenant-id",
      currentStep: "teams",
      completedSteps: ["signup", "data-sources"],
      wizardData: { dataSourceConfigs: [] },
      completed: false,
    };

    it("updates existing onboarding progress", async () => {
      (mockDb.onboardingProgress.upsert as any).mockResolvedValue(mockUpdatedProgress);

      const result = await updateOnboardingProgress("tenant-id", "teams", ["signup", "data-sources"], { dataSourceConfigs: [] }, mockDb);

      expect(mockDb.onboardingProgress.upsert).toHaveBeenCalledWith({
        where: { tenantId: "tenant-id" },
        update: {
          currentStep: "teams",
          completedSteps: ["signup", "data-sources"],
          wizardData: { dataSourceConfigs: [] },
        },
        create: {
          tenantId: "tenant-id",
          currentStep: "teams",
          completedSteps: ["signup", "data-sources"],
          wizardData: { dataSourceConfigs: [] },
        },
      });

      expect(result).toEqual(mockUpdatedProgress);
    });

    it("creates new progress if none exists", async () => {
      (mockDb.onboardingProgress.upsert as any).mockResolvedValue({
        ...mockUpdatedProgress,
        id: "new-progress-id",
      });

      await updateOnboardingProgress("new-tenant-id", "data-sources", ["signup"], { orgName: "test" }, mockDb);

      expect(mockDb.onboardingProgress.upsert).toHaveBeenCalledWith({
        where: { tenantId: "new-tenant-id" },
        update: {
          currentStep: "data-sources",
          completedSteps: ["signup"],
          wizardData: { orgName: "test" },
        },
        create: {
          tenantId: "new-tenant-id",
          currentStep: "data-sources",
          completedSteps: ["signup"],
          wizardData: { orgName: "test" },
        },
      });
    });
  });

  describe("completeOnboarding", () => {
    const mockCompletedProgress = {
      id: "progress-id",
      tenantId: "tenant-id",
      currentStep: "completed",
      completedSteps: ["signup", "data-sources", "teams", "review"],
      wizardData: {},
      completed: true,
    };

    it("marks onboarding as completed", async () => {
      (mockDb.onboardingProgress.update as any).mockResolvedValue(mockCompletedProgress);

      const result = await completeOnboarding("tenant-id", mockDb);

      expect(mockDb.onboardingProgress.update).toHaveBeenCalledWith({
        where: { tenantId: "tenant-id" },
        data: {
          completed: true,
          currentStep: "completed",
        },
      });

      expect(result).toEqual(mockCompletedProgress);
    });
  });

  describe("error handling", () => {
    it("propagates database errors for getOnboardingProgress", async () => {
      const dbError = new Error("Database connection failed");
      (mockDb.onboardingProgress.findUnique as any).mockRejectedValue(dbError);

      await expect(getOnboardingProgress("tenant-id", mockDb)).rejects.toThrow("Database connection failed");
    });

    it("propagates database errors for updateOnboardingProgress", async () => {
      const dbError = new Error("Update failed");
      (mockDb.onboardingProgress.upsert as any).mockRejectedValue(dbError);

      await expect(updateOnboardingProgress("tenant-id", "step", [], {}, mockDb)).rejects.toThrow("Update failed");
    });

    it("propagates database errors for completeOnboarding", async () => {
      const dbError = new Error("Update failed");
      (mockDb.onboardingProgress.update as any).mockRejectedValue(dbError);

      await expect(completeOnboarding("tenant-id", mockDb)).rejects.toThrow("Update failed");
    });
  });
});

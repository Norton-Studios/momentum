import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { executeScript } from "./script-executor";
import type { PrismaClient } from "@mmtm/database";
import type { DataSourceScript } from "../dependencies/loader";

// Mock the date-range module
vi.mock("./date-range", () => ({
  calculateDateRange: vi.fn(),
}));

import { calculateDateRange } from "./date-range";

// Mock PrismaClient
const mockDb = {
  dataSourceRun: {
    findMany: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
  },
} as unknown as PrismaClient;

describe("script-executor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("executeScript", () => {
    const mockScript: DataSourceScript = {
      name: "github-repository",
      dataSource: "github",
      scriptName: "repository",
      resources: ["repository"],
      dependencies: [],
      importWindowDuration: 86400 * 1000, // 24 hours
      run: vi.fn(),
    };

    it("should execute script successfully for new tenant", async () => {
      // No existing runs
      (mockDb.dataSourceRun.findMany as any).mockResolvedValue([]);

      // Mock date range calculation
      const startDate = new Date("2024-01-10T00:00:00Z");
      const endDate = new Date("2024-01-15T00:00:00Z");
      (calculateDateRange as any).mockResolvedValue({ startDate, endDate });

      // Mock database operations
      const mockRunRecord = {
        id: "run-123",
        tenantId: "tenant-1",
        dataSource: "github",
        script: "repository",
        status: "RUNNING",
        startedAt: new Date(),
      };
      (mockDb.dataSourceRun.upsert as any).mockResolvedValue(mockRunRecord);
      (mockDb.dataSourceRun.update as any).mockResolvedValue({});

      // Mock successful script execution
      (mockScript.run as any).mockResolvedValue(undefined);

      const env = { GITHUB_TOKEN: "ghp_test123" };

      await executeScript(mockDb, mockScript, "tenant-1", env);

      // Verify date range calculation
      expect(calculateDateRange).toHaveBeenCalledWith(mockDb, "tenant-1", "github", "repository", 86400 * 1000);

      // Verify run record creation
      expect(mockDb.dataSourceRun.upsert).toHaveBeenCalledWith({
        where: {
          tenantId_dataSource_script: {
            tenantId: "tenant-1",
            dataSource: "github",
            script: "repository",
          },
        },
        update: {
          status: "RUNNING",
          startedAt: expect.any(Date),
          completedAt: null,
          error: null,
        },
        create: {
          tenantId: "tenant-1",
          dataSource: "github",
          script: "repository",
          status: "RUNNING",
          startedAt: expect.any(Date),
        },
      });

      // Verify script execution
      expect(mockScript.run).toHaveBeenCalledWith(env, mockDb, "tenant-1", startDate, endDate);

      // Verify completion update
      expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
        where: { id: "run-123" },
        data: {
          status: "COMPLETED",
          completedAt: expect.any(Date),
          lastFetchedDataDate: endDate,
          error: null,
        },
      });

      expect(console.log).toHaveBeenCalledWith(`Executing github-repository for tenant tenant-1: ${startDate.toISOString()} to ${endDate.toISOString()}`);
      expect(console.log).toHaveBeenCalledWith("Completed github-repository for tenant tenant-1");
    });

    it("should skip execution if script is already running (recent)", async () => {
      const recentStartTime = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
      const existingRun = {
        id: "run-123",
        tenantId: "tenant-1",
        dataSource: "github",
        script: "repository",
        status: "RUNNING",
        startedAt: recentStartTime,
      };

      (mockDb.dataSourceRun.findMany as any).mockResolvedValue([existingRun]);

      const env = { GITHUB_TOKEN: "ghp_test123" };

      await executeScript(mockDb, mockScript, "tenant-1", env);

      expect(console.log).toHaveBeenCalledWith("Script github-repository is already running for tenant tenant-1, skipping");

      // Should not proceed with execution
      expect(calculateDateRange).not.toHaveBeenCalled();
      expect(mockDb.dataSourceRun.upsert).not.toHaveBeenCalled();
      expect(mockScript.run).not.toHaveBeenCalled();
    });

    it("should proceed if stale run exists (older than 1 hour)", async () => {
      const staleStartTime = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      const existingRun = {
        id: "run-123",
        tenantId: "tenant-1",
        dataSource: "github",
        script: "repository",
        status: "RUNNING",
        startedAt: staleStartTime,
      };

      (mockDb.dataSourceRun.findMany as any).mockResolvedValue([existingRun]);

      const startDate = new Date("2024-01-10T00:00:00Z");
      const endDate = new Date("2024-01-15T00:00:00Z");
      (calculateDateRange as any).mockResolvedValue({ startDate, endDate });

      const mockRunRecord = { id: "run-456" };
      (mockDb.dataSourceRun.upsert as any).mockResolvedValue(mockRunRecord);
      (mockDb.dataSourceRun.update as any).mockResolvedValue({});
      (mockScript.run as any).mockResolvedValue(undefined);

      const env = { GITHUB_TOKEN: "ghp_test123" };

      await executeScript(mockDb, mockScript, "tenant-1", env);

      // Should proceed with execution despite existing run (because it's stale)
      expect(calculateDateRange).toHaveBeenCalled();
      expect(mockDb.dataSourceRun.upsert).toHaveBeenCalled();
      expect(mockScript.run).toHaveBeenCalled();
    });

    it("should handle script execution failure", async () => {
      (mockDb.dataSourceRun.findMany as any).mockResolvedValue([]);

      const startDate = new Date("2024-01-10T00:00:00Z");
      const endDate = new Date("2024-01-15T00:00:00Z");
      (calculateDateRange as any).mockResolvedValue({ startDate, endDate });

      const mockRunRecord = { id: "run-123" };
      (mockDb.dataSourceRun.upsert as any).mockResolvedValue(mockRunRecord);
      (mockDb.dataSourceRun.update as any).mockResolvedValue({});

      // Mock script failure
      const scriptError = new Error("API rate limit exceeded");
      (mockScript.run as any).mockRejectedValue(scriptError);

      const env = { GITHUB_TOKEN: "ghp_test123" };

      await expect(executeScript(mockDb, mockScript, "tenant-1", env)).rejects.toThrow("API rate limit exceeded");

      // Verify run record was marked as failed
      expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
        where: { id: "run-123" },
        data: {
          status: "FAILED",
          completedAt: expect.any(Date),
          error: "API rate limit exceeded",
        },
      });

      expect(console.error).toHaveBeenCalledWith("Failed github-repository for tenant tenant-1:", scriptError);
    });

    it("should handle non-Error script failures", async () => {
      (mockDb.dataSourceRun.findMany as any).mockResolvedValue([]);

      const startDate = new Date("2024-01-10T00:00:00Z");
      const endDate = new Date("2024-01-15T00:00:00Z");
      (calculateDateRange as any).mockResolvedValue({ startDate, endDate });

      const mockRunRecord = { id: "run-123" };
      (mockDb.dataSourceRun.upsert as any).mockResolvedValue(mockRunRecord);
      (mockDb.dataSourceRun.update as any).mockResolvedValue({});

      // Mock non-Error rejection
      (mockScript.run as any).mockRejectedValue("String error message");

      const env = { GITHUB_TOKEN: "ghp_test123" };

      await expect(executeScript(mockDb, mockScript, "tenant-1", env)).rejects.toBe("String error message");

      // Verify error was converted to string
      expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
        where: { id: "run-123" },
        data: {
          status: "FAILED",
          completedAt: expect.any(Date),
          error: "String error message",
        },
      });
    });

    it("should handle database errors during setup", async () => {
      const dbError = new Error("Database connection failed");
      (mockDb.dataSourceRun.findMany as any).mockRejectedValue(dbError);

      const env = { GITHUB_TOKEN: "ghp_test123" };

      await expect(executeScript(mockDb, mockScript, "tenant-1", env)).rejects.toThrow("Database connection failed");

      expect(console.error).toHaveBeenCalledWith("Error executing script github-repository for tenant tenant-1:", dbError);
    });

    it("should handle calculate date range errors", async () => {
      (mockDb.dataSourceRun.findMany as any).mockResolvedValue([]);

      const dateRangeError = new Error("Invalid date range configuration");
      (calculateDateRange as any).mockRejectedValue(dateRangeError);

      const env = { GITHUB_TOKEN: "ghp_test123" };

      await expect(executeScript(mockDb, mockScript, "tenant-1", env)).rejects.toThrow("Invalid date range configuration");

      expect(console.error).toHaveBeenCalledWith("Error executing script github-repository for tenant tenant-1:", dateRangeError);
    });

    it("should handle upsert failures", async () => {
      (mockDb.dataSourceRun.findMany as any).mockResolvedValue([]);

      const startDate = new Date("2024-01-10T00:00:00Z");
      const endDate = new Date("2024-01-15T00:00:00Z");
      (calculateDateRange as any).mockResolvedValue({ startDate, endDate });

      const upsertError = new Error("Unique constraint violation");
      (mockDb.dataSourceRun.upsert as any).mockRejectedValue(upsertError);

      const env = { GITHUB_TOKEN: "ghp_test123" };

      await expect(executeScript(mockDb, mockScript, "tenant-1", env)).rejects.toThrow("Unique constraint violation");

      expect(console.error).toHaveBeenCalledWith("Error executing script github-repository for tenant tenant-1:", upsertError);
    });

    it("should handle completed run status correctly", async () => {
      const completedRun = {
        id: "run-123",
        tenantId: "tenant-1",
        dataSource: "github",
        script: "repository",
        status: "COMPLETED",
        startedAt: new Date(Date.now() - 30 * 60 * 1000),
      };

      (mockDb.dataSourceRun.findMany as any).mockResolvedValue([completedRun]);

      const startDate = new Date("2024-01-10T00:00:00Z");
      const endDate = new Date("2024-01-15T00:00:00Z");
      (calculateDateRange as any).mockResolvedValue({ startDate, endDate });

      const mockRunRecord = { id: "run-456" };
      (mockDb.dataSourceRun.upsert as any).mockResolvedValue(mockRunRecord);
      (mockDb.dataSourceRun.update as any).mockResolvedValue({});
      (mockScript.run as any).mockResolvedValue(undefined);

      const env = { GITHUB_TOKEN: "ghp_test123" };

      await executeScript(mockDb, mockScript, "tenant-1", env);

      // Should proceed normally since the existing run is completed
      expect(calculateDateRange).toHaveBeenCalled();
      expect(mockScript.run).toHaveBeenCalled();
    });

    it("should respect exactly 1 hour threshold for stale runs", async () => {
      const exactlyOneHourAgo = new Date(Date.now() - 60 * 60 * 1000); // Exactly 1 hour
      const existingRun = {
        id: "run-123",
        tenantId: "tenant-1",
        dataSource: "github",
        script: "repository",
        status: "RUNNING",
        startedAt: exactlyOneHourAgo,
      };

      (mockDb.dataSourceRun.findMany as any).mockResolvedValue([existingRun]);

      const startDate = new Date("2024-01-10T00:00:00Z");
      const endDate = new Date("2024-01-15T00:00:00Z");
      (calculateDateRange as any).mockResolvedValue({ startDate, endDate });

      const mockRunRecord = { id: "run-456" };
      (mockDb.dataSourceRun.upsert as any).mockResolvedValue(mockRunRecord);
      (mockDb.dataSourceRun.update as any).mockResolvedValue({});
      (mockScript.run as any).mockResolvedValue(undefined);

      const env = { GITHUB_TOKEN: "ghp_test123" };

      await executeScript(mockDb, mockScript, "tenant-1", env);

      // Should proceed since it's exactly at the 1-hour threshold
      expect(calculateDateRange).toHaveBeenCalled();
      expect(mockScript.run).toHaveBeenCalled();
    });

    it("should query correct tenant, data source, and script parameters", async () => {
      (mockDb.dataSourceRun.findMany as any).mockResolvedValue([]);

      const customScript: DataSourceScript = {
        name: "gitlab-issues",
        dataSource: "gitlab",
        scriptName: "issues",
        resources: ["issue"],
        dependencies: ["repository"],
        importWindowDuration: 7 * 24 * 60 * 60 * 1000,
        run: vi.fn(),
      };

      const startDate = new Date("2024-01-10T00:00:00Z");
      const endDate = new Date("2024-01-15T00:00:00Z");
      (calculateDateRange as any).mockResolvedValue({ startDate, endDate });

      const mockRunRecord = { id: "run-456" };
      (mockDb.dataSourceRun.upsert as any).mockResolvedValue(mockRunRecord);
      (mockDb.dataSourceRun.update as any).mockResolvedValue({});
      (customScript.run as any).mockResolvedValue(undefined);

      const env = { GITLAB_TOKEN: "glpat_test456" };

      await executeScript(mockDb, customScript, "custom-tenant", env);

      // Verify correct parameters were used in database queries
      expect(mockDb.dataSourceRun.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: "custom-tenant",
          dataSource: "gitlab",
          script: "issues",
        },
        take: 1,
      });

      expect(calculateDateRange).toHaveBeenCalledWith(mockDb, "custom-tenant", "gitlab", "issues", 7 * 24 * 60 * 60 * 1000);

      expect(customScript.run).toHaveBeenCalledWith(env, mockDb, "custom-tenant", startDate, endDate);
    });
  });
});

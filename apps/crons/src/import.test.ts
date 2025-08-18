import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock fast-glob
vi.mock("fast-glob", () => ({
  default: vi.fn(),
}));

// Mock p-graph
vi.mock("p-graph", () => ({
  default: vi.fn(),
}));

// Mock database - define the mock inline to avoid initialization issues
vi.mock("@mmtm/database", () => {
  const mockPrisma = {
    tenantDataSourceConfig: {
      findMany: vi.fn(),
    },
    dataSourceRun: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
    $disconnect: vi.fn(),
    $queryRaw: vi.fn(),
  };

  return {
    prisma: mockPrisma,
    Prisma: {
      sql: vi.fn((strings: TemplateStringsArray, ...values: any[]) => ({
        strings,
        text: strings.join("?"),
        values: values,
      })),
    },
  };
});

import { runImport } from "./import";
import fg from "fast-glob";
import pGraph from "p-graph";
import { prisma } from "@mmtm/database";

// Get the mocked prisma for use in tests
const mockPrisma = prisma as any;

describe("import", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("runImport", () => {
    it("should discover tenant configurations and execute matching data sources", async () => {
      // Mock tenant configurations
      (mockPrisma.tenantDataSourceConfig.findMany as any).mockResolvedValue([
        {
          id: "1",
          tenantId: "tenant-1",
          dataSource: "github",
          key: "GITHUB_TOKEN",
          value: "ghp_test123",
          tenant: { id: "tenant-1", name: "Test Tenant 1" },
        },
        {
          id: "2",
          tenantId: "tenant-1",
          dataSource: "github",
          key: "GITHUB_ORG",
          value: "test-org",
          tenant: { id: "tenant-1", name: "Test Tenant 1" },
        },
        {
          id: "3",
          tenantId: "tenant-2",
          dataSource: "gitlab",
          key: "GITLAB_TOKEN",
          value: "glpat_test456",
          tenant: { id: "tenant-2", name: "Test Tenant 2" },
        },
      ]);

      // Mock file discovery - only github and gitlab plugins exist
      (fg as any).mockImplementation(async (patterns: string[]) => {
        const pattern = patterns[0];
        if (pattern.includes("github")) {
          return ["/libs/plugins/data-sources/github/repository.ts"];
        }
        if (pattern.includes("gitlab")) {
          return ["/libs/plugins/data-sources/gitlab/repository.ts"];
        }
        return [];
      });

      // Mock data source modules with all required exports
      const mockGithubRun = vi.fn().mockResolvedValue(undefined);
      vi.doMock("/libs/plugins/data-sources/github/repository.ts", () => ({
        resources: ["repository"],
        dependencies: [],
        importWindowDuration: 86400 * 1000,
        run: mockGithubRun,
      }));

      const mockGitlabRun = vi.fn().mockResolvedValue(undefined);
      vi.doMock("/libs/plugins/data-sources/gitlab/repository.ts", () => ({
        resources: ["repository"],
        dependencies: [],
        importWindowDuration: 86400 * 1000,
        run: mockGitlabRun,
      }));

      // Mock DataSourceRun operations
      (mockPrisma.dataSourceRun.findFirst as any).mockResolvedValue(null); // No previous runs
      (mockPrisma.dataSourceRun.findMany as any).mockResolvedValue([]);
      (mockPrisma.dataSourceRun.upsert as any).mockResolvedValue({ id: "run-1" });
      (mockPrisma.dataSourceRun.update as any).mockResolvedValue({});

      // Mock p-graph execution
      const mockGraphRun = vi.fn().mockImplementation(async () => {
        // Simulate executing the scripts
        const nodeMap = (pGraph as any).mock.calls[0][0];
        const nodeMap2 = (pGraph as any).mock.calls[1]?.[0];

        // Execute for tenant-1 (github)
        if (nodeMap) {
          const githubNode = nodeMap.get("github-repository");
          if (githubNode) await githubNode.run();
        }

        // Execute for tenant-2 (gitlab)
        if (nodeMap2) {
          const gitlabNode = nodeMap2.get("gitlab-repository");
          if (gitlabNode) await gitlabNode.run();
        }
      });
      (pGraph as any).mockReturnValue({ run: mockGraphRun });

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await runImport();

      // Verify configuration was queried
      expect(mockPrisma.tenantDataSourceConfig.findMany).toHaveBeenCalledWith({
        include: { tenant: true },
      });

      // Verify scripts were loaded for configured data sources
      expect(fg).toHaveBeenCalledWith(expect.arrayContaining([expect.stringContaining("github/*.ts")]), expect.any(Object));
      expect(fg).toHaveBeenCalledWith(expect.arrayContaining([expect.stringContaining("gitlab/*.ts")]), expect.any(Object));

      // Verify p-graph was called for both tenants
      expect(pGraph).toHaveBeenCalledTimes(2);

      // Verify completion message
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Data source import completed"));

      consoleSpy.mockRestore();
    });

    it("should handle no tenant configurations gracefully", async () => {
      (mockPrisma.tenantDataSourceConfig.findMany as any).mockResolvedValue([]);

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await runImport();

      expect(consoleSpy).toHaveBeenCalledWith("No tenant data source configurations found");
      expect(fg).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should handle missing data source plugins", async () => {
      // Mock tenant configuration for a non-existent plugin
      (mockPrisma.tenantDataSourceConfig.findMany as any).mockResolvedValue([
        {
          id: "1",
          tenantId: "tenant-1",
          dataSource: "nonexistent",
          key: "API_KEY",
          value: "test",
          tenant: { id: "tenant-1", name: "Test Tenant" },
        },
      ]);

      // Mock file discovery - no plugins found
      (fg as any).mockResolvedValue([]);

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await runImport();

      expect(consoleSpy).toHaveBeenCalledWith("No data source scripts found");

      consoleSpy.mockRestore();
    });

    it("should respect incremental collection with lastFetchedDataDate", async () => {
      // Mock tenant configuration
      (mockPrisma.tenantDataSourceConfig.findMany as any).mockResolvedValue([
        {
          id: "1",
          tenantId: "tenant-1",
          dataSource: "github",
          key: "GITHUB_TOKEN",
          value: "ghp_test",
          tenant: { id: "tenant-1", name: "Test Tenant" },
        },
      ]);

      // Mock file discovery
      (fg as any).mockResolvedValue(["/libs/plugins/data-sources/github/repository.ts"]);

      // Mock data source module with all exports
      const mockRun = vi.fn().mockResolvedValue(undefined);
      vi.doMock("/libs/plugins/data-sources/github/repository.ts", () => ({
        resources: ["repository"],
        dependencies: [],
        importWindowDuration: 7 * 24 * 60 * 60 * 1000, // 7 days
        run: mockRun,
      }));

      // Mock previous successful run
      const lastFetchedDate = new Date("2024-01-15");
      (mockPrisma.dataSourceRun.findFirst as any).mockResolvedValue({
        id: "previous-run",
        status: "COMPLETED",
        lastFetchedDataDate: lastFetchedDate,
      });

      (mockPrisma.dataSourceRun.findMany as any).mockResolvedValue([]);
      (mockPrisma.dataSourceRun.upsert as any).mockResolvedValue({ id: "new-run" });
      (mockPrisma.dataSourceRun.update as any).mockResolvedValue({});

      // Mock p-graph execution
      const mockGraphRun = vi.fn().mockImplementation(async () => {
        const nodeMap = (pGraph as any).mock.calls[0][0];
        const node = nodeMap.get("github-repository");
        if (node) await node.run();
      });
      (pGraph as any).mockReturnValue({ run: mockGraphRun });

      await runImport();

      // Verify the run function was called with correct parameters
      expect(mockRun).toHaveBeenCalledWith(
        expect.objectContaining({ GITHUB_TOKEN: "ghp_test" }), // env
        mockPrisma, // db
        "tenant-1", // tenantId
        expect.any(Date), // startDate (will be constrained by 7-day window)
        expect.any(Date), // endDate should be current time
      );

      // Verify that it was called with a date range that respects the 7-day window
      const callArgs = mockRun.mock.calls[0];
      const startDate = callArgs[3];
      const endDate = callArgs[4];
      const windowSize = endDate.getTime() - startDate.getTime();
      const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;

      // Should be approximately 7 days (the import window duration)
      expect(windowSize).toBeLessThanOrEqual(sevenDaysInMs);
    });

    it("should handle data source failures gracefully", async () => {
      // Mock tenant configuration
      (mockPrisma.tenantDataSourceConfig.findMany as any).mockResolvedValue([
        {
          id: "1",
          tenantId: "tenant-1",
          dataSource: "github",
          key: "GITHUB_TOKEN",
          value: "ghp_test",
          tenant: { id: "tenant-1", name: "Test Tenant" },
        },
      ]);

      // Mock file discovery
      (fg as any).mockResolvedValue(["/libs/plugins/data-sources/github/repository.ts"]);

      // Mock data source module that fails
      const mockRun = vi.fn().mockRejectedValue(new Error("GitHub API error"));
      vi.doMock("/libs/plugins/data-sources/github/repository.ts", () => ({
        resources: ["repository"],
        dependencies: [],
        importWindowDuration: 86400 * 1000,
        run: mockRun,
      }));

      (mockPrisma.dataSourceRun.findFirst as any).mockResolvedValue(null);
      (mockPrisma.dataSourceRun.findMany as any).mockResolvedValue([]);
      (mockPrisma.dataSourceRun.upsert as any).mockResolvedValue({ id: "run-1" });
      (mockPrisma.dataSourceRun.update as any).mockResolvedValue({});

      // Mock p-graph execution
      const mockGraphRun = vi.fn().mockImplementation(async () => {
        const nodeMap = (pGraph as any).mock.calls[0][0];
        const node = nodeMap.get("github-repository");
        if (node) await node.run();
      });
      (pGraph as any).mockReturnValue({ run: mockGraphRun });

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await runImport();

      // Verify error was logged
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Failed to execute scripts for tenant tenant-1"), expect.any(Error));

      // Verify failure was recorded in database
      expect(mockPrisma.dataSourceRun.update).toHaveBeenCalledWith({
        where: { id: "run-1" },
        data: {
          status: "FAILED",
          completedAt: expect.any(Date),
          error: "GitHub API error",
        },
      });

      consoleSpy.mockRestore();
    });

    it("should execute data sources with correct dependencies", async () => {
      // Mock tenant configuration
      (mockPrisma.tenantDataSourceConfig.findMany as any).mockResolvedValue([
        {
          id: "1",
          tenantId: "tenant-1",
          dataSource: "github",
          key: "GITHUB_TOKEN",
          value: "ghp_test",
          tenant: { id: "tenant-1", name: "Test Tenant" },
        },
      ]);

      // Mock file discovery - multiple scripts with dependencies
      (fg as any).mockResolvedValue(["/libs/plugins/data-sources/github/repository.ts", "/libs/plugins/data-sources/github/commits.ts"]);

      // Mock data source modules with all exports
      const mockRepoRun = vi.fn().mockResolvedValue(undefined);
      vi.doMock("/libs/plugins/data-sources/github/repository.ts", () => ({
        resources: ["repository"],
        dependencies: [],
        importWindowDuration: 86400 * 1000,
        run: mockRepoRun,
      }));

      const mockCommitRun = vi.fn().mockResolvedValue(undefined);
      vi.doMock("/libs/plugins/data-sources/github/commits.ts", () => ({
        resources: ["commit"],
        dependencies: ["repository"], // Depends on repository
        importWindowDuration: 86400 * 1000,
        run: mockCommitRun,
      }));

      (mockPrisma.dataSourceRun.findFirst as any).mockResolvedValue(null);
      (mockPrisma.dataSourceRun.findMany as any).mockResolvedValue([]);
      (mockPrisma.dataSourceRun.upsert as any).mockResolvedValue({ id: "run-1" });
      (mockPrisma.dataSourceRun.update as any).mockResolvedValue({});

      // Mock p-graph - capture the dependency array
      let capturedDependencies: any[] = [];
      (pGraph as any).mockImplementation((_nodeMap: any, dependencies: any[]) => {
        capturedDependencies = dependencies;
        return { run: vi.fn().mockResolvedValue(undefined) };
      });

      await runImport();

      // Verify p-graph was called with correct dependencies
      expect(pGraph).toHaveBeenCalled();
      expect(capturedDependencies).toContainEqual(["github-repository", "github-commits"]);
    });

    it("should skip already running scripts", async () => {
      // Mock tenant configuration
      (mockPrisma.tenantDataSourceConfig.findMany as any).mockResolvedValue([
        {
          id: "1",
          tenantId: "tenant-1",
          dataSource: "github",
          key: "GITHUB_TOKEN",
          value: "ghp_test",
          tenant: { id: "tenant-1", name: "Test Tenant" },
        },
      ]);

      // Mock file discovery
      (fg as any).mockResolvedValue(["/libs/plugins/data-sources/github/repository.ts"]);

      // Mock data source module with all exports
      const mockRun = vi.fn().mockResolvedValue(undefined);
      vi.doMock("/libs/plugins/data-sources/github/repository.ts", () => ({
        resources: ["repository"],
        dependencies: [],
        importWindowDuration: 86400 * 1000,
        run: mockRun,
      }));

      // Mock an existing RUNNING status
      (mockPrisma.dataSourceRun.findFirst as any).mockResolvedValue(null);
      (mockPrisma.dataSourceRun.findMany as any).mockResolvedValue([
        {
          id: "existing-run",
          status: "RUNNING",
          startedAt: new Date(Date.now() - 5 * 60 * 1000), // Started 5 minutes ago
        },
      ]);

      // Mock p-graph execution
      const mockGraphRun = vi.fn().mockImplementation(async () => {
        const nodeMap = (pGraph as any).mock.calls[0][0];
        const node = nodeMap.get("github-repository");
        if (node) await node.run();
      });
      (pGraph as any).mockReturnValue({ run: mockGraphRun });

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await runImport();

      // Verify the script was skipped
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("is already running for tenant tenant-1, skipping"));

      // Verify run function was not called
      expect(mockRun).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock fast-glob
vi.mock("fast-glob", () => ({
  default: vi.fn(),
}));

// Mock p-graph
vi.mock("p-graph", () => ({
  default: vi.fn(),
}));

// Mock the new modular functions
vi.mock("./lib/config/tenant-config", () => ({
  getTenantConfigurations: vi.fn(),
}));

vi.mock("./lib/dependencies/loader", () => ({
  loadDataSourceScripts: vi.fn(),
}));

vi.mock("./lib/execution/tenant-executor", () => ({
  executeForTenant: vi.fn(),
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
import { prisma } from "@mmtm/database";
import { getTenantConfigurations } from "./lib/config/tenant-config";
import { loadDataSourceScripts } from "./lib/dependencies/loader";
import { executeForTenant } from "./lib/execution/tenant-executor";

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
      (getTenantConfigurations as any).mockResolvedValue([
        {
          tenantId: "tenant-1",
          dataSource: "github",
          env: { GITHUB_TOKEN: "ghp_test123", GITHUB_ORG: "test-org" },
        },
        {
          tenantId: "tenant-2",
          dataSource: "gitlab",
          env: { GITLAB_TOKEN: "glpat_test456" },
        },
      ]);

      // Mock script loading
      (loadDataSourceScripts as any).mockResolvedValue([
        {
          name: "github-repository",
          dataSource: "github",
          scriptName: "repository",
          resources: ["repository"],
          dependencies: [],
          importWindowDuration: 86400 * 1000,
          run: vi.fn(),
        },
        {
          name: "gitlab-repository",
          dataSource: "gitlab",
          scriptName: "repository",
          resources: ["repository"],
          dependencies: [],
          importWindowDuration: 86400 * 1000,
          run: vi.fn(),
        },
      ]);

      // Mock tenant execution
      (executeForTenant as any).mockResolvedValue(undefined);

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await runImport();

      // Verify functions were called
      expect(getTenantConfigurations).toHaveBeenCalledWith(mockPrisma);
      expect(loadDataSourceScripts).toHaveBeenCalledWith(new Set(["github", "gitlab"]));
      expect(executeForTenant).toHaveBeenCalledTimes(2);

      // Verify completion message
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Data source import completed"));

      consoleSpy.mockRestore();
    });

    it("should handle no tenant configurations gracefully", async () => {
      (getTenantConfigurations as any).mockResolvedValue([]);

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await runImport();

      expect(consoleSpy).toHaveBeenCalledWith("No tenant data source configurations found");
      expect(loadDataSourceScripts).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should handle missing data source plugins", async () => {
      // Mock tenant configuration for a non-existent plugin
      (getTenantConfigurations as any).mockResolvedValue([
        {
          tenantId: "tenant-1",
          dataSource: "nonexistent",
          env: { API_KEY: "test" },
        },
      ]);

      // Mock no scripts found
      (loadDataSourceScripts as any).mockResolvedValue([]);

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await runImport();

      expect(consoleSpy).toHaveBeenCalledWith("No data source scripts found");

      consoleSpy.mockRestore();
    });

    it("should handle execution failures gracefully", async () => {
      (getTenantConfigurations as any).mockResolvedValue([
        {
          tenantId: "tenant-1",
          dataSource: "github",
          env: { GITHUB_TOKEN: "ghp_test" },
        },
      ]);

      (loadDataSourceScripts as any).mockResolvedValue([
        {
          name: "github-repository",
          dataSource: "github",
          scriptName: "repository",
          resources: ["repository"],
          dependencies: [],
          importWindowDuration: 86400 * 1000,
          run: vi.fn(),
        },
      ]);

      // Mock execution failure
      (executeForTenant as any).mockRejectedValue(new Error("Execution failed"));

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await runImport();

      // Should still complete the import process despite errors
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Failed to execute scripts for tenant tenant-1"), expect.any(Error));

      consoleSpy.mockRestore();
    });
  });
});

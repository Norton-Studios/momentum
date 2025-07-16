import { describe, it, expect, vi, beforeEach } from "vitest";
import { loadDataSources, buildDependencyGraph, executeDataSources, runImport } from "./import";

// Mock fast-glob
vi.mock("fast-glob", () => ({
  default: vi.fn(),
}));

// Mock p-graph
vi.mock("p-graph", () => ({
  default: vi.fn(),
}));

// Mock database
vi.mock("@mmtm/database", () => ({
  prisma: {
    dataSourceRun: {
      create: vi.fn(),
      update: vi.fn(),
    },
    $disconnect: vi.fn(),
  },
}));

import fg from "fast-glob";
import pGraph from "p-graph";
import { prisma } from "@mmtm/database";

describe("import", () => {
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock database - prisma is already mocked in vi.mock above
    mockDb = prisma;
  });

  describe("loadDataSources", () => {
    it("should discover and load data sources from plugins", async () => {
      // Mock file system
      (fg as any).mockResolvedValue(["/plugins/data-sources/github/repository.ts", "/plugins/data-sources/gitlab/issues.ts"]);

      // Mock dynamic imports
      vi.doMock("/plugins/data-sources/github/repository.ts", () => ({
        resources: ["repository"],
        dependencies: [],
        run: vi.fn(),
      }));

      vi.doMock("/plugins/data-sources/gitlab/issues.ts", () => ({
        resources: ["issue"],
        dependencies: ["repository"],
        run: vi.fn(),
      }));

      const dataSources = await loadDataSources();

      expect(fg).toHaveBeenCalledWith(
        ["../../plugins/data-sources/*/index.ts", "../../plugins/data-sources/*/*.ts"],
        expect.objectContaining({ absolute: true }),
      );

      expect(dataSources).toHaveLength(2);
      expect(dataSources[0].name).toBe("github-repository");
      expect(dataSources[0].resources).toEqual(["repository"]);
      expect(dataSources[0].dependencies).toEqual([]);

      expect(dataSources[1].name).toBe("gitlab-issues");
      expect(dataSources[1].resources).toEqual(["issue"]);
      expect(dataSources[1].dependencies).toEqual(["repository"]);
    });

    it("should handle modules without required exports", async () => {
      (fg as any).mockResolvedValue(["/plugins/data-sources/invalid/test.ts"]);

      // Mock invalid module - has undefined resources and run
      vi.doMock("/plugins/data-sources/invalid/test.ts", () => ({
        resources: undefined,
        run: undefined,
        someOtherExport: "value",
      }));

      const dataSources = await loadDataSources();
      expect(dataSources).toHaveLength(0);
    });

    it("should handle import errors gracefully", async () => {
      (fg as any).mockResolvedValue(["/plugins/data-sources/broken/test.ts"]);

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Mock import that throws
      vi.doMock("/plugins/data-sources/broken/test.ts", () => {
        throw new Error("Import failed");
      });

      const dataSources = await loadDataSources();

      expect(dataSources).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Error loading data source"), expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe("buildDependencyGraph", () => {
    it("should build correct dependency relationships", () => {
      const dataSources = [
        {
          name: "repository",
          resources: ["repository"],
          dependencies: [],
          run: vi.fn(),
        },
        {
          name: "commits",
          resources: ["commit"],
          dependencies: ["repository"],
          run: vi.fn(),
        },
        {
          name: "pull-requests",
          resources: ["pull_request"],
          dependencies: ["repository", "commit"],
          run: vi.fn(),
        },
      ];

      const graph = buildDependencyGraph(dataSources);

      expect(graph.get("repository")).toEqual([]);
      expect(graph.get("commits")).toEqual(["repository"]);
      expect(graph.get("pull-requests")).toEqual(["repository", "commits"]);
    });

    it("should handle circular dependencies gracefully", () => {
      const dataSources = [
        {
          name: "a",
          resources: ["resource_a"],
          dependencies: ["resource_b"],
          run: vi.fn(),
        },
        {
          name: "b",
          resources: ["resource_b"],
          dependencies: ["resource_a"],
          run: vi.fn(),
        },
      ];

      const graph = buildDependencyGraph(dataSources);

      expect(graph.get("a")).toEqual(["b"]);
      expect(graph.get("b")).toEqual(["a"]);
    });

    it("should handle missing dependencies", () => {
      const dataSources = [
        {
          name: "dependent",
          resources: ["resource"],
          dependencies: ["non-existent"],
          run: vi.fn(),
        },
      ];

      const graph = buildDependencyGraph(dataSources);
      expect(graph.get("dependent")).toEqual([]);
    });
  });

  describe("executeDataSources", () => {
    it("should execute data sources in dependency order", async () => {
      const mockRun1 = vi.fn().mockResolvedValue(undefined);
      const mockRun2 = vi.fn().mockResolvedValue(undefined);

      const dataSources = [
        {
          name: "repository",
          resources: ["repository"],
          dependencies: [],
          run: mockRun1,
        },
        {
          name: "commits",
          resources: ["commit"],
          dependencies: ["repository"],
          run: mockRun2,
        },
      ];

      // Mock database operations
      mockDb.dataSourceRun.create.mockResolvedValue({ id: "run-id" });
      mockDb.dataSourceRun.update.mockResolvedValue({});

      // Mock p-graph
      const mockGraphRun = vi.fn().mockResolvedValue(undefined);
      (pGraph as any).mockReturnValue({ run: mockGraphRun });

      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-01-31");

      await executeDataSources(dataSources, startDate, endDate);

      expect(pGraph).toHaveBeenCalledWith(expect.any(Map), [["repository", "commits"]]);
      expect(mockGraphRun).toHaveBeenCalled();
      expect(mockDb.$disconnect).toHaveBeenCalled();
    });

    it("should record successful runs in database", async () => {
      const mockRun = vi.fn().mockResolvedValue(undefined);
      const dataSources = [
        {
          name: "test-source",
          resources: ["test"],
          dependencies: [],
          run: mockRun,
        },
      ];

      mockDb.dataSourceRun.create.mockResolvedValue({ id: "run-123" });

      const mockGraphRun = vi.fn().mockImplementation(async () => {
        // Simulate p-graph executing the task
        const nodeMap = (pGraph as any).mock.calls[0][0];
        const testNode = nodeMap.get("test-source");
        await testNode.run();
      });
      (pGraph as any).mockReturnValue({ run: mockGraphRun });

      await executeDataSources(dataSources);

      expect(mockDb.dataSourceRun.create).toHaveBeenCalledWith({
        data: {
          dataSource: "test-source",
          status: "RUNNING",
          startedAt: expect.any(Date),
        },
      });

      expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
        where: { id: "run-123" },
        data: {
          status: "COMPLETED",
          completedAt: expect.any(Date),
          lastFetchedDataDate: expect.any(Date),
        },
      });

      expect(mockRun).toHaveBeenCalledWith(mockDb, undefined, undefined);
    });

    it("should record failed runs in database", async () => {
      const mockRun = vi.fn().mockRejectedValue(new Error("Data source failed"));
      const dataSources = [
        {
          name: "failing-source",
          resources: ["test"],
          dependencies: [],
          run: mockRun,
        },
      ];

      mockDb.dataSourceRun.create.mockResolvedValue({ id: "run-456" });

      const mockGraphRun = vi.fn().mockImplementation(async () => {
        const nodeMap = (pGraph as any).mock.calls[0][0];
        const failingNode = nodeMap.get("failing-source");
        await failingNode.run();
      });
      (pGraph as any).mockReturnValue({ run: mockGraphRun });

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await expect(executeDataSources(dataSources)).rejects.toThrow("Data source failed");

      expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
        where: { id: "run-456" },
        data: {
          status: "FAILED",
          completedAt: expect.any(Date),
          error: "Data source failed",
        },
      });

      consoleSpy.mockRestore();
    });

    it("should pass date range to data source run function", async () => {
      const mockRun = vi.fn().mockResolvedValue(undefined);
      const dataSources = [
        {
          name: "date-aware-source",
          resources: ["test"],
          dependencies: [],
          run: mockRun,
        },
      ];

      mockDb.dataSourceRun.create.mockResolvedValue({ id: "run-789" });

      const mockGraphRun = vi.fn().mockImplementation(async () => {
        const nodeMap = (pGraph as any).mock.calls[0][0];
        const testNode = nodeMap.get("date-aware-source");
        await testNode.run();
      });
      (pGraph as any).mockReturnValue({ run: mockGraphRun });

      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-01-31");

      await executeDataSources(dataSources, startDate, endDate);

      expect(mockRun).toHaveBeenCalledWith(mockDb, startDate, endDate);
    });
  });

  describe("runImport", () => {
    it("should load and execute data sources", async () => {
      // Mock file system to return test sources
      (fg as any).mockResolvedValue(["/plugins/data-sources/test/source.ts"]);

      // Mock the test data source
      vi.doMock("/plugins/data-sources/test/source.ts", () => ({
        resources: ["test"],
        dependencies: [],
        run: vi.fn(),
      }));

      mockDb.dataSourceRun.create.mockResolvedValue({ id: "test-run" });

      const mockGraphRun = vi.fn().mockImplementation(async () => {
        const nodeMap = (pGraph as any).mock.calls[0][0];
        const testNode = nodeMap.get("test-source");
        await testNode.run();
      });
      (pGraph as any).mockReturnValue({ run: mockGraphRun });

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await runImport();

      expect(consoleSpy).toHaveBeenCalledWith("Starting data source import...");
      expect(consoleSpy).toHaveBeenCalledWith("Found 1 data sources");

      consoleSpy.mockRestore();
    });

    it("should handle no data sources found", async () => {
      (fg as any).mockResolvedValue([]);

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await runImport();

      expect(consoleSpy).toHaveBeenCalledWith("No data sources found");

      consoleSpy.mockRestore();
    });

    it("should log date range when provided", async () => {
      (fg as any).mockResolvedValue([]);

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-01-31");

      await runImport(startDate, endDate);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Import range: 2024-01-01T00:00:00.000Z to 2024-01-31T00:00:00.000Z"));

      consoleSpy.mockRestore();
    });
  });
});

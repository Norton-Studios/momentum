import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { executeForTenant } from "./tenant-executor";
import type { PrismaClient } from "@mmtm/database";
import type { DataSourceScript } from "../dependencies/loader";

// Mock dependencies
vi.mock("../dependencies/dependency-graph", () => ({
  buildDependencyGraph: vi.fn(),
}));

vi.mock("./script-executor", () => ({
  executeScript: vi.fn(),
}));

vi.mock("p-graph", () => ({
  default: vi.fn(),
}));

import { buildDependencyGraph } from "../dependencies/dependency-graph";
import { executeScript } from "./script-executor";
import pGraph from "p-graph";

// Mock PrismaClient
const mockDb = {} as unknown as PrismaClient;

describe("tenant-executor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("executeForTenant", () => {
    it("should handle empty scripts array", async () => {
      const scripts: DataSourceScript[] = [];
      const env = { GITHUB_TOKEN: "ghp_test123" };

      await executeForTenant(mockDb, "tenant-1", scripts, env);

      expect(console.log).toHaveBeenCalledWith("No scripts to execute for tenant tenant-1");
      expect(buildDependencyGraph).not.toHaveBeenCalled();
      expect(pGraph).not.toHaveBeenCalled();
    });

    it("should execute single script without dependencies", async () => {
      const mockScript: DataSourceScript = {
        name: "github-repository",
        dataSource: "github",
        scriptName: "repository",
        resources: ["repository"],
        dependencies: [],
        importWindowDuration: 86400 * 1000,
        run: vi.fn(),
      };

      const scripts = [mockScript];
      const env = { GITHUB_TOKEN: "ghp_test123" };

      // Mock dependency graph
      const mockDependencyGraph = new Map([["github-repository", []]]);
      (buildDependencyGraph as any).mockReturnValue(mockDependencyGraph);

      // Mock p-graph
      const mockPGraphInstance = {
        run: vi.fn().mockResolvedValue(undefined),
      };
      (pGraph as any).mockReturnValue(mockPGraphInstance);

      await executeForTenant(mockDb, "tenant-1", scripts, env);

      expect(buildDependencyGraph).toHaveBeenCalledWith(scripts);
      expect(console.log).toHaveBeenCalledWith("Executing 1 scripts for tenant tenant-1");
      expect(console.log).toHaveBeenCalledWith("Dependency graph:", { "github-repository": [] });

      // Verify p-graph setup
      expect(pGraph).toHaveBeenCalledWith(
        expect.any(Map), // nodeMap
        [], // dependencies array (empty for no dependencies)
      );

      expect(mockPGraphInstance.run).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith("All scripts executed successfully for tenant tenant-1");
    });

    it("should execute multiple scripts with dependencies in correct order", async () => {
      const repositoryScript: DataSourceScript = {
        name: "github-repository",
        dataSource: "github",
        scriptName: "repository",
        resources: ["repository"],
        dependencies: [],
        importWindowDuration: 86400 * 1000,
        run: vi.fn(),
      };

      const commitsScript: DataSourceScript = {
        name: "github-commits",
        dataSource: "github",
        scriptName: "commits",
        resources: ["commit"],
        dependencies: ["repository"],
        importWindowDuration: 86400 * 1000,
        run: vi.fn(),
      };

      const scripts = [repositoryScript, commitsScript];
      const env = { GITHUB_TOKEN: "ghp_test123" };

      // Mock dependency graph - commits depends on repository
      const mockDependencyGraph = new Map([
        ["github-repository", []], // No dependencies
        ["github-commits", ["github-repository"]], // Depends on repository
      ]);
      (buildDependencyGraph as any).mockReturnValue(mockDependencyGraph);

      // Mock p-graph
      const mockPGraphInstance = {
        run: vi.fn().mockResolvedValue(undefined),
      };
      (pGraph as any).mockReturnValue(mockPGraphInstance);

      await executeForTenant(mockDb, "tenant-1", scripts, env);

      expect(buildDependencyGraph).toHaveBeenCalledWith(scripts);
      expect(console.log).toHaveBeenCalledWith("Executing 2 scripts for tenant tenant-1");

      // Verify p-graph was called with correct dependencies
      expect(pGraph).toHaveBeenCalledWith(
        expect.any(Map), // nodeMap
        [["github-repository", "github-commits"]], // dependency array
      );

      expect(mockPGraphInstance.run).toHaveBeenCalled();
    });

    it("should create correct node map with script execution functions", async () => {
      const mockScript: DataSourceScript = {
        name: "github-repository",
        dataSource: "github",
        scriptName: "repository",
        resources: ["repository"],
        dependencies: [],
        importWindowDuration: 86400 * 1000,
        run: vi.fn(),
      };

      const scripts = [mockScript];
      const env = { GITHUB_TOKEN: "ghp_test123" };

      const mockDependencyGraph = new Map([["github-repository", []]]);
      (buildDependencyGraph as any).mockReturnValue(mockDependencyGraph);

      let capturedNodeMap: Map<string, any>;
      (pGraph as any).mockImplementation((nodeMap, _dependencies) => {
        capturedNodeMap = nodeMap;
        return { run: vi.fn().mockResolvedValue(undefined) };
      });

      await executeForTenant(mockDb, "tenant-1", scripts, env);

      // Verify node map structure
      expect(capturedNodeMap!.size).toBe(1);
      expect(capturedNodeMap!.has("github-repository")).toBe(true);

      const node = capturedNodeMap!.get("github-repository");
      expect(node).toHaveProperty("run");
      expect(typeof node.run).toBe("function");

      // Execute the node function to verify it calls executeScript
      await node.run();
      expect(executeScript).toHaveBeenCalledWith(mockDb, mockScript, "tenant-1", env);
    });

    it("should handle complex dependency chains", async () => {
      const baseScript: DataSourceScript = {
        name: "base-data",
        dataSource: "system",
        scriptName: "base",
        resources: ["base"],
        dependencies: [],
        importWindowDuration: 86400 * 1000,
        run: vi.fn(),
      };

      const level1Script: DataSourceScript = {
        name: "level-1",
        dataSource: "system",
        scriptName: "level1",
        resources: ["level1"],
        dependencies: ["base"],
        importWindowDuration: 86400 * 1000,
        run: vi.fn(),
      };

      const level2Script: DataSourceScript = {
        name: "level-2",
        dataSource: "system",
        scriptName: "level2",
        resources: ["level2"],
        dependencies: ["level1"],
        importWindowDuration: 86400 * 1000,
        run: vi.fn(),
      };

      const scripts = [baseScript, level1Script, level2Script];
      const env = { API_KEY: "test123" };

      // Mock dependency graph
      const mockDependencyGraph = new Map([
        ["base-data", []],
        ["level-1", ["base-data"]],
        ["level-2", ["level-1"]],
      ]);
      (buildDependencyGraph as any).mockReturnValue(mockDependencyGraph);

      const mockPGraphInstance = {
        run: vi.fn().mockResolvedValue(undefined),
      };
      (pGraph as any).mockReturnValue(mockPGraphInstance);

      await executeForTenant(mockDb, "tenant-1", scripts, env);

      // Verify p-graph was called with correct dependency chain
      expect(pGraph).toHaveBeenCalledWith(expect.any(Map), [
        ["base-data", "level-1"], // base-data must complete before level-1
        ["level-1", "level-2"], // level-1 must complete before level-2
      ]);
    });

    it("should handle scripts with multiple dependencies", async () => {
      const repo1Script: DataSourceScript = {
        name: "repo-1",
        dataSource: "github",
        scriptName: "repo1",
        resources: ["repo1"],
        dependencies: [],
        importWindowDuration: 86400 * 1000,
        run: vi.fn(),
      };

      const repo2Script: DataSourceScript = {
        name: "repo-2",
        dataSource: "gitlab",
        scriptName: "repo2",
        resources: ["repo2"],
        dependencies: [],
        importWindowDuration: 86400 * 1000,
        run: vi.fn(),
      };

      const mergedScript: DataSourceScript = {
        name: "merged-data",
        dataSource: "system",
        scriptName: "merged",
        resources: ["merged"],
        dependencies: ["repo1", "repo2"], // Depends on both
        importWindowDuration: 86400 * 1000,
        run: vi.fn(),
      };

      const scripts = [repo1Script, repo2Script, mergedScript];
      const env = { API_KEY: "test123" };

      // Mock dependency graph
      const mockDependencyGraph = new Map([
        ["repo-1", []],
        ["repo-2", []],
        ["merged-data", ["repo-1", "repo-2"]],
      ]);
      (buildDependencyGraph as any).mockReturnValue(mockDependencyGraph);

      const mockPGraphInstance = {
        run: vi.fn().mockResolvedValue(undefined),
      };
      (pGraph as any).mockReturnValue(mockPGraphInstance);

      await executeForTenant(mockDb, "tenant-1", scripts, env);

      // Verify p-graph was called with multiple dependencies
      expect(pGraph).toHaveBeenCalledWith(expect.any(Map), [
        ["repo-1", "merged-data"], // repo-1 must complete before merged-data
        ["repo-2", "merged-data"], // repo-2 must complete before merged-data
      ]);
    });

    it("should handle p-graph execution errors", async () => {
      const mockScript: DataSourceScript = {
        name: "github-repository",
        dataSource: "github",
        scriptName: "repository",
        resources: ["repository"],
        dependencies: [],
        importWindowDuration: 86400 * 1000,
        run: vi.fn(),
      };

      const scripts = [mockScript];
      const env = { GITHUB_TOKEN: "ghp_test123" };

      const mockDependencyGraph = new Map([["github-repository", []]]);
      (buildDependencyGraph as any).mockReturnValue(mockDependencyGraph);

      // Mock p-graph to throw error
      const graphError = new Error("Script execution failed");
      const mockPGraphInstance = {
        run: vi.fn().mockRejectedValue(graphError),
      };
      (pGraph as any).mockReturnValue(mockPGraphInstance);

      await expect(executeForTenant(mockDb, "tenant-1", scripts, env)).rejects.toThrow("Script execution failed");
    });

    it("should handle missing script in script map", async () => {
      const mockScript: DataSourceScript = {
        name: "github-repository",
        dataSource: "github",
        scriptName: "repository",
        resources: ["repository"],
        dependencies: [],
        importWindowDuration: 86400 * 1000,
        run: vi.fn(),
      };

      const scripts = [mockScript];
      const env = { GITHUB_TOKEN: "ghp_test123" };

      // Mock dependency graph with script name that doesn't exist in scripts array
      const mockDependencyGraph = new Map([
        ["github-repository", []],
        ["non-existent-script", []], // This script doesn't exist in scripts array
      ]);
      (buildDependencyGraph as any).mockReturnValue(mockDependencyGraph);

      let capturedNodeMap: Map<string, any>;
      (pGraph as any).mockImplementation((nodeMap, _dependencies) => {
        capturedNodeMap = nodeMap;
        return {
          run: async () => {
            // Simulate p-graph calling the non-existent script
            const node = capturedNodeMap.get("non-existent-script");
            if (node) {
              await node.run();
            }
          },
        };
      });

      await expect(executeForTenant(mockDb, "tenant-1", scripts, env)).rejects.toThrow("Script non-existent-script not found");
    });

    it("should log dependency graph correctly", async () => {
      const scripts: DataSourceScript[] = [
        {
          name: "script-a",
          dataSource: "source-a",
          scriptName: "a",
          resources: ["a"],
          dependencies: [],
          importWindowDuration: 86400 * 1000,
          run: vi.fn(),
        },
        {
          name: "script-b",
          dataSource: "source-b",
          scriptName: "b",
          resources: ["b"],
          dependencies: ["a"],
          importWindowDuration: 86400 * 1000,
          run: vi.fn(),
        },
      ];

      const env = { API_KEY: "test123" };

      const mockDependencyGraph = new Map([
        ["script-a", []],
        ["script-b", ["script-a"]],
      ]);
      (buildDependencyGraph as any).mockReturnValue(mockDependencyGraph);

      const mockPGraphInstance = {
        run: vi.fn().mockResolvedValue(undefined),
      };
      (pGraph as any).mockReturnValue(mockPGraphInstance);

      await executeForTenant(mockDb, "tenant-1", scripts, env);

      expect(console.log).toHaveBeenCalledWith("Dependency graph:", {
        "script-a": [],
        "script-b": ["script-a"],
      });
    });

    it("should handle empty dependencies array correctly", async () => {
      const scripts: DataSourceScript[] = [
        {
          name: "independent-script-1",
          dataSource: "source-1",
          scriptName: "script1",
          resources: ["resource1"],
          dependencies: [],
          importWindowDuration: 86400 * 1000,
          run: vi.fn(),
        },
        {
          name: "independent-script-2",
          dataSource: "source-2",
          scriptName: "script2",
          resources: ["resource2"],
          dependencies: [],
          importWindowDuration: 86400 * 1000,
          run: vi.fn(),
        },
      ];

      const env = { API_KEY: "test123" };

      const mockDependencyGraph = new Map([
        ["independent-script-1", []],
        ["independent-script-2", []],
      ]);
      (buildDependencyGraph as any).mockReturnValue(mockDependencyGraph);

      const mockPGraphInstance = {
        run: vi.fn().mockResolvedValue(undefined),
      };
      (pGraph as any).mockReturnValue(mockPGraphInstance);

      await executeForTenant(mockDb, "tenant-1", scripts, env);

      // Should have no dependencies since all scripts are independent
      expect(pGraph).toHaveBeenCalledWith(expect.any(Map), []);
    });
  });
});

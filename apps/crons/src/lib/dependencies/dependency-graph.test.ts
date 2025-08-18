import { describe, it, expect, vi } from "vitest";
import { buildDependencyGraph } from "./dependency-graph";
import type { DataSourceScript } from "./loader";

describe("dependency-graph", () => {
  describe("buildDependencyGraph", () => {
    it("should create empty graph for empty scripts array", () => {
      const scripts: DataSourceScript[] = [];

      const result = buildDependencyGraph(scripts);

      expect(result.size).toBe(0);
    });

    it("should create graph with no dependencies for single script", () => {
      const scripts: DataSourceScript[] = [
        {
          name: "github-repository",
          dataSource: "github",
          scriptName: "repository",
          resources: ["repository"],
          dependencies: [],
          importWindowDuration: 86400 * 1000,
          run: vi.fn(),
        },
      ];

      const result = buildDependencyGraph(scripts);

      expect(result.size).toBe(1);
      expect(result.get("github-repository")).toEqual([]);
    });

    it("should resolve dependencies by resource name", () => {
      const scripts: DataSourceScript[] = [
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
          name: "github-commits",
          dataSource: "github",
          scriptName: "commits",
          resources: ["commit"],
          dependencies: ["repository"], // Depends on repository resource
          importWindowDuration: 86400 * 1000,
          run: vi.fn(),
        },
      ];

      const result = buildDependencyGraph(scripts);

      expect(result.size).toBe(2);
      expect(result.get("github-repository")).toEqual([]);
      expect(result.get("github-commits")).toEqual(["github-repository"]);
    });

    it("should resolve dependencies by script name", () => {
      const scripts: DataSourceScript[] = [
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
          name: "github-commits",
          dataSource: "github",
          scriptName: "commits",
          resources: ["commit"],
          dependencies: ["github-repository"], // Depends on script name
          importWindowDuration: 86400 * 1000,
          run: vi.fn(),
        },
      ];

      const result = buildDependencyGraph(scripts);

      expect(result.size).toBe(2);
      expect(result.get("github-repository")).toEqual([]);
      expect(result.get("github-commits")).toEqual(["github-repository"]);
    });

    it("should handle multiple dependencies", () => {
      const scripts: DataSourceScript[] = [
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
          name: "github-commits",
          dataSource: "github",
          scriptName: "commits",
          resources: ["commit"],
          dependencies: ["repository"],
          importWindowDuration: 86400 * 1000,
          run: vi.fn(),
        },
        {
          name: "github-pull-requests",
          dataSource: "github",
          scriptName: "pull-requests",
          resources: ["pull_request"],
          dependencies: ["repository", "commit"], // Multiple dependencies
          importWindowDuration: 86400 * 1000,
          run: vi.fn(),
        },
      ];

      const result = buildDependencyGraph(scripts);

      expect(result.size).toBe(3);
      expect(result.get("github-repository")).toEqual([]);
      expect(result.get("github-commits")).toEqual(["github-repository"]);
      expect(result.get("github-pull-requests")).toEqual(["github-repository", "github-commits"]);
    });

    it("should handle complex dependency chains", () => {
      const scripts: DataSourceScript[] = [
        {
          name: "base-data",
          dataSource: "system",
          scriptName: "base",
          resources: ["base"],
          dependencies: [],
          importWindowDuration: 86400 * 1000,
          run: vi.fn(),
        },
        {
          name: "level-1a",
          dataSource: "system",
          scriptName: "level1a",
          resources: ["level1a"],
          dependencies: ["base"],
          importWindowDuration: 86400 * 1000,
          run: vi.fn(),
        },
        {
          name: "level-1b",
          dataSource: "system",
          scriptName: "level1b",
          resources: ["level1b"],
          dependencies: ["base"],
          importWindowDuration: 86400 * 1000,
          run: vi.fn(),
        },
        {
          name: "level-2",
          dataSource: "system",
          scriptName: "level2",
          resources: ["level2"],
          dependencies: ["level1a", "level1b"],
          importWindowDuration: 86400 * 1000,
          run: vi.fn(),
        },
      ];

      const result = buildDependencyGraph(scripts);

      expect(result.size).toBe(4);
      expect(result.get("base-data")).toEqual([]);
      expect(result.get("level-1a")).toEqual(["base-data"]);
      expect(result.get("level-1b")).toEqual(["base-data"]);
      expect(result.get("level-2")).toEqual(["level-1a", "level-1b"]);
    });

    it("should ignore non-existent dependencies", () => {
      const scripts: DataSourceScript[] = [
        {
          name: "github-repository",
          dataSource: "github",
          scriptName: "repository",
          resources: ["repository"],
          dependencies: ["non-existent-resource", "another-missing"],
          importWindowDuration: 86400 * 1000,
          run: vi.fn(),
        },
      ];

      const result = buildDependencyGraph(scripts);

      expect(result.size).toBe(1);
      expect(result.get("github-repository")).toEqual([]);
    });

    it("should handle scripts with same resource names", () => {
      const scripts: DataSourceScript[] = [
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
        {
          name: "github-commits",
          dataSource: "github",
          scriptName: "commits",
          resources: ["commit"],
          dependencies: ["repository"], // Should resolve to first matching script
          importWindowDuration: 86400 * 1000,
          run: vi.fn(),
        },
      ];

      const result = buildDependencyGraph(scripts);

      expect(result.size).toBe(3);
      expect(result.get("github-repository")).toEqual([]);
      expect(result.get("gitlab-repository")).toEqual([]);
      expect(result.get("github-commits")).toEqual(["github-repository"]); // First match
    });

    it("should not create self-dependencies", () => {
      const scripts: DataSourceScript[] = [
        {
          name: "self-referencing",
          dataSource: "test",
          scriptName: "self",
          resources: ["self-resource"],
          dependencies: ["self-resource", "self-referencing"], // Both should be ignored
          importWindowDuration: 86400 * 1000,
          run: vi.fn(),
        },
      ];

      const result = buildDependencyGraph(scripts);

      expect(result.size).toBe(1);
      expect(result.get("self-referencing")).toEqual([]);
    });

    it("should handle mixed resource and script name dependencies", () => {
      const scripts: DataSourceScript[] = [
        {
          name: "github-users",
          dataSource: "github",
          scriptName: "users",
          resources: ["user"],
          dependencies: [],
          importWindowDuration: 86400 * 1000,
          run: vi.fn(),
        },
        {
          name: "github-repository",
          dataSource: "github",
          scriptName: "repository",
          resources: ["repository"],
          dependencies: ["user"], // Dependency by resource
          importWindowDuration: 86400 * 1000,
          run: vi.fn(),
        },
        {
          name: "github-commits",
          dataSource: "github",
          scriptName: "commits",
          resources: ["commit"],
          dependencies: ["github-repository"], // Dependency by script name
          importWindowDuration: 86400 * 1000,
          run: vi.fn(),
        },
      ];

      const result = buildDependencyGraph(scripts);

      expect(result.size).toBe(3);
      expect(result.get("github-users")).toEqual([]);
      expect(result.get("github-repository")).toEqual(["github-users"]);
      expect(result.get("github-commits")).toEqual(["github-repository"]);
    });

    it("should handle empty dependencies array", () => {
      const scripts: DataSourceScript[] = [
        {
          name: "independent-script",
          dataSource: "test",
          scriptName: "independent",
          resources: ["resource"],
          dependencies: [], // Explicitly empty
          importWindowDuration: 86400 * 1000,
          run: vi.fn(),
        },
      ];

      const result = buildDependencyGraph(scripts);

      expect(result.size).toBe(1);
      expect(result.get("independent-script")).toEqual([]);
    });

    it("should handle scripts with multiple resources", () => {
      const scripts: DataSourceScript[] = [
        {
          name: "multi-resource-script",
          dataSource: "system",
          scriptName: "multi",
          resources: ["resource1", "resource2", "resource3"],
          dependencies: [],
          importWindowDuration: 86400 * 1000,
          run: vi.fn(),
        },
        {
          name: "dependent-script",
          dataSource: "system",
          scriptName: "dependent",
          resources: ["dependent_resource"],
          dependencies: ["resource2"], // Depends on one of the multiple resources
          importWindowDuration: 86400 * 1000,
          run: vi.fn(),
        },
      ];

      const result = buildDependencyGraph(scripts);

      expect(result.size).toBe(2);
      expect(result.get("multi-resource-script")).toEqual([]);
      expect(result.get("dependent-script")).toEqual(["multi-resource-script"]);
    });
  });
});

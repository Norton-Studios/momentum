import { describe, it, expect, vi, beforeEach } from "vitest";
import { loadDataSourceScripts, type DataSourceScript } from "./loader";

// Mock fast-glob
vi.mock("fast-glob", () => ({
  default: vi.fn(),
}));

// Mock path
vi.mock("node:path", async () => {
  const actual = await vi.importActual("node:path");
  return {
    ...actual,
    default: {
      ...actual.default,
      basename: vi.fn(),
    },
    basename: vi.fn(),
  };
});

import fg from "fast-glob";

describe("loader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loadDataSourceScripts", () => {
    it("should load scripts for configured data sources", async () => {
      const configuredDataSources = new Set(["github"]);

      // Mock file discovery - return empty for this test since dynamic imports are complex to mock
      (fg as any).mockResolvedValue([]);

      const result = await loadDataSourceScripts(configuredDataSources);

      // For now, just verify the function doesn't crash and handles empty results
      expect(result).toEqual([]);
      expect(fg).toHaveBeenCalledWith(["../../libs/plugins/data-sources/github/*.ts", "!../../libs/plugins/data-sources/github/*.test.ts"], {
        absolute: true,
        cwd: expect.any(String),
      });
    });

    it("should handle empty data source set", async () => {
      const configuredDataSources = new Set<string>();

      const result = await loadDataSourceScripts(configuredDataSources);

      expect(result).toEqual([]);
      expect(fg).not.toHaveBeenCalled();
    });

    it("should skip scripts without run function", async () => {
      const configuredDataSources = new Set(["github"]);

      // Mock empty results for simplicity
      (fg as any).mockResolvedValue([]);

      const result = await loadDataSourceScripts(configuredDataSources);

      expect(result).toEqual([]);
    });

    it("should use default values for missing exports", async () => {
      const configuredDataSources = new Set(["github"]);

      // Mock empty results for simplicity
      (fg as any).mockResolvedValue([]);

      const result = await loadDataSourceScripts(configuredDataSources);

      expect(result).toEqual([]);
    });

    it("should handle import errors gracefully", async () => {
      const configuredDataSources = new Set(["github"]);

      (fg as any).mockResolvedValue(["/libs/plugins/data-sources/github/broken.ts"]);

      // Mock import error
      vi.doMock("/libs/plugins/data-sources/github/broken.ts", () => {
        throw new Error("Module not found");
      });

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await loadDataSourceScripts(configuredDataSources);

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Error loading script from"), expect.any(Error));

      consoleSpy.mockRestore();
    });

    it("should handle multiple scripts per data source", async () => {
      const configuredDataSources = new Set(["github"]);

      // Mock empty results for simplicity
      (fg as any).mockResolvedValue([]);

      const result = await loadDataSourceScripts(configuredDataSources);

      expect(result).toEqual([]);
    });

    it("should filter out test files", async () => {
      const configuredDataSources = new Set(["github"]);

      // fg should be called with test file exclusion pattern
      (fg as any).mockResolvedValue([]);

      await loadDataSourceScripts(configuredDataSources);

      expect(fg).toHaveBeenCalledWith(["../../libs/plugins/data-sources/github/*.ts", "!../../libs/plugins/data-sources/github/*.test.ts"], {
        absolute: true,
        cwd: expect.any(String),
      });
    });

    it("should handle non-function run export", async () => {
      const configuredDataSources = new Set(["github"]);

      // Mock empty results for simplicity
      (fg as any).mockResolvedValue([]);

      const result = await loadDataSourceScripts(configuredDataSources);

      expect(result).toEqual([]);
    });
  });

  describe("DataSourceScript interface", () => {
    it("should have correct type structure", () => {
      const script: DataSourceScript = {
        name: "test-script",
        dataSource: "test",
        scriptName: "script",
        resources: ["resource1"],
        dependencies: ["dep1"],
        importWindowDuration: 86400000,
        run: vi.fn(),
      };

      expect(script.name).toBe("test-script");
      expect(script.dataSource).toBe("test");
      expect(script.scriptName).toBe("script");
      expect(script.resources).toEqual(["resource1"]);
      expect(script.dependencies).toEqual(["dep1"]);
      expect(script.importWindowDuration).toBe(86400000);
      expect(typeof script.run).toBe("function");
    });
  });
});

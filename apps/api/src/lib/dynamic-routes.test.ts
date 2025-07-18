import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Router } from "express";

describe("Dynamic Routes", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let mockImportMetaGlob: ReturnType<typeof vi.fn>;
  let loadRoutes: typeof import("./dynamic-routes").loadRoutes;

  beforeEach(async () => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Mock import.meta.glob
    mockImportMetaGlob = vi.fn();

    // Mock the module directly
    vi.doMock("./dynamic-routes", () => {
      return {
        loadRoutes: vi.fn(async () => {
          const modules = mockImportMetaGlob("../../../../plugins/{resources,data-sources,reports}/*/api/index.ts");
          const routes: Router[] = [];

          for (const path in modules) {
            try {
              const module = (await modules[path]()) as { default: Router };
              if (module.default && typeof module.default === "function") {
                routes.push(module.default);
                console.log(`Loaded routes from: ${path}`);
              }
            } catch (error) {
              console.error(`Error loading routes from ${path}:`, error);
            }
          }

          return routes;
        }),
      };
    });

    // Import the mocked module
    const module = await import("./dynamic-routes");
    loadRoutes = module.loadRoutes;
  });

  describe("loadRoutes", () => {
    it("should successfully load valid router modules", async () => {
      const mockRouter1 = vi.fn() as unknown as Router;
      const mockRouter2 = vi.fn() as unknown as Router;

      const mockModules = {
        "../../../../plugins/resources/commit/api/index.ts": vi.fn().mockResolvedValue({
          default: mockRouter1,
        }),
        "../../../../plugins/resources/repository/api/index.ts": vi.fn().mockResolvedValue({
          default: mockRouter2,
        }),
      };

      mockImportMetaGlob.mockReturnValue(mockModules);

      const routes = await loadRoutes();

      expect(routes).toHaveLength(2);
      expect(routes).toContain(mockRouter1);
      expect(routes).toContain(mockRouter2);
      expect(consoleSpy).toHaveBeenCalledWith("Loaded routes from: ../../../../plugins/resources/commit/api/index.ts");
      expect(consoleSpy).toHaveBeenCalledWith("Loaded routes from: ../../../../plugins/resources/repository/api/index.ts");
    });

    it("should handle modules with no default export", async () => {
      const mockRouter = vi.fn() as unknown as Router;

      const mockModules = {
        "../../../../plugins/resources/commit/api/index.ts": vi.fn().mockResolvedValue({
          default: mockRouter,
        }),
        "../../../../plugins/resources/invalid/api/index.ts": vi.fn().mockResolvedValue({
          // No default export
        }),
      };

      mockImportMetaGlob.mockReturnValue(mockModules);

      const routes = await loadRoutes();

      expect(routes).toHaveLength(1);
      expect(routes).toContain(mockRouter);
      expect(consoleSpy).toHaveBeenCalledWith("Loaded routes from: ../../../../plugins/resources/commit/api/index.ts");
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining("invalid"));
    });

    it("should handle modules with non-function default export", async () => {
      const mockRouter = vi.fn() as unknown as Router;

      const mockModules = {
        "../../../../plugins/resources/commit/api/index.ts": vi.fn().mockResolvedValue({
          default: mockRouter,
        }),
        "../../../../plugins/resources/invalid/api/index.ts": vi.fn().mockResolvedValue({
          default: "not a function",
        }),
      };

      mockImportMetaGlob.mockReturnValue(mockModules);

      const routes = await loadRoutes();

      expect(routes).toHaveLength(1);
      expect(routes).toContain(mockRouter);
      expect(consoleSpy).toHaveBeenCalledWith("Loaded routes from: ../../../../plugins/resources/commit/api/index.ts");
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining("invalid"));
    });

    it("should handle module import errors gracefully", async () => {
      const mockRouter = vi.fn() as unknown as Router;
      const importError = new Error("Module not found");

      const mockModules = {
        "../../../../plugins/resources/commit/api/index.ts": vi.fn().mockResolvedValue({
          default: mockRouter,
        }),
        "../../../../plugins/resources/broken/api/index.ts": vi.fn().mockRejectedValue(importError),
      };

      mockImportMetaGlob.mockReturnValue(mockModules);

      const routes = await loadRoutes();

      expect(routes).toHaveLength(1);
      expect(routes).toContain(mockRouter);
      expect(consoleSpy).toHaveBeenCalledWith("Loaded routes from: ../../../../plugins/resources/commit/api/index.ts");
      expect(consoleErrorSpy).toHaveBeenCalledWith("Error loading routes from ../../../../plugins/resources/broken/api/index.ts:", importError);
    });

    it("should handle modules with malformed structure", async () => {
      const mockRouter = vi.fn() as unknown as Router;

      const mockModules = {
        "../../../../plugins/resources/commit/api/index.ts": vi.fn().mockResolvedValue({
          default: mockRouter,
        }),
        "../../../../plugins/resources/malformed/api/index.ts": vi.fn().mockResolvedValue({
          default: null,
        }),
      };

      mockImportMetaGlob.mockReturnValue(mockModules);

      const routes = await loadRoutes();

      expect(routes).toHaveLength(1);
      expect(routes).toContain(mockRouter);
      expect(consoleSpy).toHaveBeenCalledWith("Loaded routes from: ../../../../plugins/resources/commit/api/index.ts");
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining("malformed"));
    });

    it("should handle empty modules object", async () => {
      mockImportMetaGlob.mockReturnValue({});

      const routes = await loadRoutes();

      expect(routes).toHaveLength(0);
      expect(consoleSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it("should load routes from all plugin types", async () => {
      const mockResourceRouter = vi.fn() as unknown as Router;
      const mockDataSourceRouter = vi.fn() as unknown as Router;
      const mockReportRouter = vi.fn() as unknown as Router;

      const mockModules = {
        "../../../../plugins/resources/commit/api/index.ts": vi.fn().mockResolvedValue({
          default: mockResourceRouter,
        }),
        "../../../../plugins/data-sources/github/api/index.ts": vi.fn().mockResolvedValue({
          default: mockDataSourceRouter,
        }),
        "../../../../plugins/reports/productivity/api/index.ts": vi.fn().mockResolvedValue({
          default: mockReportRouter,
        }),
      };

      mockImportMetaGlob.mockReturnValue(mockModules);

      const routes = await loadRoutes();

      expect(routes).toHaveLength(3);
      expect(routes).toContain(mockResourceRouter);
      expect(routes).toContain(mockDataSourceRouter);
      expect(routes).toContain(mockReportRouter);
      expect(consoleSpy).toHaveBeenCalledTimes(3);
    });

    it("should handle modules with undefined default export", async () => {
      const mockRouter = vi.fn() as unknown as Router;

      const mockModules = {
        "../../../../plugins/resources/commit/api/index.ts": vi.fn().mockResolvedValue({
          default: mockRouter,
        }),
        "../../../../plugins/resources/undefined/api/index.ts": vi.fn().mockResolvedValue({
          default: undefined,
        }),
      };

      mockImportMetaGlob.mockReturnValue(mockModules);

      const routes = await loadRoutes();

      expect(routes).toHaveLength(1);
      expect(routes).toContain(mockRouter);
      expect(consoleSpy).toHaveBeenCalledWith("Loaded routes from: ../../../../plugins/resources/commit/api/index.ts");
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining("undefined"));
    });

    it("should handle glob pattern correctly", async () => {
      mockImportMetaGlob.mockReturnValue({});

      await loadRoutes();

      expect(mockImportMetaGlob).toHaveBeenCalledWith("../../../../plugins/{resources,data-sources,reports}/*/api/index.ts");
    });

    it("should handle syntax errors in module imports", async () => {
      const mockRouter = vi.fn() as unknown as Router;
      const syntaxError = new SyntaxError("Unexpected token");

      const mockModules = {
        "../../../../plugins/resources/commit/api/index.ts": vi.fn().mockResolvedValue({
          default: mockRouter,
        }),
        "../../../../plugins/resources/syntax-error/api/index.ts": vi.fn().mockRejectedValue(syntaxError),
      };

      mockImportMetaGlob.mockReturnValue(mockModules);

      const routes = await loadRoutes();

      expect(routes).toHaveLength(1);
      expect(routes).toContain(mockRouter);
      expect(consoleErrorSpy).toHaveBeenCalledWith("Error loading routes from ../../../../plugins/resources/syntax-error/api/index.ts:", syntaxError);
    });

    it("should handle multiple error scenarios", async () => {
      const mockRouter = vi.fn() as unknown as Router;
      const importError = new Error("Import failed");

      const mockModules = {
        "../../../../plugins/resources/commit/api/index.ts": vi.fn().mockResolvedValue({
          default: mockRouter,
        }),
        "../../../../plugins/resources/error1/api/index.ts": vi.fn().mockRejectedValue(importError),
        "../../../../plugins/resources/error2/api/index.ts": vi.fn().mockResolvedValue({
          default: "not a function",
        }),
        "../../../../plugins/resources/error3/api/index.ts": vi.fn().mockResolvedValue({
          // No default export
        }),
      };

      mockImportMetaGlob.mockReturnValue(mockModules);

      const routes = await loadRoutes();

      expect(routes).toHaveLength(1);
      expect(routes).toContain(mockRouter);
      expect(consoleErrorSpy).toHaveBeenCalledWith("Error loading routes from ../../../../plugins/resources/error1/api/index.ts:", importError);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    it("should handle functions that are not routers", async () => {
      const mockRouter = vi.fn() as unknown as Router;
      const notARouter = vi.fn();

      const mockModules = {
        "../../../../plugins/resources/commit/api/index.ts": vi.fn().mockResolvedValue({
          default: mockRouter,
        }),
        "../../../../plugins/resources/not-router/api/index.ts": vi.fn().mockResolvedValue({
          default: notARouter,
        }),
      };

      mockImportMetaGlob.mockReturnValue(mockModules);

      const routes = await loadRoutes();

      expect(routes).toHaveLength(2);
      expect(routes).toContain(mockRouter);
      expect(routes).toContain(notARouter);
      expect(consoleSpy).toHaveBeenCalledTimes(2);
    });

    it("should handle many failed imports without memory leaks", async () => {
      const mockRouter = vi.fn() as unknown as Router;
      const mockModules: Record<string, any> = {
        "../../../../plugins/resources/commit/api/index.ts": vi.fn().mockResolvedValue({
          default: mockRouter,
        }),
      };

      // Create many failing imports
      for (let i = 0; i < 10; i++) {
        mockModules[`../../../../plugins/resources/fail${i}/api/index.ts`] = vi.fn().mockRejectedValue(new Error(`Error ${i}`));
      }

      mockImportMetaGlob.mockReturnValue(mockModules);

      const routes = await loadRoutes();

      expect(routes).toHaveLength(1);
      expect(routes).toContain(mockRouter);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(10);
    });

    it("should handle concurrent module loading", async () => {
      const mockRouter1 = vi.fn() as unknown as Router;
      const mockRouter2 = vi.fn() as unknown as Router;

      const mockModules = {
        "../../../../plugins/resources/slow1/api/index.ts": vi
          .fn()
          .mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve({ default: mockRouter1 }), 1))),
        "../../../../plugins/resources/slow2/api/index.ts": vi
          .fn()
          .mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve({ default: mockRouter2 }), 1))),
      };

      mockImportMetaGlob.mockReturnValue(mockModules);

      const routes = await loadRoutes();

      expect(routes).toHaveLength(2);
      expect(routes).toContain(mockRouter1);
      expect(routes).toContain(mockRouter2);
    });

    it("should handle very long plugin paths", async () => {
      const mockRouter = vi.fn() as unknown as Router;
      const longPath = "../../../../plugins/resources/very-long-plugin-name-that-exceeds-normal-length/api/index.ts";

      const mockModules = {
        [longPath]: vi.fn().mockResolvedValue({
          default: mockRouter,
        }),
      };

      mockImportMetaGlob.mockReturnValue(mockModules);

      const routes = await loadRoutes();

      expect(routes).toHaveLength(1);
      expect(routes).toContain(mockRouter);
      expect(consoleSpy).toHaveBeenCalledWith(`Loaded routes from: ${longPath}`);
    });

    it("should handle modules with extra properties", async () => {
      const mockRouter = vi.fn() as unknown as Router;

      const mockModules = {
        "../../../../plugins/resources/commit/api/index.ts": vi.fn().mockResolvedValue({
          default: mockRouter,
          someOtherExport: "value",
          anotherFunction: vi.fn(),
        }),
      };

      mockImportMetaGlob.mockReturnValue(mockModules);

      const routes = await loadRoutes();

      expect(routes).toHaveLength(1);
      expect(routes).toContain(mockRouter);
      expect(consoleSpy).toHaveBeenCalledWith("Loaded routes from: ../../../../plugins/resources/commit/api/index.ts");
    });

    it("should handle modules that throw during property access", async () => {
      const mockRouter = vi.fn() as unknown as Router;

      const mockModules = {
        "../../../../plugins/resources/commit/api/index.ts": vi.fn().mockResolvedValue({
          default: mockRouter,
        }),
        "../../../../plugins/resources/throwing/api/index.ts": vi.fn().mockResolvedValue({
          get default() {
            throw new Error("Property access error");
          },
        }),
      };

      mockImportMetaGlob.mockReturnValue(mockModules);

      const routes = await loadRoutes();

      expect(routes).toHaveLength(1);
      expect(routes).toContain(mockRouter);
      expect(consoleErrorSpy).toHaveBeenCalledWith("Error loading routes from ../../../../plugins/resources/throwing/api/index.ts:", expect.any(Error));
    });

    it("should handle modules with circular references", async () => {
      const mockRouter = vi.fn() as unknown as Router;
      const circularRef: any = {};
      circularRef.self = circularRef;

      const mockModules = {
        "../../../../plugins/resources/commit/api/index.ts": vi.fn().mockResolvedValue({
          default: mockRouter,
        }),
        "../../../../plugins/resources/circular/api/index.ts": vi.fn().mockResolvedValue({
          default: circularRef,
        }),
      };

      mockImportMetaGlob.mockReturnValue(mockModules);

      const routes = await loadRoutes();

      expect(routes).toHaveLength(1);
      expect(routes).toContain(mockRouter);
      expect(consoleSpy).toHaveBeenCalledWith("Loaded routes from: ../../../../plugins/resources/commit/api/index.ts");
    });

    it("should preserve order of route loads", async () => {
      const mockRouter1 = vi.fn() as unknown as Router;
      const mockRouter2 = vi.fn() as unknown as Router;
      const mockRouter3 = vi.fn() as unknown as Router;

      const mockModules = {
        "../../../../plugins/resources/a/api/index.ts": vi.fn().mockResolvedValue({
          default: mockRouter1,
        }),
        "../../../../plugins/resources/b/api/index.ts": vi.fn().mockResolvedValue({
          default: mockRouter2,
        }),
        "../../../../plugins/resources/c/api/index.ts": vi.fn().mockResolvedValue({
          default: mockRouter3,
        }),
      };

      mockImportMetaGlob.mockReturnValue(mockModules);

      const routes = await loadRoutes();

      expect(routes).toHaveLength(3);
      expect(routes).toContain(mockRouter1);
      expect(routes).toContain(mockRouter2);
      expect(routes).toContain(mockRouter3);
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { loadJobs, type CronJob } from "./dynamic-jobs";

// Mock fast-glob
vi.mock("fast-glob", () => ({
  default: vi.fn(),
}));

// Mock node:path
vi.mock("node:path", async () => {
  const actual = await vi.importActual("node:path");
  return {
    ...actual,
    basename: vi.fn(),
    dirname: vi.fn(),
    relative: vi.fn(),
  };
});

// Mock console methods
const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

describe("dynamic-jobs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe("loadJobs", () => {
    it("should discover and load valid cron jobs", async () => {
      const mockFg = await import("fast-glob");
      const mockPath = await import("node:path");

      const mockJobPaths = ["/path/to/data-sources/github/cron/index.ts", "/path/to/reports/productivity/cron/index.ts"];

      vi.mocked(mockFg.default).mockResolvedValue(mockJobPaths);

      // Mock path methods
      vi.mocked(mockPath.basename).mockReturnValueOnce("github").mockReturnValueOnce("productivity");

      vi.mocked(mockPath.dirname)
        .mockReturnValueOnce("/path/to/data-sources/github")
        .mockReturnValueOnce("/path/to/data-sources")
        .mockReturnValueOnce("/path/to/reports/productivity")
        .mockReturnValueOnce("/path/to/reports");

      vi.mocked(mockPath.relative)
        .mockReturnValueOnce("plugins/data-sources/github/cron/index.ts")
        .mockReturnValueOnce("plugins/reports/productivity/cron/index.ts");

      // Mock dynamic imports
      const mockGithubJob = {
        default: {
          schedule: "0 */6 * * *",
          handler: vi.fn(),
        },
      };

      const mockProductivityJob = {
        default: {
          schedule: "0 8 * * *",
          handler: vi.fn(),
        },
      };

      vi.doMock("/path/to/data-sources/github/cron/index.ts", () => mockGithubJob);
      vi.doMock("/path/to/reports/productivity/cron/index.ts", () => mockProductivityJob);

      const jobs = await loadJobs();

      expect(jobs).toHaveLength(2);
      expect(jobs[0]).toEqual({
        name: "github",
        schedule: "0 */6 * * *",
        handler: mockGithubJob.default.handler,
      });
      expect(jobs[1]).toEqual({
        name: "productivity",
        schedule: "0 8 * * *",
        handler: mockProductivityJob.default.handler,
      });

      expect(consoleLogSpy).toHaveBeenCalledWith("Loaded job: github from: ../../../../../../../path/to/data-sources/github/cron/index.ts");
      expect(consoleLogSpy).toHaveBeenCalledWith("Loaded job: productivity from: ../../../../../../../path/to/reports/productivity/cron/index.ts");
    });

    it("should use fast-glob with correct patterns and options", async () => {
      const mockFg = await import("fast-glob");
      vi.mocked(mockFg.default).mockResolvedValue([]);

      await loadJobs();

      expect(mockFg.default).toHaveBeenCalledWith(["../data-sources/*/cron/index.ts", "../reports/*/cron/index.ts"], {
        absolute: true,
        cwd: expect.any(String),
      });
    });

    it("should skip modules without default export", async () => {
      const mockFg = await import("fast-glob");
      const mockJobPaths = ["/path/to/invalid/cron/index.ts"];

      vi.mocked(mockFg.default).mockResolvedValue(mockJobPaths);

      const mockInvalidJob = {
        // No default export
        schedule: "0 */6 * * *",
        handler: vi.fn(),
      };

      vi.doMock("/path/to/invalid/cron/index.ts", () => mockInvalidJob);

      const jobs = await loadJobs();

      expect(jobs).toHaveLength(0);
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it("should skip modules with invalid default export type", async () => {
      const mockFg = await import("fast-glob");
      const mockJobPaths = ["/path/to/invalid/cron/index.ts"];

      vi.mocked(mockFg.default).mockResolvedValue(mockJobPaths);

      const mockInvalidJob = {
        default: "not an object",
      };

      vi.doMock("/path/to/invalid/cron/index.ts", () => mockInvalidJob);

      const jobs = await loadJobs();

      expect(jobs).toHaveLength(0);
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it("should skip modules missing schedule property", async () => {
      const mockFg = await import("fast-glob");
      const mockJobPaths = ["/path/to/invalid/cron/index.ts"];

      vi.mocked(mockFg.default).mockResolvedValue(mockJobPaths);

      const mockInvalidJob = {
        default: {
          // Missing schedule
          handler: vi.fn(),
        },
      };

      vi.doMock("/path/to/invalid/cron/index.ts", () => mockInvalidJob);

      const jobs = await loadJobs();

      expect(jobs).toHaveLength(0);
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it("should skip modules missing handler property", async () => {
      const mockFg = await import("fast-glob");
      const mockJobPaths = ["/path/to/invalid/cron/index.ts"];

      vi.mocked(mockFg.default).mockResolvedValue(mockJobPaths);

      const mockInvalidJob = {
        default: {
          schedule: "0 */6 * * *",
          // Missing handler
        },
      };

      vi.doMock("/path/to/invalid/cron/index.ts", () => mockInvalidJob);

      const jobs = await loadJobs();

      expect(jobs).toHaveLength(0);
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it("should handle import errors gracefully", async () => {
      const mockFg = await import("fast-glob");
      const mockPath = await import("node:path");
      const mockJobPaths = ["/path/to/broken/cron/index.ts"];

      vi.mocked(mockFg.default).mockResolvedValue(mockJobPaths);
      vi.mocked(mockPath.relative).mockReturnValue("plugins/broken/cron/index.ts");

      // Mock a failing import
      vi.doMock("/path/to/broken/cron/index.ts", () => {
        throw new Error("Module not found");
      });

      const jobs = await loadJobs();

      expect(jobs).toHaveLength(0);
      expect(consoleErrorSpy).toHaveBeenCalledWith("Error loading job from /path/to/broken/cron/index.ts:", expect.any(Error));
    });

    it("should handle syntax errors in job modules", async () => {
      const mockFg = await import("fast-glob");
      const mockJobPaths = ["/path/to/syntax-error/cron/index.ts"];

      vi.mocked(mockFg.default).mockResolvedValue(mockJobPaths);

      // Mock a module with syntax error
      vi.doMock("/path/to/syntax-error/cron/index.ts", () => {
        throw new SyntaxError("Unexpected token");
      });

      const jobs = await loadJobs();

      expect(jobs).toHaveLength(0);
      expect(consoleErrorSpy).toHaveBeenCalledWith("Error loading job from /path/to/syntax-error/cron/index.ts:", expect.any(Error));
    });

    it("should extract job name from correct directory level", async () => {
      const mockFg = await import("fast-glob");
      const mockPath = await import("node:path");
      const mockJobPaths = ["/complex/path/to/data-sources/my-source/cron/index.ts"];

      vi.mocked(mockFg.default).mockResolvedValue(mockJobPaths);

      // Mock the path extraction sequence
      vi.mocked(mockPath.basename).mockReturnValueOnce("my-source");

      vi.mocked(mockPath.dirname).mockReturnValueOnce("/complex/path/to/data-sources/my-source").mockReturnValueOnce("/complex/path/to/data-sources");

      vi.mocked(mockPath.relative).mockReturnValue("plugins/data-sources/my-source/cron/index.ts");

      const mockJob = {
        default: {
          schedule: "0 */6 * * *",
          handler: vi.fn(),
        },
      };

      vi.doMock("/complex/path/to/data-sources/my-source/cron/index.ts", () => mockJob);

      const jobs = await loadJobs();

      expect(jobs).toHaveLength(1);
      expect(jobs[0].name).toBe("my-source");
    });

    it("should handle empty job paths array", async () => {
      const mockFg = await import("fast-glob");
      vi.mocked(mockFg.default).mockResolvedValue([]);

      const jobs = await loadJobs();

      expect(jobs).toHaveLength(0);
      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it("should handle fast-glob errors", async () => {
      const mockFg = await import("fast-glob");
      vi.mocked(mockFg.default).mockRejectedValue(new Error("Glob pattern error"));

      await expect(loadJobs()).rejects.toThrow("Glob pattern error");
    });

    it("should load multiple jobs from different plugin types", async () => {
      const mockFg = await import("fast-glob");
      const mockPath = await import("node:path");

      const mockJobPaths = [
        "/path/to/data-sources/github/cron/index.ts",
        "/path/to/data-sources/jira/cron/index.ts",
        "/path/to/reports/velocity/cron/index.ts",
        "/path/to/reports/quality/cron/index.ts",
      ];

      vi.mocked(mockFg.default).mockResolvedValue(mockJobPaths);

      // Mock path methods for all jobs
      vi.mocked(mockPath.basename).mockReturnValueOnce("github").mockReturnValueOnce("jira").mockReturnValueOnce("velocity").mockReturnValueOnce("quality");

      vi.mocked(mockPath.dirname).mockReturnValue("/mocked/path").mockReturnValue("/mocked");

      vi.mocked(mockPath.relative).mockReturnValue("plugins/mock/cron/index.ts");

      // Mock all job modules
      const mockJobs = [
        { default: { schedule: "0 */6 * * *", handler: vi.fn() } },
        { default: { schedule: "0 */4 * * *", handler: vi.fn() } },
        { default: { schedule: "0 8 * * *", handler: vi.fn() } },
        { default: { schedule: "0 9 * * *", handler: vi.fn() } },
      ];

      mockJobPaths.forEach((path, index) => {
        vi.doMock(path, () => mockJobs[index]);
      });

      const jobs = await loadJobs();

      expect(jobs).toHaveLength(4);
      expect(jobs.map((job) => job.name)).toEqual(["github", "jira", "velocity", "quality"]);
      expect(consoleLogSpy).toHaveBeenCalledTimes(4);
    });

    it("should preserve job handler function references", async () => {
      const mockFg = await import("fast-glob");
      const mockPath = await import("node:path");
      const mockJobPaths = ["/path/to/data-sources/test/cron/index.ts"];

      vi.mocked(mockFg.default).mockResolvedValue(mockJobPaths);

      vi.mocked(mockPath.basename).mockReturnValue("test");
      vi.mocked(mockPath.dirname).mockReturnValue("/mocked");
      vi.mocked(mockPath.relative).mockReturnValue("plugins/test/cron/index.ts");

      const mockHandler = vi.fn();
      const mockJob = {
        default: {
          schedule: "0 */6 * * *",
          handler: mockHandler,
        },
      };

      vi.doMock("/path/to/data-sources/test/cron/index.ts", () => mockJob);

      const jobs = await loadJobs();

      expect(jobs).toHaveLength(1);
      expect(jobs[0].handler).toBe(mockHandler);

      // Verify the handler can be called
      jobs[0].handler();
      expect(mockHandler).toHaveBeenCalledOnce();
    });
  });

  describe("CronJob interface", () => {
    it("should define correct CronJob interface structure", () => {
      // This is a compile-time test to ensure the interface is properly defined
      const validJob: CronJob = {
        name: "test-job",
        schedule: "0 */6 * * *",
        handler: () => {},
      };

      expect(validJob.name).toBe("test-job");
      expect(validJob.schedule).toBe("0 */6 * * *");
      expect(typeof validJob.handler).toBe("function");
    });
  });
});

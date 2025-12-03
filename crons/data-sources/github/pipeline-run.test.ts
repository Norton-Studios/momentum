import type { PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { pipelineRunScript } from "./pipeline-run.js";

const mockPaginateIterator = vi.fn();
const mockListWorkflowRunsForRepo = vi.fn();
const mockListJobsForWorkflowRun = vi.fn();

vi.mock("@octokit/rest", () => ({
  Octokit: class {
    actions = {
      listWorkflowRunsForRepo: mockListWorkflowRunsForRepo,
      listJobsForWorkflowRun: mockListJobsForWorkflowRun,
    };
    paginate = {
      iterator: mockPaginateIterator,
    };
  },
}));

describe("pipelineRunScript", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should have correct configuration", () => {
    expect(pipelineRunScript.dataSourceName).toBe("GITHUB");
    expect(pipelineRunScript.resource).toBe("pipeline-run");
    expect(pipelineRunScript.dependsOn).toEqual(["repository", "pipeline"]);
    expect(pipelineRunScript.importWindowDays).toBe(90);
  });

  it("should have a run function", () => {
    expect(typeof pipelineRunScript.run).toBe("function");
  });

  it("should fetch and store workflow runs with jobs", async () => {
    // Arrange
    const mockRuns = [
      {
        id: 123,
        run_number: 42,
        status: "completed",
        conclusion: "success",
        head_branch: "main",
        head_sha: "abc123",
        event: "push",
        html_url: "https://github.com/org/repo1/actions/runs/123",
        path: ".github/workflows/ci.yml",
        created_at: "2024-01-15T10:00:00Z",
        updated_at: "2024-01-15T10:05:00Z",
        run_started_at: "2024-01-15T10:00:00Z",
      },
    ];

    const mockJobs = [
      {
        id: 1,
        name: "build",
        status: "completed",
        conclusion: "success",
        started_at: "2024-01-15T10:00:00Z",
        completed_at: "2024-01-15T10:03:00Z",
      },
      {
        id: 2,
        name: "test",
        status: "completed",
        conclusion: "success",
        started_at: "2024-01-15T10:03:00Z",
        completed_at: "2024-01-15T10:05:00Z",
      },
    ];

    mockPaginateIterator.mockImplementation((method) => {
      if (method === mockListWorkflowRunsForRepo) {
        return (async function* () {
          yield { data: mockRuns };
        })();
      }
      return (async function* () {
        yield { data: mockJobs };
      })();
    });

    const mockDb = {
      repository: {
        findMany: vi.fn().mockResolvedValue([{ id: "repo-1", fullName: "org/repo1" }]),
      },
      pipeline: {
        findFirst: vi.fn().mockResolvedValue({ id: "pipeline-1" }),
      },
      pipelineRun: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: "run-1" }),
      },
      pipelineStage: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({}),
      },
      importLog: {
        create: vi.fn(),
      },
      dataSourceRun: {
        update: vi.fn().mockResolvedValue({}),
      },
    } as unknown as PrismaClient;

    const context = {
      id: "ds-123",
      provider: "GITHUB",
      env: { GITHUB_TOKEN: "token123" },
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      runId: "run-123",
    };

    // Act
    await pipelineRunScript.run(mockDb, context as never);

    // Assert
    expect(mockDb.pipelineRun.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        pipelineId: "pipeline-1",
        runNumber: 42,
        status: "SUCCESS",
        branch: "main",
        commitSha: "abc123",
        triggerEvent: "push",
      }),
    });
    expect(mockDb.pipelineStage.create).toHaveBeenCalledTimes(2);
    expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
      where: { id: "run-123" },
      data: { recordsImported: 1 },
    });
  });

  it("should map workflow run statuses correctly", async () => {
    // Arrange
    const mockRuns = [
      {
        id: 1,
        run_number: 1,
        status: "queued",
        conclusion: null,
        head_branch: "main",
        head_sha: "abc",
        event: "push",
        html_url: "https://github.com/org/repo1/actions/runs/1",
        path: ".github/workflows/ci.yml",
        created_at: "2024-01-15T10:00:00Z",
        updated_at: "2024-01-15T10:00:00Z",
        run_started_at: null,
      },
      {
        id: 2,
        run_number: 2,
        status: "in_progress",
        conclusion: null,
        head_branch: "main",
        head_sha: "def",
        event: "push",
        html_url: "https://github.com/org/repo1/actions/runs/2",
        path: ".github/workflows/ci.yml",
        created_at: "2024-01-15T10:00:00Z",
        updated_at: "2024-01-15T10:00:00Z",
        run_started_at: "2024-01-15T10:00:00Z",
      },
      {
        id: 3,
        run_number: 3,
        status: "completed",
        conclusion: "failure",
        head_branch: "main",
        head_sha: "ghi",
        event: "push",
        html_url: "https://github.com/org/repo1/actions/runs/3",
        path: ".github/workflows/ci.yml",
        created_at: "2024-01-15T10:00:00Z",
        updated_at: "2024-01-15T10:05:00Z",
        run_started_at: "2024-01-15T10:00:00Z",
      },
      {
        id: 4,
        run_number: 4,
        status: "completed",
        conclusion: "cancelled",
        head_branch: "main",
        head_sha: "jkl",
        event: "push",
        html_url: "https://github.com/org/repo1/actions/runs/4",
        path: ".github/workflows/ci.yml",
        created_at: "2024-01-15T10:00:00Z",
        updated_at: "2024-01-15T10:02:00Z",
        run_started_at: "2024-01-15T10:00:00Z",
      },
    ];

    mockPaginateIterator.mockImplementation((method) => {
      if (method === mockListWorkflowRunsForRepo) {
        return (async function* () {
          yield { data: mockRuns };
        })();
      }
      return (async function* () {
        yield { data: [] };
      })();
    });

    const mockDb = {
      repository: {
        findMany: vi.fn().mockResolvedValue([{ id: "repo-1", fullName: "org/repo1" }]),
      },
      pipeline: {
        findFirst: vi.fn().mockResolvedValue({ id: "pipeline-1" }),
      },
      pipelineRun: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: "run-1" }),
      },
      pipelineStage: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
      importLog: {
        create: vi.fn(),
      },
      dataSourceRun: {
        update: vi.fn().mockResolvedValue({}),
      },
    } as unknown as PrismaClient;

    const context = {
      id: "ds-123",
      provider: "GITHUB",
      env: { GITHUB_TOKEN: "token123" },
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      runId: "run-123",
    };

    // Act
    await pipelineRunScript.run(mockDb, context as never);

    // Assert
    expect(mockDb.pipelineRun.create).toHaveBeenCalledTimes(4);
    expect(mockDb.pipelineRun.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({ status: "PENDING" }),
      })
    );
    expect(mockDb.pipelineRun.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({ status: "RUNNING" }),
      })
    );
    expect(mockDb.pipelineRun.create).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        data: expect.objectContaining({ status: "FAILED" }),
      })
    );
    expect(mockDb.pipelineRun.create).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({
        data: expect.objectContaining({ status: "CANCELLED" }),
      })
    );
  });

  it("should skip runs without matching pipeline", async () => {
    // Arrange
    const mockRuns = [
      {
        id: 123,
        run_number: 42,
        status: "completed",
        conclusion: "success",
        head_branch: "main",
        head_sha: "abc123",
        event: "push",
        html_url: "https://github.com/org/repo1/actions/runs/123",
        path: ".github/workflows/unknown.yml",
        created_at: "2024-01-15T10:00:00Z",
        updated_at: "2024-01-15T10:05:00Z",
        run_started_at: "2024-01-15T10:00:00Z",
      },
    ];

    mockPaginateIterator.mockImplementation((method) => {
      if (method === mockListWorkflowRunsForRepo) {
        return (async function* () {
          yield { data: mockRuns };
        })();
      }
      return (async function* () {
        yield { data: [] };
      })();
    });

    const mockDb = {
      repository: {
        findMany: vi.fn().mockResolvedValue([{ id: "repo-1", fullName: "org/repo1" }]),
      },
      pipeline: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      pipelineRun: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      importLog: {
        create: vi.fn(),
      },
      dataSourceRun: {
        update: vi.fn().mockResolvedValue({}),
      },
    } as unknown as PrismaClient;

    const context = {
      id: "ds-123",
      provider: "GITHUB",
      env: { GITHUB_TOKEN: "token123" },
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      runId: "run-123",
    };

    // Act
    await pipelineRunScript.run(mockDb, context as never);

    // Assert
    expect(mockDb.pipelineRun.create).not.toHaveBeenCalled();
    expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
      where: { id: "run-123" },
      data: { recordsImported: 0 },
    });
  });

  it("should filter runs by date range", async () => {
    // Arrange
    const mockRuns = [
      {
        id: 1,
        run_number: 1,
        status: "completed",
        conclusion: "success",
        head_branch: "main",
        head_sha: "abc",
        event: "push",
        html_url: "https://github.com/org/repo1/actions/runs/1",
        path: ".github/workflows/ci.yml",
        created_at: "2024-01-15T10:00:00Z",
        updated_at: "2024-01-15T10:05:00Z",
        run_started_at: "2024-01-15T10:00:00Z",
      },
      {
        id: 2,
        run_number: 2,
        status: "completed",
        conclusion: "success",
        head_branch: "main",
        head_sha: "def",
        event: "push",
        html_url: "https://github.com/org/repo1/actions/runs/2",
        path: ".github/workflows/ci.yml",
        created_at: "2023-12-15T10:00:00Z",
        updated_at: "2023-12-15T10:05:00Z",
        run_started_at: "2023-12-15T10:00:00Z",
      },
    ];

    mockPaginateIterator.mockImplementation((method) => {
      if (method === mockListWorkflowRunsForRepo) {
        return (async function* () {
          yield { data: mockRuns };
        })();
      }
      return (async function* () {
        yield { data: [] };
      })();
    });

    const mockDb = {
      repository: {
        findMany: vi.fn().mockResolvedValue([{ id: "repo-1", fullName: "org/repo1" }]),
      },
      pipeline: {
        findFirst: vi.fn().mockResolvedValue({ id: "pipeline-1" }),
      },
      pipelineRun: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: "run-1" }),
      },
      pipelineStage: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
      importLog: {
        create: vi.fn(),
      },
      dataSourceRun: {
        update: vi.fn().mockResolvedValue({}),
      },
    } as unknown as PrismaClient;

    const context = {
      id: "ds-123",
      provider: "GITHUB",
      env: { GITHUB_TOKEN: "token123" },
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      runId: "run-123",
    };

    // Act
    await pipelineRunScript.run(mockDb, context as never);

    // Assert
    expect(mockDb.pipelineRun.create).toHaveBeenCalledTimes(1);
    expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
      where: { id: "run-123" },
      data: { recordsImported: 1 },
    });
  });

  it("should handle empty repository list", async () => {
    // Arrange
    const mockDb = {
      repository: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      importLog: {
        create: vi.fn(),
      },
      dataSourceRun: {
        update: vi.fn().mockResolvedValue({}),
      },
    } as unknown as PrismaClient;

    const context = {
      id: "ds-123",
      provider: "GITHUB",
      env: { GITHUB_TOKEN: "token123" },
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      runId: "run-123",
    };

    // Act
    await pipelineRunScript.run(mockDb, context as never);

    // Assert
    expect(mockDb.importLog.create).not.toHaveBeenCalled();
    expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
      where: { id: "run-123" },
      data: { recordsImported: 0 },
    });
  });

  it("should handle API errors and log them", async () => {
    // Arrange
    mockPaginateIterator.mockImplementation(() => {
      throw new Error("API Error");
    });

    const mockDb = {
      repository: {
        findMany: vi.fn().mockResolvedValue([{ id: "repo-1", fullName: "org/repo1" }]),
      },
      importLog: {
        create: vi.fn().mockResolvedValue({}),
      },
      dataSourceRun: {
        update: vi.fn().mockResolvedValue({}),
      },
    } as unknown as PrismaClient;

    const context = {
      id: "ds-123",
      provider: "GITHUB",
      env: { GITHUB_TOKEN: "token123" },
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      runId: "run-123",
    };

    // Act
    await pipelineRunScript.run(mockDb, context as never);

    // Assert
    expect(mockDb.importLog.create).toHaveBeenCalledWith({
      data: {
        dataSourceRunId: "run-123",
        level: "ERROR",
        message: "Failed to import pipeline runs for org/repo1: API Error",
        details: null,
      },
    });
    expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
      where: { id: "run-123" },
      data: { recordsImported: 0 },
    });
  });
});

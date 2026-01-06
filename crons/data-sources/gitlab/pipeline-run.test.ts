import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DbClient } from "../../db.ts";
import { pipelineRunScript } from "./pipeline-run.js";

const mockProjectsShow = vi.fn();
const mockPipelinesAll = vi.fn();
const mockJobsAll = vi.fn();

vi.mock("@gitbeaker/rest", () => ({
  Gitlab: class {
    Projects = {
      show: mockProjectsShow,
    };
    Pipelines = {
      all: mockPipelinesAll,
    };
    Jobs = {
      all: mockJobsAll,
    };
  },
}));

describe("pipelineRunScript", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should have correct configuration", () => {
    expect(pipelineRunScript.dataSourceName).toBe("GITLAB");
    expect(pipelineRunScript.resource).toBe("pipeline-run");
    expect(pipelineRunScript.dependsOn).toEqual(["repository", "pipeline"]);
    expect(pipelineRunScript.importWindowDays).toBe(90);
  });

  it("should have a run function", () => {
    expect(typeof pipelineRunScript.run).toBe("function");
  });

  it("should fetch and upsert pipeline runs successfully", async () => {
    const mockPipelines = [
      {
        id: 100,
        status: "success",
        ref: "main",
        sha: "abc123",
        source: "push",
        webUrl: "https://gitlab.com/group/project/-/pipelines/100",
        duration: 120,
        startedAt: "2024-01-15T10:00:00Z",
        finishedAt: "2024-01-15T10:02:00Z",
      },
    ];

    const mockJobs = [
      {
        id: 1,
        name: "build",
        status: "success",
        duration: 60,
        startedAt: "2024-01-15T10:00:00Z",
        finishedAt: "2024-01-15T10:01:00Z",
      },
      {
        id: 2,
        name: "test",
        status: "success",
        duration: 60,
        startedAt: "2024-01-15T10:01:00Z",
        finishedAt: "2024-01-15T10:02:00Z",
      },
    ];

    mockProjectsShow.mockResolvedValue({ id: 123 });
    mockPipelinesAll.mockResolvedValue(mockPipelines);
    mockJobsAll.mockResolvedValue(mockJobs);

    const mockDb = {
      repository: {
        findMany: vi.fn().mockResolvedValue([{ id: "repo-1", fullName: "group/project1" }]),
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
      dataSourceRun: {
        update: vi.fn().mockResolvedValue({}),
      },
    } as unknown as DbClient;

    const context = {
      id: "ds-123",
      provider: "GITLAB",
      env: { GITLAB_TOKEN: "token123" },
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      runId: "run-123",
    };

    await pipelineRunScript.run(mockDb, context as never);

    expect(mockPipelinesAll).toHaveBeenCalledWith(123, {
      updatedAfter: "2024-01-01T00:00:00.000Z",
      updatedBefore: "2024-01-31T00:00:00.000Z",
      perPage: 100,
    });
    expect(mockDb.pipelineRun.create).toHaveBeenCalledWith({
      data: {
        pipelineId: "pipeline-1",
        runNumber: 100,
        status: "SUCCESS",
        branch: "main",
        commitSha: "abc123",
        triggerEvent: "push",
        url: "https://gitlab.com/group/project/-/pipelines/100",
        durationMs: 120000,
        startedAt: expect.any(Date),
        completedAt: expect.any(Date),
      },
    });
    expect(mockDb.pipelineStage.create).toHaveBeenCalledTimes(2);
    expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
      where: { id: "run-123" },
      data: { recordsImported: 1 },
    });
  });

  it("should skip when no pipeline exists for repository", async () => {
    const mockDb = {
      repository: {
        findMany: vi.fn().mockResolvedValue([{ id: "repo-1", fullName: "group/project1" }]),
      },
      pipeline: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      dataSourceRun: {
        update: vi.fn().mockResolvedValue({}),
      },
    } as unknown as DbClient;

    const context = {
      id: "ds-123",
      provider: "GITLAB",
      env: { GITLAB_TOKEN: "token123" },
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      runId: "run-123",
    };

    await pipelineRunScript.run(mockDb, context as never);

    expect(mockProjectsShow).not.toHaveBeenCalled();
    expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
      where: { id: "run-123" },
      data: { recordsImported: 0 },
    });
  });

  it("should update existing pipeline run", async () => {
    const mockPipelines = [
      {
        id: 100,
        status: "success",
        ref: "main",
        sha: "abc123",
        source: "push",
        webUrl: "https://gitlab.com/group/project/-/pipelines/100",
        duration: 120,
        startedAt: "2024-01-15T10:00:00Z",
        finishedAt: "2024-01-15T10:02:00Z",
      },
    ];

    mockProjectsShow.mockResolvedValue({ id: 123 });
    mockPipelinesAll.mockResolvedValue(mockPipelines);
    mockJobsAll.mockResolvedValue([]);

    const mockDb = {
      repository: {
        findMany: vi.fn().mockResolvedValue([{ id: "repo-1", fullName: "group/project1" }]),
      },
      pipeline: {
        findFirst: vi.fn().mockResolvedValue({ id: "pipeline-1" }),
      },
      pipelineRun: {
        findUnique: vi.fn().mockResolvedValue({ id: "existing-run" }),
        update: vi.fn().mockResolvedValue({}),
      },
      dataSourceRun: {
        update: vi.fn().mockResolvedValue({}),
      },
    } as unknown as DbClient;

    const context = {
      id: "ds-123",
      provider: "GITLAB",
      env: { GITLAB_TOKEN: "token123" },
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      runId: "run-123",
    };

    await pipelineRunScript.run(mockDb, context as never);

    expect(mockDb.pipelineRun.update).toHaveBeenCalledWith({
      where: { id: "existing-run" },
      data: expect.objectContaining({
        status: "SUCCESS",
        branch: "main",
      }),
    });
  });

  it("should map GitLab statuses correctly", async () => {
    const mockPipelines = [
      { id: 1, status: "pending", ref: "main", sha: "a", source: "push", webUrl: "", duration: null, startedAt: null, finishedAt: null },
      { id: 2, status: "running", ref: "main", sha: "b", source: "push", webUrl: "", duration: null, startedAt: null, finishedAt: null },
      { id: 3, status: "failed", ref: "main", sha: "c", source: "push", webUrl: "", duration: null, startedAt: null, finishedAt: null },
      { id: 4, status: "canceled", ref: "main", sha: "d", source: "push", webUrl: "", duration: null, startedAt: null, finishedAt: null },
      { id: 5, status: "skipped", ref: "main", sha: "e", source: "push", webUrl: "", duration: null, startedAt: null, finishedAt: null },
    ];

    mockProjectsShow.mockResolvedValue({ id: 123 });
    mockPipelinesAll.mockResolvedValue(mockPipelines);
    mockJobsAll.mockResolvedValue([]);

    const createCalls: unknown[] = [];
    const mockDb = {
      repository: {
        findMany: vi.fn().mockResolvedValue([{ id: "repo-1", fullName: "group/project1" }]),
      },
      pipeline: {
        findFirst: vi.fn().mockResolvedValue({ id: "pipeline-1" }),
      },
      pipelineRun: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockImplementation((data) => {
          createCalls.push(data);
          return { id: `run-${createCalls.length}` };
        }),
      },
      dataSourceRun: {
        update: vi.fn().mockResolvedValue({}),
      },
    } as unknown as DbClient;

    const context = {
      id: "ds-123",
      provider: "GITLAB",
      env: { GITLAB_TOKEN: "token123" },
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      runId: "run-123",
    };

    await pipelineRunScript.run(mockDb, context as never);

    expect(createCalls).toHaveLength(5);
    expect((createCalls[0] as { data: { status: string } }).data.status).toBe("PENDING");
    expect((createCalls[1] as { data: { status: string } }).data.status).toBe("RUNNING");
    expect((createCalls[2] as { data: { status: string } }).data.status).toBe("FAILED");
    expect((createCalls[3] as { data: { status: string } }).data.status).toBe("CANCELLED");
    expect((createCalls[4] as { data: { status: string } }).data.status).toBe("SKIPPED");
  });

  it("should handle empty repository list", async () => {
    const mockDb = {
      repository: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      dataSourceRun: {
        update: vi.fn().mockResolvedValue({}),
      },
    } as unknown as DbClient;

    const context = {
      id: "ds-123",
      provider: "GITLAB",
      env: { GITLAB_TOKEN: "token123" },
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      runId: "run-123",
    };

    await pipelineRunScript.run(mockDb, context as never);

    expect(mockProjectsShow).not.toHaveBeenCalled();
    expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
      where: { id: "run-123" },
      data: { recordsImported: 0 },
    });
  });

  it("should log errors and continue processing on API failure", async () => {
    mockProjectsShow.mockRejectedValue(new Error("API Error"));

    const mockDb = {
      repository: {
        findMany: vi.fn().mockResolvedValue([{ id: "repo-1", fullName: "group/project1" }]),
      },
      pipeline: {
        findFirst: vi.fn().mockResolvedValue({ id: "pipeline-1" }),
      },
      importLog: {
        create: vi.fn().mockResolvedValue({}),
      },
      dataSourceRun: {
        update: vi.fn().mockResolvedValue({}),
      },
    } as unknown as DbClient;

    const context = {
      id: "ds-123",
      provider: "GITLAB",
      env: { GITLAB_TOKEN: "token123" },
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      runId: "run-123",
    };

    await pipelineRunScript.run(mockDb, context as never);

    expect(mockDb.importLog.create).toHaveBeenCalledWith({
      data: {
        dataSourceRunId: "run-123",
        level: "ERROR",
        message: expect.stringContaining("Failed to import pipeline runs for group/project1"),
        details: null,
      },
    });
  });

  it("should update existing pipeline stages", async () => {
    const mockPipelines = [
      {
        id: 100,
        status: "success",
        ref: "main",
        sha: "abc123",
        source: "push",
        webUrl: "",
        duration: 120,
        startedAt: "2024-01-15T10:00:00Z",
        finishedAt: "2024-01-15T10:02:00Z",
      },
    ];

    const mockJobs = [
      {
        id: 1,
        name: "build",
        status: "success",
        duration: 60,
        startedAt: "2024-01-15T10:00:00Z",
        finishedAt: "2024-01-15T10:01:00Z",
      },
    ];

    mockProjectsShow.mockResolvedValue({ id: 123 });
    mockPipelinesAll.mockResolvedValue(mockPipelines);
    mockJobsAll.mockResolvedValue(mockJobs);

    const mockDb = {
      repository: {
        findMany: vi.fn().mockResolvedValue([{ id: "repo-1", fullName: "group/project1" }]),
      },
      pipeline: {
        findFirst: vi.fn().mockResolvedValue({ id: "pipeline-1" }),
      },
      pipelineRun: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: "run-1" }),
      },
      pipelineStage: {
        findFirst: vi.fn().mockResolvedValue({ id: "stage-1" }),
        update: vi.fn().mockResolvedValue({}),
      },
      dataSourceRun: {
        update: vi.fn().mockResolvedValue({}),
      },
    } as unknown as DbClient;

    const context = {
      id: "ds-123",
      provider: "GITLAB",
      env: { GITLAB_TOKEN: "token123" },
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      runId: "run-123",
    };

    await pipelineRunScript.run(mockDb, context as never);

    expect(mockDb.pipelineStage.update).toHaveBeenCalledWith({
      where: { id: "stage-1" },
      data: expect.objectContaining({
        status: "SUCCESS",
        durationMs: 60000,
      }),
    });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DbClient } from "../../db.ts";
import { pipelineScript } from "./pipeline.js";

const mockProjectsShow = vi.fn();
const mockPipelinesAll = vi.fn();

vi.mock("@gitbeaker/rest", () => ({
  Gitlab: class {
    Projects = {
      show: mockProjectsShow,
    };
    Pipelines = {
      all: mockPipelinesAll,
    };
  },
}));

describe("pipelineScript", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should have correct configuration", () => {
    expect(pipelineScript.dataSourceName).toBe("GITLAB");
    expect(pipelineScript.resource).toBe("pipeline");
    expect(pipelineScript.dependsOn).toEqual(["repository"]);
    expect(pipelineScript.importWindowDays).toBe(365);
  });

  it("should have a run function", () => {
    expect(typeof pipelineScript.run).toBe("function");
  });

  it("should create pipeline when project has pipelines", async () => {
    mockProjectsShow.mockResolvedValue({ id: 123 });
    mockPipelinesAll.mockResolvedValue([{ id: 1 }]);

    const mockDb = {
      repository: {
        findMany: vi.fn().mockResolvedValue([{ id: "repo-1", fullName: "group/project1" }]),
      },
      pipeline: {
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

    await pipelineScript.run(mockDb, context as never);

    expect(mockDb.pipeline.create).toHaveBeenCalledWith({
      data: {
        name: "group/project1 CI",
        provider: "GITLAB_CI",
        repositoryId: "repo-1",
        configPath: ".gitlab-ci.yml",
        isActive: true,
      },
    });
    expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
      where: { id: "run-123" },
      data: { recordsImported: 1 },
    });
  });

  it("should update existing pipeline", async () => {
    mockProjectsShow.mockResolvedValue({ id: 123 });
    mockPipelinesAll.mockResolvedValue([{ id: 1 }]);

    const mockDb = {
      repository: {
        findMany: vi.fn().mockResolvedValue([{ id: "repo-1", fullName: "group/project1" }]),
      },
      pipeline: {
        findFirst: vi.fn().mockResolvedValue({ id: "pipeline-1" }),
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

    await pipelineScript.run(mockDb, context as never);

    expect(mockDb.pipeline.update).toHaveBeenCalledWith({
      where: { id: "pipeline-1" },
      data: {
        name: "group/project1 CI",
        isActive: true,
      },
    });
  });

  it("should not create pipeline when project has no pipelines", async () => {
    mockProjectsShow.mockResolvedValue({ id: 123 });
    mockPipelinesAll.mockResolvedValue([]);

    const mockDb = {
      repository: {
        findMany: vi.fn().mockResolvedValue([{ id: "repo-1", fullName: "group/project1" }]),
      },
      pipeline: {
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

    await pipelineScript.run(mockDb, context as never);

    expect(mockDb.pipeline.create).not.toHaveBeenCalled();
    expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
      where: { id: "run-123" },
      data: { recordsImported: 0 },
    });
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

    await pipelineScript.run(mockDb, context as never);

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

    await pipelineScript.run(mockDb, context as never);

    expect(mockDb.importLog.create).toHaveBeenCalledWith({
      data: {
        dataSourceRunId: "run-123",
        level: "ERROR",
        message: expect.stringContaining("Failed to import pipeline for group/project1"),
        details: null,
      },
    });
  });
});

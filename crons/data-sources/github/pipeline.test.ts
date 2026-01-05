import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DbClient } from "../../db.ts";
import { pipelineScript } from "./pipeline.js";

const mockPaginateIterator = vi.fn();
const mockListRepoWorkflows = vi.fn();

vi.mock("@octokit/rest", () => ({
  Octokit: class {
    actions = {
      listRepoWorkflows: mockListRepoWorkflows,
    };
    paginate = {
      iterator: mockPaginateIterator,
    };
  },
}));

describe("pipelineScript", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should have correct configuration", () => {
    expect(pipelineScript.dataSourceName).toBe("GITHUB");
    expect(pipelineScript.resource).toBe("pipeline");
    expect(pipelineScript.dependsOn).toEqual(["repository"]);
    expect(pipelineScript.importWindowDays).toBe(365);
  });

  it("should have a run function", () => {
    expect(typeof pipelineScript.run).toBe("function");
  });

  it("should fetch and store workflows successfully", async () => {
    // Arrange
    const mockWorkflows = [
      {
        id: 1,
        name: "CI",
        path: ".github/workflows/ci.yml",
        state: "active",
      },
      {
        id: 2,
        name: "Deploy",
        path: ".github/workflows/deploy.yml",
        state: "active",
      },
    ];

    mockPaginateIterator.mockReturnValue(
      (async function* () {
        yield { data: mockWorkflows };
      })()
    );

    const mockDb = {
      repository: {
        findMany: vi.fn().mockResolvedValue([{ id: "repo-1", fullName: "org/repo1" }]),
      },
      pipeline: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: "pipeline-1" }),
      },
      importLog: {
        create: vi.fn(),
      },
      dataSourceRun: {
        update: vi.fn().mockResolvedValue({}),
      },
    } as unknown as DbClient;

    const context = {
      id: "ds-123",
      provider: "GITHUB",
      env: { GITHUB_TOKEN: "token123" },
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      runId: "run-123",
    };

    // Act
    await pipelineScript.run(mockDb, context as never);

    // Assert
    expect(mockPaginateIterator).toHaveBeenCalledWith(mockListRepoWorkflows, {
      owner: "org",
      repo: "repo1",
      per_page: 100,
    });
    expect(mockDb.pipeline.create).toHaveBeenCalledTimes(2);
    expect(mockDb.pipeline.create).toHaveBeenNthCalledWith(1, {
      data: {
        name: "CI",
        provider: "GITHUB_ACTIONS",
        repositoryId: "repo-1",
        configPath: ".github/workflows/ci.yml",
        isActive: true,
      },
    });
    expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
      where: { id: "run-123" },
      data: { recordsImported: 2 },
    });
  });

  it("should update existing pipeline", async () => {
    // Arrange
    const mockWorkflows = [
      {
        id: 1,
        name: "CI Updated",
        path: ".github/workflows/ci.yml",
        state: "disabled_manually",
      },
    ];

    mockPaginateIterator.mockReturnValue(
      (async function* () {
        yield { data: mockWorkflows };
      })()
    );

    const mockDb = {
      repository: {
        findMany: vi.fn().mockResolvedValue([{ id: "repo-1", fullName: "org/repo1" }]),
      },
      pipeline: {
        findFirst: vi.fn().mockResolvedValue({ id: "existing-pipeline" }),
        update: vi.fn().mockResolvedValue({}),
      },
      importLog: {
        create: vi.fn(),
      },
      dataSourceRun: {
        update: vi.fn().mockResolvedValue({}),
      },
    } as unknown as DbClient;

    const context = {
      id: "ds-123",
      provider: "GITHUB",
      env: { GITHUB_TOKEN: "token123" },
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      runId: "run-123",
    };

    // Act
    await pipelineScript.run(mockDb, context as never);

    // Assert
    expect(mockDb.pipeline.update).toHaveBeenCalledWith({
      where: { id: "existing-pipeline" },
      data: {
        name: "CI Updated",
        isActive: false,
      },
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
    } as unknown as DbClient;

    const context = {
      id: "ds-123",
      provider: "GITHUB",
      env: { GITHUB_TOKEN: "token123" },
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      runId: "run-123",
    };

    // Act
    await pipelineScript.run(mockDb, context as never);

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
    } as unknown as DbClient;

    const context = {
      id: "ds-123",
      provider: "GITHUB",
      env: { GITHUB_TOKEN: "token123" },
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      runId: "run-123",
    };

    // Act
    await pipelineScript.run(mockDb, context as never);

    // Assert
    expect(mockDb.importLog.create).toHaveBeenCalledWith({
      data: {
        dataSourceRunId: "run-123",
        level: "ERROR",
        message: "Failed to import pipelines for org/repo1: API Error",
        details: null,
      },
    });
    expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
      where: { id: "run-123" },
      data: { recordsImported: 0 },
    });
  });

  it("should only query enabled repositories for this data source", async () => {
    // Arrange
    mockPaginateIterator.mockReturnValue(
      (async function* () {
        yield { data: [] };
      })()
    );

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
    } as unknown as DbClient;

    const context = {
      id: "ds-123",
      provider: "GITHUB",
      env: { GITHUB_TOKEN: "token123" },
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      runId: "run-123",
    };

    // Act
    await pipelineScript.run(mockDb, context as never);

    // Assert
    expect(mockDb.repository.findMany).toHaveBeenCalledWith({
      where: {
        provider: "GITHUB",
        dataSourceId: "ds-123",
        isEnabled: true,
      },
    });
  });
});

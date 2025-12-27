import type { ExecutionContext } from "@crons/orchestrator/script-loader.js";
import type { PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { projectScript } from "./project.js";

const mockGetProjects = vi.fn();

vi.mock("./client.js", () => ({
  createSonarQubeClient: () => ({
    getProjects: mockGetProjects,
    baseUrl: "https://sonarcloud.io",
  }),
}));

function createMockContext(overrides: Partial<ExecutionContext> = {}): ExecutionContext {
  return {
    id: "ds-123",
    runId: "run-123",
    startDate: new Date("2024-01-01"),
    endDate: new Date("2024-01-31"),
    env: {
      SONARQUBE_VARIANT: "cloud",
      SONARQUBE_ORGANIZATION: "test-org",
      SONARQUBE_TOKEN_CLOUD: "token",
    },
    ...overrides,
  } as ExecutionContext;
}

function createMockDb(overrides: Record<string, unknown> = {}) {
  return {
    sonarQubeProjectMapping: {
      upsert: vi.fn().mockResolvedValue({}),
    },
    repository: {
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
    },
    dataSourceRun: {
      update: vi.fn().mockResolvedValue({}),
    },
    importLog: {
      create: vi.fn().mockResolvedValue({}),
    },
    ...overrides,
  } as unknown as PrismaClient;
}

describe("projectScript", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should have correct configuration", () => {
    expect(projectScript.dataSourceName).toBe("SONARQUBE");
    expect(projectScript.resource).toBe("sonarqube-project");
    expect(projectScript.dependsOn).toEqual([]);
    expect(projectScript.importWindowDays).toBe(365);
  });

  it("should have a run function", () => {
    expect(typeof projectScript.run).toBe("function");
  });

  it("should fetch and store projects successfully", async () => {
    const mockProjects = [
      { key: "project-1", name: "Project One", qualifier: "TRK" },
      { key: "project-2", name: "Project Two", qualifier: "TRK" },
    ];

    mockGetProjects.mockResolvedValue(mockProjects);

    const mockDb = createMockDb();
    const context = createMockContext();

    await projectScript.run(mockDb, context);

    expect(mockGetProjects).toHaveBeenCalled();
    expect(mockDb.sonarQubeProjectMapping.upsert).toHaveBeenCalledTimes(2);
    expect(mockDb.sonarQubeProjectMapping.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          dataSourceId_projectKey: {
            dataSourceId: "ds-123",
            projectKey: "project-1",
          },
        },
        create: expect.objectContaining({
          dataSourceId: "ds-123",
          projectKey: "project-1",
          projectName: "Project One",
        }),
      })
    );
    expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
      where: { id: "run-123" },
      data: { recordsImported: 2 },
    });
  });

  it("should handle empty project list", async () => {
    mockGetProjects.mockResolvedValue([]);

    const mockDb = createMockDb();
    const context = createMockContext();

    await projectScript.run(mockDb, context);

    expect(mockDb.sonarQubeProjectMapping.upsert).not.toHaveBeenCalled();
    expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
      where: { id: "run-123" },
      data: { recordsImported: 0 },
    });
  });

  it("should match repository by exact name", async () => {
    const mockProjects = [{ key: "my-repo", name: "My Repo", qualifier: "TRK" }];
    mockGetProjects.mockResolvedValue(mockProjects);

    const mockDb = createMockDb({
      repository: {
        findFirst: vi.fn().mockResolvedValue({ id: "repo-123" }),
        findMany: vi.fn().mockResolvedValue([]),
      },
    });
    const context = createMockContext();

    await projectScript.run(mockDb, context);

    expect(mockDb.sonarQubeProjectMapping.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          repositoryId: "repo-123",
        }),
      })
    );
  });

  it("should match repository by normalized name when exact match fails", async () => {
    const mockProjects = [{ key: "my-repo-name", name: "My Repo Name", qualifier: "TRK" }];
    mockGetProjects.mockResolvedValue(mockProjects);

    const mockDb = createMockDb({
      repository: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([{ id: "repo-456", name: "my_repo_name", fullName: "org/my_repo_name" }]),
      },
    });
    const context = createMockContext();

    await projectScript.run(mockDb, context);

    expect(mockDb.sonarQubeProjectMapping.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          repositoryId: "repo-456",
        }),
      })
    );
  });

  it("should set repositoryId to null when no match found", async () => {
    const mockProjects = [{ key: "unknown-project", name: "Unknown Project", qualifier: "TRK" }];
    mockGetProjects.mockResolvedValue(mockProjects);

    const mockDb = createMockDb({
      repository: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([{ id: "repo-789", name: "different-repo", fullName: "org/different-repo" }]),
      },
    });
    const context = createMockContext();

    await projectScript.run(mockDb, context);

    expect(mockDb.sonarQubeProjectMapping.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          repositoryId: null,
        }),
      })
    );
  });

  it("should handle errors for individual projects and continue", async () => {
    const mockProjects = [
      { key: "project-1", name: "Project 1", qualifier: "TRK" },
      { key: "project-2", name: "Project 2", qualifier: "TRK" },
    ];
    mockGetProjects.mockResolvedValue(mockProjects);

    const upsertMock = vi.fn().mockRejectedValueOnce(new Error("Database error")).mockResolvedValueOnce({});
    const mockDb = createMockDb({
      sonarQubeProjectMapping: {
        upsert: upsertMock,
      },
    });
    const context = createMockContext();

    await projectScript.run(mockDb, context);

    expect(mockDb.sonarQubeProjectMapping.upsert).toHaveBeenCalledTimes(2);
    expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
      where: { id: "run-123" },
      data: { recordsImported: 1 },
    });
  });

  it("should log errors when they occur", async () => {
    const mockProjects = [{ key: "project-1", name: "Project 1", qualifier: "TRK" }];
    mockGetProjects.mockResolvedValue(mockProjects);

    const mockDb = createMockDb({
      sonarQubeProjectMapping: {
        upsert: vi.fn().mockRejectedValue(new Error("Connection failed")),
      },
    });
    const context = createMockContext();

    await projectScript.run(mockDb, context);

    expect(mockDb.importLog.create).toHaveBeenCalledWith({
      data: {
        dataSourceRunId: "run-123",
        level: "ERROR",
        message: "Failed to process project project-1: Connection failed",
        details: null,
      },
    });
  });

  it("should handle non-Error objects in catch", async () => {
    const mockProjects = [{ key: "project-1", name: "Project 1", qualifier: "TRK" }];
    mockGetProjects.mockResolvedValue(mockProjects);

    const mockDb = createMockDb({
      sonarQubeProjectMapping: {
        upsert: vi.fn().mockRejectedValue("String error"),
      },
    });
    const context = createMockContext();

    await projectScript.run(mockDb, context);

    expect(mockDb.importLog.create).toHaveBeenCalledWith({
      data: {
        dataSourceRunId: "run-123",
        level: "ERROR",
        message: "Failed to process project project-1: String error",
        details: null,
      },
    });
  });

  it("should not log errors when none occur", async () => {
    const mockProjects = [{ key: "project-1", name: "Project 1", qualifier: "TRK" }];
    mockGetProjects.mockResolvedValue(mockProjects);

    const mockDb = createMockDb();
    const context = createMockContext();

    await projectScript.run(mockDb, context);

    expect(mockDb.importLog.create).not.toHaveBeenCalled();
  });
});

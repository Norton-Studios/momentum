import type { ExecutionContext } from "@crons/orchestrator/script-loader.js";
import type { PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { projectScript } from "./project.js";

const mockGetProjects = vi.fn();

vi.mock("./client.js", () => ({
  createJiraClient: () => ({
    getProjects: mockGetProjects,
    baseUrl: "https://test.atlassian.net",
  }),
}));

function createMockContext(overrides: Partial<ExecutionContext> = {}): ExecutionContext {
  return {
    id: "ds-123",
    runId: "run-123",
    tenantId: "tenant-123",
    startDate: new Date("2024-01-01"),
    endDate: new Date("2024-01-31"),
    env: {
      JIRA_VARIANT: "cloud",
      JIRA_DOMAIN: "test",
      JIRA_EMAIL: "user@test.com",
      JIRA_API_TOKEN: "token",
    },
    ...overrides,
  };
}

function createMockDb(overrides: Record<string, unknown> = {}) {
  return {
    project: {
      upsert: vi.fn().mockResolvedValue({}),
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
    expect(projectScript.dataSourceName).toBe("JIRA");
    expect(projectScript.resource).toBe("project");
    expect(projectScript.dependsOn).toEqual([]);
    expect(projectScript.importWindowDays).toBe(90);
  });

  it("should have a run function", () => {
    expect(typeof projectScript.run).toBe("function");
  });

  it("should fetch and store projects successfully", async () => {
    const mockProjects = [
      { id: "10001", key: "PROJ", name: "Test Project" },
      { id: "10002", key: "DEV", name: "Dev Project" },
    ];

    mockGetProjects.mockResolvedValue(mockProjects);

    const mockDb = createMockDb();
    const context = createMockContext();

    await projectScript.run(mockDb, context);

    expect(mockGetProjects).toHaveBeenCalled();
    expect(mockDb.project.upsert).toHaveBeenCalledTimes(2);
    expect(mockDb.project.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: "PROJ" },
        create: expect.objectContaining({
          dataSourceId: "ds-123",
          key: "PROJ",
          name: "Test Project",
          externalId: "10001",
          provider: "JIRA",
          isEnabled: true,
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

    expect(mockDb.project.upsert).not.toHaveBeenCalled();
    expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
      where: { id: "run-123" },
      data: { recordsImported: 0 },
    });
  });

  it("should set project URL correctly for Cloud", async () => {
    const mockProjects = [{ id: "10001", key: "PROJ", name: "Test Project" }];
    mockGetProjects.mockResolvedValue(mockProjects);

    const mockDb = createMockDb();
    const context = createMockContext();

    await projectScript.run(mockDb, context);

    expect(mockDb.project.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          url: "https://test.atlassian.net/browse/PROJ",
        }),
      })
    );
  });

  it("should handle errors for individual projects and continue", async () => {
    const mockProjects = [
      { id: "10001", key: "PROJ1", name: "Project 1" },
      { id: "10002", key: "PROJ2", name: "Project 2" },
    ];
    mockGetProjects.mockResolvedValue(mockProjects);

    const mockDb = createMockDb({
      project: {
        upsert: vi.fn().mockRejectedValueOnce(new Error("Database error")).mockResolvedValueOnce({}),
      },
    });
    const context = createMockContext();

    await projectScript.run(mockDb, context);

    expect(mockDb.project.upsert).toHaveBeenCalledTimes(2);
    expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
      where: { id: "run-123" },
      data: { recordsImported: 1 },
    });
  });

  it("should log errors when they occur", async () => {
    const mockProjects = [{ id: "10001", key: "PROJ", name: "Test Project" }];
    mockGetProjects.mockResolvedValue(mockProjects);

    const mockDb = createMockDb({
      project: {
        upsert: vi.fn().mockRejectedValue(new Error("Connection failed")),
      },
    });
    const context = createMockContext();

    await projectScript.run(mockDb, context);

    expect(mockDb.importLog.create).toHaveBeenCalledWith({
      data: {
        dataSourceRunId: "run-123",
        level: "ERROR",
        message: "Failed to import project PROJ: Connection failed",
        details: null,
      },
    });
  });

  it("should handle non-Error objects in catch", async () => {
    const mockProjects = [{ id: "10001", key: "PROJ", name: "Test Project" }];
    mockGetProjects.mockResolvedValue(mockProjects);

    const mockDb = createMockDb({
      project: {
        upsert: vi.fn().mockRejectedValue("String error"),
      },
    });
    const context = createMockContext();

    await projectScript.run(mockDb, context);

    expect(mockDb.importLog.create).toHaveBeenCalledWith({
      data: {
        dataSourceRunId: "run-123",
        level: "ERROR",
        message: "Failed to import project PROJ: String error",
        details: null,
      },
    });
  });

  it("should not log errors when none occur", async () => {
    const mockProjects = [{ id: "10001", key: "PROJ", name: "Test Project" }];
    mockGetProjects.mockResolvedValue(mockProjects);

    const mockDb = createMockDb();
    const context = createMockContext();

    await projectScript.run(mockDb, context);

    expect(mockDb.importLog.create).not.toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DbClient } from "../../db.ts";
import { projectScript } from "./project.js";

describe("projectScript", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should have correct configuration", () => {
    expect(projectScript.dataSourceName).toBe("GITLAB");
    expect(projectScript.resource).toBe("project");
    expect(projectScript.dependsOn).toEqual(["repository"]);
    expect(projectScript.importWindowDays).toBe(365);
  });

  it("should have a run function", () => {
    expect(typeof projectScript.run).toBe("function");
  });

  it("should create projects from repositories", async () => {
    const mockDb = {
      repository: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "repo-1",
            fullName: "group/project1",
            name: "project1",
            url: "https://gitlab.com/group/project1",
            description: "Test project",
          },
        ]),
      },
      project: {
        upsert: vi.fn().mockResolvedValue({}),
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

    await projectScript.run(mockDb, context as never);

    expect(mockDb.repository.findMany).toHaveBeenCalledWith({
      where: {
        provider: "GITLAB",
        dataSourceId: "ds-123",
        isEnabled: true,
      },
    });
    expect(mockDb.project.upsert).toHaveBeenCalledWith({
      where: { key: "group/project1" },
      create: {
        name: "project1",
        key: "group/project1",
        description: "Test project",
        provider: "GITLAB",
        url: "https://gitlab.com/group/project1",
      },
      update: {
        name: "project1",
        description: "Test project",
        url: "https://gitlab.com/group/project1",
      },
    });
    expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
      where: { id: "run-123" },
      data: { recordsImported: 1 },
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

    await projectScript.run(mockDb, context as never);

    expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
      where: { id: "run-123" },
      data: { recordsImported: 0 },
    });
  });

  it("should log errors and continue processing on upsert failure", async () => {
    const mockDb = {
      repository: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "repo-1",
            fullName: "group/project1",
            name: "project1",
            url: null,
            description: null,
          },
        ]),
      },
      project: {
        upsert: vi.fn().mockRejectedValue(new Error("Database error")),
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

    await projectScript.run(mockDb, context as never);

    expect(mockDb.importLog.create).toHaveBeenCalledWith({
      data: {
        dataSourceRunId: "run-123",
        level: "ERROR",
        message: expect.stringContaining("Failed to create project for group/project1"),
        details: null,
      },
    });
  });

  it("should handle multiple repositories", async () => {
    const mockDb = {
      repository: {
        findMany: vi.fn().mockResolvedValue([
          { id: "repo-1", fullName: "group/project1", name: "project1", url: null, description: null },
          { id: "repo-2", fullName: "group/project2", name: "project2", url: null, description: "Second project" },
        ]),
      },
      project: {
        upsert: vi.fn().mockResolvedValue({}),
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

    await projectScript.run(mockDb, context as never);

    expect(mockDb.project.upsert).toHaveBeenCalledTimes(2);
    expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
      where: { id: "run-123" },
      data: { recordsImported: 2 },
    });
  });
});

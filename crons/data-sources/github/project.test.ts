import type { PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { projectScript } from "./project.js";

describe("projectScript", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should have correct configuration", () => {
    expect(projectScript.dataSourceName).toBe("GITHUB");
    expect(projectScript.resource).toBe("project");
    expect(projectScript.dependsOn).toEqual(["repository"]);
    expect(projectScript.importWindowDays).toBe(365);
  });

  it("should have a run function", () => {
    expect(typeof projectScript.run).toBe("function");
  });

  it("should create projects for each repository", async () => {
    // Arrange
    const mockDb = {
      repository: {
        findMany: vi.fn().mockResolvedValue([
          { id: "repo-1", fullName: "org/repo1", name: "repo1", url: "https://github.com/org/repo1", description: "Test repo" },
          { id: "repo-2", fullName: "org/repo2", name: "repo2", url: "https://github.com/org/repo2", description: null },
        ]),
      },
      project: {
        upsert: vi.fn().mockResolvedValue({}),
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
      env: {},
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      runId: "run-123",
    };

    // Act
    await projectScript.run(mockDb, context as never);

    // Assert
    expect(mockDb.project.upsert).toHaveBeenCalledTimes(2);
    expect(mockDb.project.upsert).toHaveBeenNthCalledWith(1, {
      where: { key: "org/repo1" },
      create: {
        name: "repo1",
        key: "org/repo1",
        description: "Test repo",
        provider: "GITHUB",
        url: "https://github.com/org/repo1",
      },
      update: {
        name: "repo1",
        description: "Test repo",
        url: "https://github.com/org/repo1",
      },
    });
    expect(mockDb.project.upsert).toHaveBeenNthCalledWith(2, {
      where: { key: "org/repo2" },
      create: {
        name: "repo2",
        key: "org/repo2",
        description: null,
        provider: "GITHUB",
        url: "https://github.com/org/repo2",
      },
      update: {
        name: "repo2",
        description: null,
        url: "https://github.com/org/repo2",
      },
    });
    expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
      where: { id: "run-123" },
      data: { recordsImported: 2 },
    });
  });

  it("should handle empty repository list", async () => {
    // Arrange
    const mockDb = {
      repository: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      project: {
        upsert: vi.fn(),
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
      env: {},
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      runId: "run-123",
    };

    // Act
    await projectScript.run(mockDb, context as never);

    // Assert
    expect(mockDb.project.upsert).not.toHaveBeenCalled();
    expect(mockDb.importLog.create).not.toHaveBeenCalled();
    expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
      where: { id: "run-123" },
      data: { recordsImported: 0 },
    });
  });

  it("should handle and log errors", async () => {
    // Arrange
    const mockDb = {
      repository: {
        findMany: vi.fn().mockResolvedValue([{ id: "repo-1", fullName: "org/repo1", name: "repo1", url: null, description: null }]),
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
    } as unknown as PrismaClient;

    const context = {
      id: "ds-123",
      provider: "GITHUB",
      env: {},
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      runId: "run-123",
    };

    // Act
    await projectScript.run(mockDb, context as never);

    // Assert
    expect(mockDb.importLog.create).toHaveBeenCalledWith({
      data: {
        dataSourceRunId: "run-123",
        level: "ERROR",
        message: "Failed to create project for org/repo1: Database error",
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
    const mockDb = {
      repository: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      project: {
        upsert: vi.fn(),
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
      env: {},
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      runId: "run-123",
    };

    // Act
    await projectScript.run(mockDb, context as never);

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

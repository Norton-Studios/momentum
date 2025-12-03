import type { PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { repositoryScript } from "./repository.js";

const mockGroupsAllProjects = vi.fn();
const mockProjectsAll = vi.fn();

vi.mock("@gitbeaker/rest", () => ({
  Gitlab: class {
    Groups = {
      allProjects: mockGroupsAllProjects,
    };
    Projects = {
      all: mockProjectsAll,
    };
  },
}));

describe("repositoryScript", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should have correct configuration", () => {
    expect(repositoryScript.dataSourceName).toBe("GITLAB");
    expect(repositoryScript.resource).toBe("repository");
    expect(repositoryScript.dependsOn).toEqual([]);
    expect(repositoryScript.importWindowDays).toBe(365);
  });

  it("should have a run function", () => {
    expect(typeof repositoryScript.run).toBe("function");
  });

  it("should fetch and upsert repositories for a group successfully", async () => {
    // Arrange
    const mockProjects = [
      {
        id: 1,
        name: "project1",
        pathWithNamespace: "group/project1",
        description: "Test project 1",
        webUrl: "https://gitlab.com/group/project1",
        visibility: "private",
        starCount: 100,
        forksCount: 10,
        archived: false,
      },
      {
        id: 2,
        name: "project2",
        pathWithNamespace: "group/project2",
        description: "Test project 2",
        webUrl: "https://gitlab.com/group/project2",
        visibility: "public",
        starCount: 50,
        forksCount: 5,
        archived: true,
      },
    ];

    mockGroupsAllProjects.mockResolvedValue(mockProjects);

    const mockDb = {
      repository: {
        upsert: vi.fn().mockResolvedValue({}),
      },
      dataSourceRun: {
        update: vi.fn().mockResolvedValue({}),
      },
    } as unknown as PrismaClient;

    const context = {
      id: "ds-123",
      provider: "GITLAB",
      env: {
        GITLAB_TOKEN: "token123",
        GITLAB_GROUP: "group",
      },
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      runId: "run-123",
    };

    // Act
    await repositoryScript.run(mockDb, context as never);

    // Assert
    expect(mockGroupsAllProjects).toHaveBeenCalledWith("group", { perPage: 100, includeSubgroups: true });
    expect(mockDb.repository.upsert).toHaveBeenCalledTimes(2);
    expect(mockDb.repository.upsert).toHaveBeenCalledWith({
      where: { fullName: "group/project1" },
      create: {
        dataSourceId: "ds-123",
        name: "project1",
        fullName: "group/project1",
        description: "Test project 1",
        provider: "GITLAB",
        url: "https://gitlab.com/group/project1",
        language: null,
        stars: 100,
        forks: 10,
        isPrivate: true,
        isArchived: false,
        isEnabled: true,
        lastSyncAt: expect.any(Date),
      },
      update: {
        description: "Test project 1",
        stars: 100,
        forks: 10,
        isArchived: false,
        lastSyncAt: expect.any(Date),
      },
    });
    expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
      where: { id: "run-123" },
      data: { recordsImported: 2 },
    });
  });

  it("should fetch projects with membership when no group is specified", async () => {
    // Arrange
    const mockProjects = [
      {
        id: 1,
        name: "my-project",
        pathWithNamespace: "user/my-project",
        description: null,
        webUrl: "https://gitlab.com/user/my-project",
        visibility: "private",
        starCount: 0,
        forksCount: 0,
        archived: false,
      },
    ];

    mockProjectsAll.mockResolvedValue(mockProjects);

    const mockDb = {
      repository: {
        upsert: vi.fn().mockResolvedValue({}),
      },
      dataSourceRun: {
        update: vi.fn().mockResolvedValue({}),
      },
    } as unknown as PrismaClient;

    const context = {
      id: "ds-123",
      provider: "GITLAB",
      env: {
        GITLAB_TOKEN: "token123",
      },
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      runId: "run-123",
    };

    // Act
    await repositoryScript.run(mockDb, context as never);

    // Assert
    expect(mockProjectsAll).toHaveBeenCalledWith({ perPage: 100, membership: true });
    expect(mockDb.repository.upsert).toHaveBeenCalledTimes(1);
  });

  it("should handle empty project list", async () => {
    // Arrange
    mockGroupsAllProjects.mockResolvedValue([]);

    const mockDb = {
      repository: {
        upsert: vi.fn(),
      },
      dataSourceRun: {
        update: vi.fn().mockResolvedValue({}),
      },
    } as unknown as PrismaClient;

    const context = {
      id: "ds-123",
      provider: "GITLAB",
      env: {
        GITLAB_TOKEN: "token123",
        GITLAB_GROUP: "empty-group",
      },
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      runId: "run-123",
    };

    // Act
    await repositoryScript.run(mockDb, context as never);

    // Assert
    expect(mockDb.repository.upsert).not.toHaveBeenCalled();
    expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
      where: { id: "run-123" },
      data: { recordsImported: 0 },
    });
  });
});

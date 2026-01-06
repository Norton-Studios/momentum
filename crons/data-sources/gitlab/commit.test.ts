import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DbClient } from "../../db.ts";
import { commitScript } from "./commit.js";

const mockProjectsShow = vi.fn();
const mockCommitsAll = vi.fn();

vi.mock("@gitbeaker/rest", () => ({
  Gitlab: class {
    Projects = {
      show: mockProjectsShow,
    };
    Commits = {
      all: mockCommitsAll,
    };
  },
}));

describe("commitScript", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should have correct configuration", () => {
    expect(commitScript.dataSourceName).toBe("GITLAB");
    expect(commitScript.resource).toBe("commit");
    expect(commitScript.dependsOn).toEqual(["repository", "contributor"]);
    expect(commitScript.importWindowDays).toBe(90);
  });

  it("should have a run function", () => {
    expect(typeof commitScript.run).toBe("function");
  });

  it("should fetch and upsert commits successfully", async () => {
    // Arrange
    const mockCommits = [
      {
        id: "abc123",
        message: "Initial commit",
        authorEmail: "dev@example.com",
        authorName: "Developer",
        committedDate: "2024-01-15T10:00:00Z",
      },
      {
        id: "def456",
        message: "Add feature",
        authorEmail: "dev@example.com",
        authorName: "Developer",
        committedDate: "2024-01-16T14:00:00Z",
      },
    ];

    mockProjectsShow.mockResolvedValue({ id: 123 });
    mockCommitsAll.mockResolvedValue(mockCommits);

    const mockDb = {
      repository: {
        findMany: vi.fn().mockResolvedValue([{ id: "repo-1", fullName: "group/project1" }]),
      },
      contributor: {
        upsert: vi.fn().mockResolvedValue({ id: "contributor-1" }),
      },
      commit: {
        upsert: vi.fn().mockResolvedValue({}),
      },
      dataSourceRun: {
        update: vi.fn().mockResolvedValue({}),
      },
    } as unknown as DbClient;

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
    await commitScript.run(mockDb, context as never);

    // Assert
    expect(mockDb.repository.findMany).toHaveBeenCalledWith({
      where: {
        provider: "GITLAB",
        dataSourceId: "ds-123",
        isEnabled: true,
      },
    });
    expect(mockProjectsShow).toHaveBeenCalledWith("group/project1");
    expect(mockCommitsAll).toHaveBeenCalledWith(123, {
      since: "2024-01-01T00:00:00.000Z",
      until: "2024-01-31T00:00:00.000Z",
      perPage: 100,
    });
    expect(mockDb.commit.upsert).toHaveBeenCalledTimes(2);
    expect(mockDb.commit.upsert).toHaveBeenCalledWith({
      where: {
        repositoryId_sha: {
          repositoryId: "repo-1",
          sha: "abc123",
        },
      },
      create: {
        sha: "abc123",
        message: "Initial commit",
        authorId: "contributor-1",
        committedAt: expect.any(Date),
        repositoryId: "repo-1",
        linesAdded: 0,
        linesRemoved: 0,
        filesChanged: 0,
      },
      update: {
        message: "Initial commit",
        linesAdded: 0,
        linesRemoved: 0,
        filesChanged: 0,
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
      dataSourceRun: {
        update: vi.fn().mockResolvedValue({}),
      },
    } as unknown as DbClient;

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
    await commitScript.run(mockDb, context as never);

    // Assert
    expect(mockProjectsShow).not.toHaveBeenCalled();
    expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
      where: { id: "run-123" },
      data: { recordsImported: 0 },
    });
  });

  it("should skip commits without author info", async () => {
    // Arrange
    const mockCommits = [
      {
        id: "abc123",
        message: "Commit without author",
        authorEmail: null,
        authorName: null,
        committedDate: "2024-01-15T10:00:00Z",
      },
      {
        id: "def456",
        message: "Valid commit",
        authorEmail: "dev@example.com",
        authorName: "Developer",
        committedDate: "2024-01-16T14:00:00Z",
      },
    ];

    mockProjectsShow.mockResolvedValue({ id: 123 });
    mockCommitsAll.mockResolvedValue(mockCommits);

    const mockDb = {
      repository: {
        findMany: vi.fn().mockResolvedValue([{ id: "repo-1", fullName: "group/project1" }]),
      },
      contributor: {
        upsert: vi.fn().mockResolvedValue({ id: "contributor-1" }),
      },
      commit: {
        upsert: vi.fn().mockResolvedValue({}),
      },
      dataSourceRun: {
        update: vi.fn().mockResolvedValue({}),
      },
    } as unknown as DbClient;

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
    await commitScript.run(mockDb, context as never);

    // Assert
    expect(mockDb.commit.upsert).toHaveBeenCalledTimes(1);
    expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
      where: { id: "run-123" },
      data: { recordsImported: 1 },
    });
  });

  it("should log errors and continue processing on API failure", async () => {
    // Arrange
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
      env: {
        GITLAB_TOKEN: "token123",
      },
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      runId: "run-123",
    };

    // Act
    await commitScript.run(mockDb, context as never);

    // Assert
    expect(mockDb.importLog.create).toHaveBeenCalledWith({
      data: {
        dataSourceRunId: "run-123",
        level: "ERROR",
        message: expect.stringContaining("Failed to import commits for group/project1"),
        details: null,
      },
    });
  });

  it("should skip commits missing committedDate", async () => {
    // Arrange
    const mockCommits = [
      {
        id: "abc123",
        message: "Commit without date",
        authorEmail: "dev@example.com",
        authorName: "Developer",
        committedDate: null,
      },
    ];

    mockProjectsShow.mockResolvedValue({ id: 123 });
    mockCommitsAll.mockResolvedValue(mockCommits);

    const mockDb = {
      repository: {
        findMany: vi.fn().mockResolvedValue([{ id: "repo-1", fullName: "group/project1" }]),
      },
      commit: {
        upsert: vi.fn().mockResolvedValue({}),
      },
      dataSourceRun: {
        update: vi.fn().mockResolvedValue({}),
      },
    } as unknown as DbClient;

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
    await commitScript.run(mockDb, context as never);

    // Assert
    expect(mockDb.commit.upsert).not.toHaveBeenCalled();
    expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
      where: { id: "run-123" },
      data: { recordsImported: 0 },
    });
  });
});

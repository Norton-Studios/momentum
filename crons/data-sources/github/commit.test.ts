import type { PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { commitScript } from "./commit.js";

const mockPaginateIterator = vi.fn();
const mockReposListCommits = vi.fn();

vi.mock("@octokit/rest", () => ({
  Octokit: class {
    repos = {
      listCommits: mockReposListCommits,
    };
    paginate = {
      iterator: mockPaginateIterator,
    };
  },
}));

describe("commitScript", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should have correct configuration", () => {
    expect(commitScript.dataSourceName).toBe("GITHUB");
    expect(commitScript.resource).toBe("commit");
    expect(commitScript.dependsOn).toEqual(["repository", "contributor"]);
    expect(commitScript.importWindowDays).toBe(90);
  });

  it("should have a run function", () => {
    expect(typeof commitScript.run).toBe("function");
  });

  it("should fetch and store commits successfully", async () => {
    // Arrange
    const mockCommits = [
      {
        sha: "abc123",
        commit: {
          author: {
            name: "John Doe",
            email: "john@example.com",
            date: "2024-01-15T10:00:00Z",
          },
          message: "Add feature",
        },
        stats: {
          additions: 100,
          deletions: 20,
        },
        files: [{}, {}],
      },
      {
        sha: "def456",
        commit: {
          author: {
            name: "Jane Smith",
            email: "jane@example.com",
            date: "2024-01-16T14:30:00Z",
          },
          message: "Fix bug",
        },
        stats: {
          additions: 5,
          deletions: 3,
        },
        files: [{}],
      },
    ];

    mockPaginateIterator.mockReturnValue(
      (async function* () {
        yield { data: mockCommits };
      })()
    );

    const mockDb = {
      repository: {
        findMany: vi.fn().mockResolvedValue([{ id: "repo-1", fullName: "org/repo1" }]),
      },
      contributor: {
        upsert: vi.fn().mockResolvedValue({ id: "contributor-1" }),
      },
      commit: {
        upsert: vi.fn().mockResolvedValue({}),
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
      env: {
        GITHUB_TOKEN: "token123",
        GITHUB_ORG: "org",
      },
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      runId: "run-123",
    };

    // Act
    await commitScript.run(mockDb, context as never);

    // Assert
    expect(mockPaginateIterator).toHaveBeenCalledWith(mockReposListCommits, {
      owner: "org",
      repo: "repo1",
      since: "2024-01-01T00:00:00.000Z",
      until: "2024-01-31T00:00:00.000Z",
      per_page: 100,
    });
    expect(mockDb.contributor.upsert).toHaveBeenCalledTimes(2);
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
        message: "Add feature",
        authorId: "contributor-1",
        committedAt: new Date("2024-01-15T10:00:00Z"),
        repositoryId: "repo-1",
        linesAdded: 100,
        linesRemoved: 20,
        filesChanged: 2,
      },
      update: {
        message: "Add feature",
        linesAdded: 100,
        linesRemoved: 20,
        filesChanged: 2,
      },
    });
    expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
      where: { id: "run-123" },
      data: { recordsImported: 2 },
    });
  });

  it("should filter out commits without author info", async () => {
    // Arrange
    const mockCommits = [
      {
        sha: "abc123",
        commit: {
          author: null,
          message: "Commit without author",
        },
      },
      {
        sha: "def456",
        commit: {
          author: {
            name: "John Doe",
            email: "john@example.com",
            date: "2024-01-15T10:00:00Z",
          },
          message: "Valid commit",
        },
      },
    ];

    mockPaginateIterator.mockReturnValue(
      (async function* () {
        yield { data: mockCommits };
      })()
    );

    const mockDb = {
      repository: {
        findMany: vi.fn().mockResolvedValue([{ id: "repo-1", fullName: "org/repo1" }]),
      },
      contributor: {
        upsert: vi.fn().mockResolvedValue({ id: "contributor-1" }),
      },
      commit: {
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
      env: {
        GITHUB_TOKEN: "token123",
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

  it("should handle errors and log them", async () => {
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
      env: {
        GITHUB_TOKEN: "token123",
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
        message: "Failed to import commits for org/repo1: API Error",
        details: null,
      },
    });
    expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
      where: { id: "run-123" },
      data: { recordsImported: 0 },
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
      env: {
        GITHUB_TOKEN: "token123",
      },
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      runId: "run-123",
    };

    // Act
    await commitScript.run(mockDb, context as never);

    // Assert
    expect(mockDb.importLog.create).not.toHaveBeenCalled();
    expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
      where: { id: "run-123" },
      data: { recordsImported: 0 },
    });
  });
});

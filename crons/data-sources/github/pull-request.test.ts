import type { PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { pullRequestScript } from "./pull-request.js";

const mockPaginateIterator = vi.fn();
const mockPullsList = vi.fn();

vi.mock("@octokit/rest", () => ({
  Octokit: class {
    pulls = {
      list: mockPullsList,
    };
    paginate = {
      iterator: mockPaginateIterator,
    };
  },
}));

describe("pullRequestScript", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should have correct configuration", () => {
    expect(pullRequestScript.dataSourceName).toBe("GITHUB");
    expect(pullRequestScript.resource).toBe("pull-request");
    expect(pullRequestScript.dependsOn).toEqual(["repository", "contributor"]);
    expect(pullRequestScript.importWindowDays).toBe(90);
  });

  it("should have a run function", () => {
    expect(typeof pullRequestScript.run).toBe("function");
  });

  it("should fetch and store pull requests successfully", async () => {
    // Arrange
    const mockPRs = [
      {
        number: 1,
        title: "Feature PR",
        body: "Add new feature",
        state: "open",
        draft: false,
        merged_at: null,
        closed_at: null,
        updated_at: "2024-01-15T10:00:00Z",
        user: {
          login: "user1",
          email: "user1@example.com",
        },
        assignee: null,
        head: { ref: "feature-branch" },
        base: { ref: "main" },
        html_url: "https://github.com/org/repo1/pull/1",
      },
    ];

    mockPaginateIterator.mockReturnValue(
      (async function* () {
        yield { data: mockPRs };
      })()
    );

    const mockDb = {
      repository: {
        findMany: vi.fn().mockResolvedValue([{ id: "repo-1", fullName: "org/repo1" }]),
      },
      contributor: {
        upsert: vi.fn().mockResolvedValue({ id: "contributor-1" }),
      },
      pullRequest: {
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
    await pullRequestScript.run(mockDb, context as never);

    // Assert
    expect(mockPaginateIterator).toHaveBeenCalledWith(mockPullsList, {
      owner: "org",
      repo: "repo1",
      state: "all",
      sort: "updated",
      direction: "desc",
      per_page: 100,
    });
    expect(mockDb.contributor.upsert).toHaveBeenCalled();
    expect(mockDb.pullRequest.upsert).toHaveBeenCalledWith({
      where: {
        repositoryId_number: {
          repositoryId: "repo-1",
          number: 1,
        },
      },
      create: expect.objectContaining({
        number: 1,
        title: "Feature PR",
        state: "OPEN",
        sourceBranch: "feature-branch",
        targetBranch: "main",
      }),
      update: expect.objectContaining({
        title: "Feature PR",
        state: "OPEN",
      }),
    });
    expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
      where: { id: "run-123" },
      data: { recordsImported: 1 },
    });
  });

  it("should map PR states correctly", async () => {
    // Arrange
    const mockPRs = [
      {
        number: 1,
        title: "Draft PR",
        body: "",
        state: "open",
        draft: true,
        merged_at: null,
        closed_at: null,
        updated_at: "2024-01-15T10:00:00Z",
        user: { login: "user1" },
        assignee: null,
        head: { ref: "feat" },
        base: { ref: "main" },
        html_url: "https://github.com/org/repo1/pull/1",
      },
      {
        number: 2,
        title: "Merged PR",
        body: "",
        state: "closed",
        draft: false,
        merged_at: "2024-01-16T10:00:00Z",
        closed_at: "2024-01-16T10:00:00Z",
        updated_at: "2024-01-16T10:00:00Z",
        user: { login: "user2" },
        assignee: null,
        head: { ref: "feat2" },
        base: { ref: "main" },
        html_url: "https://github.com/org/repo1/pull/2",
      },
      {
        number: 3,
        title: "Closed PR",
        body: "",
        state: "closed",
        draft: false,
        merged_at: null,
        closed_at: "2024-01-17T10:00:00Z",
        updated_at: "2024-01-17T10:00:00Z",
        user: { login: "user3" },
        assignee: null,
        head: { ref: "feat3" },
        base: { ref: "main" },
        html_url: "https://github.com/org/repo1/pull/3",
      },
    ];

    mockPaginateIterator.mockReturnValue(
      (async function* () {
        yield { data: mockPRs };
      })()
    );

    const mockDb = {
      repository: {
        findMany: vi.fn().mockResolvedValue([{ id: "repo-1", fullName: "org/repo1" }]),
      },
      contributor: {
        upsert: vi.fn().mockResolvedValue({ id: "contributor-1" }),
      },
      pullRequest: {
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
    await pullRequestScript.run(mockDb, context as never);

    // Assert
    expect(mockDb.pullRequest.upsert).toHaveBeenCalledTimes(3);
    expect(mockDb.pullRequest.upsert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        create: expect.objectContaining({ state: "DRAFT" }),
      })
    );
    expect(mockDb.pullRequest.upsert).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        create: expect.objectContaining({ state: "MERGED" }),
      })
    );
    expect(mockDb.pullRequest.upsert).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        create: expect.objectContaining({ state: "CLOSED" }),
      })
    );
  });

  it("should filter PRs by date range", async () => {
    // Arrange
    const mockPRs = [
      {
        number: 1,
        title: "In range",
        body: "",
        state: "open",
        draft: false,
        merged_at: null,
        closed_at: null,
        updated_at: "2024-01-15T10:00:00Z",
        user: { login: "user1" },
        assignee: null,
        head: { ref: "feat" },
        base: { ref: "main" },
        html_url: "https://github.com/org/repo1/pull/1",
      },
      {
        number: 2,
        title: "Out of range",
        body: "",
        state: "open",
        draft: false,
        merged_at: null,
        closed_at: null,
        updated_at: "2023-12-15T10:00:00Z",
        user: { login: "user2" },
        assignee: null,
        head: { ref: "feat2" },
        base: { ref: "main" },
        html_url: "https://github.com/org/repo1/pull/2",
      },
    ];

    mockPaginateIterator.mockReturnValue(
      (async function* () {
        yield { data: mockPRs };
      })()
    );

    const mockDb = {
      repository: {
        findMany: vi.fn().mockResolvedValue([{ id: "repo-1", fullName: "org/repo1" }]),
      },
      contributor: {
        upsert: vi.fn().mockResolvedValue({ id: "contributor-1" }),
      },
      pullRequest: {
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
    await pullRequestScript.run(mockDb, context as never);

    // Assert
    expect(mockDb.pullRequest.upsert).toHaveBeenCalledTimes(1);
    expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
      where: { id: "run-123" },
      data: { recordsImported: 1 },
    });
  });

  it("should handle assignees correctly", async () => {
    // Arrange
    const mockPRs = [
      {
        number: 1,
        title: "PR with assignee",
        body: "",
        state: "open",
        draft: false,
        merged_at: null,
        closed_at: null,
        updated_at: "2024-01-15T10:00:00Z",
        user: { login: "user1" },
        assignee: {
          login: "assignee1",
          email: "assignee1@example.com",
        },
        head: { ref: "feat" },
        base: { ref: "main" },
        html_url: "https://github.com/org/repo1/pull/1",
      },
    ];

    mockPaginateIterator.mockReturnValue(
      (async function* () {
        yield { data: mockPRs };
      })()
    );

    const mockDb = {
      repository: {
        findMany: vi.fn().mockResolvedValue([{ id: "repo-1", fullName: "org/repo1" }]),
      },
      contributor: {
        upsert: vi.fn().mockResolvedValueOnce({ id: "contributor-1" }).mockResolvedValueOnce({ id: "contributor-2" }),
      },
      pullRequest: {
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
    await pullRequestScript.run(mockDb, context as never);

    // Assert
    expect(mockDb.contributor.upsert).toHaveBeenCalledTimes(2);
    expect(mockDb.pullRequest.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          authorId: "contributor-1",
          assigneeId: "contributor-2",
        }),
      })
    );
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
    await pullRequestScript.run(mockDb, context as never);

    // Assert
    expect(mockDb.importLog.create).toHaveBeenCalledWith({
      data: {
        dataSourceRunId: "run-123",
        level: "ERROR",
        message: "Failed to import pull requests for org/repo1: API Error",
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
    await pullRequestScript.run(mockDb, context as never);

    // Assert
    expect(mockDb.importLog.create).not.toHaveBeenCalled();
    expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
      where: { id: "run-123" },
      data: { recordsImported: 0 },
    });
  });

  it("should stop pagination when PRs are too old", async () => {
    // Arrange
    const oldPR = {
      number: 999,
      title: "Very old PR",
      body: "",
      state: "closed",
      draft: false,
      merged_at: null,
      closed_at: "2020-01-01T10:00:00Z",
      updated_at: "2020-01-01T10:00:00Z",
      user: { login: "user1" },
      assignee: null,
      head: { ref: "feat" },
      base: { ref: "main" },
      html_url: "https://github.com/org/repo1/pull/999",
    };

    let iterations = 0;
    mockPaginateIterator.mockReturnValue(
      (async function* () {
        iterations++;
        yield { data: [oldPR] };
        if (iterations < 5) {
          yield { data: [oldPR] };
        }
      })()
    );

    const mockDb = {
      repository: {
        findMany: vi.fn().mockResolvedValue([{ id: "repo-1", fullName: "org/repo1" }]),
      },
      contributor: {
        upsert: vi.fn().mockResolvedValue({ id: "contributor-1" }),
      },
      pullRequest: {
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
    await pullRequestScript.run(mockDb, context as never);

    // Assert
    expect(mockDb.pullRequest.upsert).not.toHaveBeenCalled();
    expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
      where: { id: "run-123" },
      data: { recordsImported: 0 },
    });
  });
});

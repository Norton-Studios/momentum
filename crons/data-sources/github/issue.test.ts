import type { PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { issueScript } from "./issue.js";

const mockPaginateIterator = vi.fn();
const mockIssuesListForRepo = vi.fn();

vi.mock("@octokit/rest", () => ({
  Octokit: class {
    issues = {
      listForRepo: mockIssuesListForRepo,
    };
    paginate = {
      iterator: mockPaginateIterator,
    };
  },
}));

describe("issueScript", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should have correct configuration", () => {
    expect(issueScript.dataSourceName).toBe("GITHUB");
    expect(issueScript.resource).toBe("issue");
    expect(issueScript.dependsOn).toEqual(["repository", "contributor", "project"]);
    expect(issueScript.importWindowDays).toBe(90);
  });

  it("should have a run function", () => {
    expect(typeof issueScript.run).toBe("function");
  });

  it("should fetch and store issues successfully", async () => {
    // Arrange
    const mockIssues = [
      {
        number: 1,
        title: "Bug report",
        body: "Something is broken",
        state: "open",
        updated_at: "2024-01-15T10:00:00Z",
        closed_at: null,
        html_url: "https://github.com/org/repo1/issues/1",
        user: { login: "reporter1", email: "reporter1@example.com" },
        assignee: { login: "assignee1", email: "assignee1@example.com" },
        labels: [{ name: "bug" }],
      },
    ];

    mockPaginateIterator.mockReturnValue(
      (async function* () {
        yield { data: mockIssues };
      })()
    );

    const mockDb = {
      repository: {
        findMany: vi.fn().mockResolvedValue([{ id: "repo-1", fullName: "org/repo1" }]),
      },
      project: {
        findUnique: vi.fn().mockResolvedValue({ id: "project-1", key: "org/repo1" }),
      },
      contributor: {
        upsert: vi.fn().mockResolvedValueOnce({ id: "contributor-1" }).mockResolvedValueOnce({ id: "contributor-2" }),
      },
      issue: {
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
      env: { GITHUB_TOKEN: "token123" },
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      runId: "run-123",
    };

    // Act
    await issueScript.run(mockDb, context as never);

    // Assert
    expect(mockPaginateIterator).toHaveBeenCalledWith(mockIssuesListForRepo, {
      owner: "org",
      repo: "repo1",
      state: "all",
      sort: "updated",
      direction: "desc",
      per_page: 100,
    });
    expect(mockDb.contributor.upsert).toHaveBeenCalledTimes(2);
    expect(mockDb.issue.upsert).toHaveBeenCalledWith({
      where: { key: "org/repo1#1" },
      create: expect.objectContaining({
        projectId: "project-1",
        key: "org/repo1#1",
        title: "Bug report",
        description: "Something is broken",
        type: "BUG",
        status: "TODO",
        priority: "MEDIUM",
        reporterId: "contributor-1",
        assigneeId: "contributor-2",
      }),
      update: expect.objectContaining({
        title: "Bug report",
        type: "BUG",
        status: "TODO",
      }),
    });
    expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
      where: { id: "run-123" },
      data: { recordsImported: 1 },
    });
  });

  it("should infer issue types from labels correctly", async () => {
    // Arrange
    const mockIssues = [
      {
        number: 1,
        title: "Bug",
        body: "",
        state: "open",
        updated_at: "2024-01-15T10:00:00Z",
        closed_at: null,
        html_url: "https://github.com/org/repo1/issues/1",
        user: { login: "user1" },
        assignee: null,
        labels: [{ name: "bug" }],
      },
      {
        number: 2,
        title: "Feature",
        body: "",
        state: "open",
        updated_at: "2024-01-15T10:00:00Z",
        closed_at: null,
        html_url: "https://github.com/org/repo1/issues/2",
        user: { login: "user1" },
        assignee: null,
        labels: [{ name: "enhancement" }],
      },
      {
        number: 3,
        title: "Task",
        body: "",
        state: "open",
        updated_at: "2024-01-15T10:00:00Z",
        closed_at: null,
        html_url: "https://github.com/org/repo1/issues/3",
        user: { login: "user1" },
        assignee: null,
        labels: [],
      },
    ];

    mockPaginateIterator.mockReturnValue(
      (async function* () {
        yield { data: mockIssues };
      })()
    );

    const mockDb = {
      repository: {
        findMany: vi.fn().mockResolvedValue([{ id: "repo-1", fullName: "org/repo1" }]),
      },
      project: {
        findUnique: vi.fn().mockResolvedValue({ id: "project-1", key: "org/repo1" }),
      },
      contributor: {
        upsert: vi.fn().mockResolvedValue({ id: "contributor-1" }),
      },
      issue: {
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
      env: { GITHUB_TOKEN: "token123" },
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      runId: "run-123",
    };

    // Act
    await issueScript.run(mockDb, context as never);

    // Assert
    expect(mockDb.issue.upsert).toHaveBeenCalledTimes(3);
    expect(mockDb.issue.upsert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        create: expect.objectContaining({ type: "BUG" }),
      })
    );
    expect(mockDb.issue.upsert).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        create: expect.objectContaining({ type: "FEATURE" }),
      })
    );
    expect(mockDb.issue.upsert).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        create: expect.objectContaining({ type: "TASK" }),
      })
    );
  });

  it("should infer priority from labels correctly", async () => {
    // Arrange
    const mockIssues = [
      {
        number: 1,
        title: "Critical",
        body: "",
        state: "open",
        updated_at: "2024-01-15T10:00:00Z",
        closed_at: null,
        html_url: "https://github.com/org/repo1/issues/1",
        user: { login: "user1" },
        assignee: null,
        labels: [{ name: "critical" }],
      },
      {
        number: 2,
        title: "High Priority",
        body: "",
        state: "open",
        updated_at: "2024-01-15T10:00:00Z",
        closed_at: null,
        html_url: "https://github.com/org/repo1/issues/2",
        user: { login: "user1" },
        assignee: null,
        labels: [{ name: "high priority" }],
      },
      {
        number: 3,
        title: "Low",
        body: "",
        state: "open",
        updated_at: "2024-01-15T10:00:00Z",
        closed_at: null,
        html_url: "https://github.com/org/repo1/issues/3",
        user: { login: "user1" },
        assignee: null,
        labels: [{ name: "low" }],
      },
    ];

    mockPaginateIterator.mockReturnValue(
      (async function* () {
        yield { data: mockIssues };
      })()
    );

    const mockDb = {
      repository: {
        findMany: vi.fn().mockResolvedValue([{ id: "repo-1", fullName: "org/repo1" }]),
      },
      project: {
        findUnique: vi.fn().mockResolvedValue({ id: "project-1", key: "org/repo1" }),
      },
      contributor: {
        upsert: vi.fn().mockResolvedValue({ id: "contributor-1" }),
      },
      issue: {
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
      env: { GITHUB_TOKEN: "token123" },
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      runId: "run-123",
    };

    // Act
    await issueScript.run(mockDb, context as never);

    // Assert
    expect(mockDb.issue.upsert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        create: expect.objectContaining({ priority: "CRITICAL" }),
      })
    );
    expect(mockDb.issue.upsert).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        create: expect.objectContaining({ priority: "HIGH" }),
      })
    );
    expect(mockDb.issue.upsert).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        create: expect.objectContaining({ priority: "LOW" }),
      })
    );
  });

  it("should map closed issues to DONE status", async () => {
    // Arrange
    const mockIssues = [
      {
        number: 1,
        title: "Closed issue",
        body: "",
        state: "closed",
        updated_at: "2024-01-15T10:00:00Z",
        closed_at: "2024-01-14T10:00:00Z",
        html_url: "https://github.com/org/repo1/issues/1",
        user: { login: "user1" },
        assignee: null,
        labels: [],
      },
    ];

    mockPaginateIterator.mockReturnValue(
      (async function* () {
        yield { data: mockIssues };
      })()
    );

    const mockDb = {
      repository: {
        findMany: vi.fn().mockResolvedValue([{ id: "repo-1", fullName: "org/repo1" }]),
      },
      project: {
        findUnique: vi.fn().mockResolvedValue({ id: "project-1", key: "org/repo1" }),
      },
      contributor: {
        upsert: vi.fn().mockResolvedValue({ id: "contributor-1" }),
      },
      issue: {
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
      env: { GITHUB_TOKEN: "token123" },
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      runId: "run-123",
    };

    // Act
    await issueScript.run(mockDb, context as never);

    // Assert
    expect(mockDb.issue.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          status: "DONE",
          resolvedAt: new Date("2024-01-14T10:00:00Z"),
        }),
      })
    );
  });

  it("should filter out pull requests from issues list", async () => {
    // Arrange
    const mockData = [
      {
        number: 1,
        title: "Real issue",
        body: "",
        state: "open",
        updated_at: "2024-01-15T10:00:00Z",
        closed_at: null,
        html_url: "https://github.com/org/repo1/issues/1",
        user: { login: "user1" },
        assignee: null,
        labels: [],
      },
      {
        number: 2,
        title: "Pull request",
        body: "",
        state: "open",
        updated_at: "2024-01-15T10:00:00Z",
        closed_at: null,
        html_url: "https://github.com/org/repo1/pull/2",
        user: { login: "user1" },
        assignee: null,
        labels: [],
        pull_request: { url: "..." },
      },
    ];

    mockPaginateIterator.mockReturnValue(
      (async function* () {
        yield { data: mockData };
      })()
    );

    const mockDb = {
      repository: {
        findMany: vi.fn().mockResolvedValue([{ id: "repo-1", fullName: "org/repo1" }]),
      },
      project: {
        findUnique: vi.fn().mockResolvedValue({ id: "project-1", key: "org/repo1" }),
      },
      contributor: {
        upsert: vi.fn().mockResolvedValue({ id: "contributor-1" }),
      },
      issue: {
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
      env: { GITHUB_TOKEN: "token123" },
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      runId: "run-123",
    };

    // Act
    await issueScript.run(mockDb, context as never);

    // Assert
    expect(mockDb.issue.upsert).toHaveBeenCalledTimes(1);
    expect(mockDb.issue.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: "org/repo1#1" },
      })
    );
  });

  it("should handle missing project gracefully", async () => {
    // Arrange
    mockPaginateIterator.mockReturnValue(
      (async function* () {
        yield { data: [] };
      })()
    );

    const mockDb = {
      repository: {
        findMany: vi.fn().mockResolvedValue([{ id: "repo-1", fullName: "org/repo1" }]),
      },
      project: {
        findUnique: vi.fn().mockResolvedValue(null),
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
      env: { GITHUB_TOKEN: "token123" },
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      runId: "run-123",
    };

    // Act
    await issueScript.run(mockDb, context as never);

    // Assert
    expect(mockDb.importLog.create).toHaveBeenCalledWith({
      data: {
        dataSourceRunId: "run-123",
        level: "ERROR",
        message: "Project not found for repository org/repo1",
        details: null,
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
    } as unknown as PrismaClient;

    const context = {
      id: "ds-123",
      provider: "GITHUB",
      env: { GITHUB_TOKEN: "token123" },
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      runId: "run-123",
    };

    // Act
    await issueScript.run(mockDb, context as never);

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
      project: {
        findUnique: vi.fn().mockResolvedValue({ id: "project-1", key: "org/repo1" }),
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
      env: { GITHUB_TOKEN: "token123" },
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      runId: "run-123",
    };

    // Act
    await issueScript.run(mockDb, context as never);

    // Assert
    expect(mockDb.importLog.create).toHaveBeenCalledWith({
      data: {
        dataSourceRunId: "run-123",
        level: "ERROR",
        message: "Failed to import issues for org/repo1: API Error",
        details: null,
      },
    });
    expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
      where: { id: "run-123" },
      data: { recordsImported: 0 },
    });
  });

  it("should filter issues by date range", async () => {
    // Arrange
    const mockIssues = [
      {
        number: 1,
        title: "In range",
        body: "",
        state: "open",
        updated_at: "2024-01-15T10:00:00Z",
        closed_at: null,
        html_url: "https://github.com/org/repo1/issues/1",
        user: { login: "user1" },
        assignee: null,
        labels: [],
      },
      {
        number: 2,
        title: "Out of range",
        body: "",
        state: "open",
        updated_at: "2023-12-15T10:00:00Z",
        closed_at: null,
        html_url: "https://github.com/org/repo1/issues/2",
        user: { login: "user1" },
        assignee: null,
        labels: [],
      },
    ];

    mockPaginateIterator.mockReturnValue(
      (async function* () {
        yield { data: mockIssues };
      })()
    );

    const mockDb = {
      repository: {
        findMany: vi.fn().mockResolvedValue([{ id: "repo-1", fullName: "org/repo1" }]),
      },
      project: {
        findUnique: vi.fn().mockResolvedValue({ id: "project-1", key: "org/repo1" }),
      },
      contributor: {
        upsert: vi.fn().mockResolvedValue({ id: "contributor-1" }),
      },
      issue: {
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
      env: { GITHUB_TOKEN: "token123" },
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      runId: "run-123",
    };

    // Act
    await issueScript.run(mockDb, context as never);

    // Assert
    expect(mockDb.issue.upsert).toHaveBeenCalledTimes(1);
    expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
      where: { id: "run-123" },
      data: { recordsImported: 1 },
    });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DbClient } from "../../db.ts";
import { pullRequestReviewScript } from "./pull-request-review.js";

const mockPaginateIterator = vi.fn();
const mockPullsListReviews = vi.fn();

vi.mock("@octokit/rest", () => ({
  Octokit: class {
    pulls = {
      listReviews: mockPullsListReviews,
    };
    paginate = {
      iterator: mockPaginateIterator,
    };
  },
}));

describe("pullRequestReviewScript", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should have correct configuration", () => {
    expect(pullRequestReviewScript.dataSourceName).toBe("GITHUB");
    expect(pullRequestReviewScript.resource).toBe("pull-request-review");
    expect(pullRequestReviewScript.dependsOn).toEqual(["pull-request", "contributor"]);
    expect(pullRequestReviewScript.importWindowDays).toBe(90);
  });

  it("should have a run function", () => {
    expect(typeof pullRequestReviewScript.run).toBe("function");
  });

  it("should fetch and store reviews successfully", async () => {
    const mockReviews = [
      {
        id: 123,
        user: { login: "reviewer1", email: "reviewer1@example.com" },
        state: "APPROVED",
        body: "LGTM!",
        submitted_at: "2024-01-15T10:00:00Z",
      },
      {
        id: 456,
        user: { login: "reviewer2", email: null },
        state: "CHANGES_REQUESTED",
        body: "Please fix the bug",
        submitted_at: "2024-01-16T14:30:00Z",
      },
    ];

    mockPaginateIterator.mockReturnValue(
      (async function* () {
        yield { data: mockReviews };
      })()
    );

    const mockDb = {
      pullRequest: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "pr-1",
            number: 42,
            repository: { fullName: "org/repo1" },
          },
        ]),
      },
      contributor: {
        upsert: vi.fn().mockResolvedValue({ id: "contributor-1" }),
      },
      pullRequestReview: {
        upsert: vi.fn().mockResolvedValue({}),
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
      env: {
        GITHUB_TOKEN: "token123",
      },
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      runId: "run-123",
    };

    await pullRequestReviewScript.run(mockDb, context as never);

    expect(mockPaginateIterator).toHaveBeenCalledWith(mockPullsListReviews, {
      owner: "org",
      repo: "repo1",
      pull_number: 42,
      per_page: 100,
    });
    expect(mockDb.contributor.upsert).toHaveBeenCalledTimes(2);
    expect(mockDb.pullRequestReview.upsert).toHaveBeenCalledTimes(2);
    expect(mockDb.pullRequestReview.upsert).toHaveBeenCalledWith({
      where: {
        id: "github-123",
      },
      create: {
        id: "github-123",
        pullRequestId: "pr-1",
        reviewerId: "contributor-1",
        state: "APPROVED",
        body: "LGTM!",
        commentsCount: 0,
        submittedAt: new Date("2024-01-15T10:00:00Z"),
      },
      update: {
        state: "APPROVED",
        body: "LGTM!",
      },
    });
    expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
      where: { id: "run-123" },
      data: { recordsImported: 2 },
    });
  });

  it("should skip reviews with PENDING state", async () => {
    const mockReviews = [
      {
        id: 123,
        user: { login: "reviewer1" },
        state: "PENDING",
        body: "WIP",
        submitted_at: "2024-01-15T10:00:00Z",
      },
      {
        id: 456,
        user: { login: "reviewer2" },
        state: "APPROVED",
        body: "LGTM!",
        submitted_at: "2024-01-16T14:30:00Z",
      },
    ];

    mockPaginateIterator.mockReturnValue(
      (async function* () {
        yield { data: mockReviews };
      })()
    );

    const mockDb = {
      pullRequest: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "pr-1",
            number: 42,
            repository: { fullName: "org/repo1" },
          },
        ]),
      },
      contributor: {
        upsert: vi.fn().mockResolvedValue({ id: "contributor-1" }),
      },
      pullRequestReview: {
        upsert: vi.fn().mockResolvedValue({}),
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
      env: {
        GITHUB_TOKEN: "token123",
      },
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      runId: "run-123",
    };

    await pullRequestReviewScript.run(mockDb, context as never);

    expect(mockDb.pullRequestReview.upsert).toHaveBeenCalledTimes(1);
    expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
      where: { id: "run-123" },
      data: { recordsImported: 1 },
    });
  });

  it("should handle reviews without user info", async () => {
    const mockReviews = [
      {
        id: 123,
        user: null,
        state: "APPROVED",
        body: "LGTM!",
        submitted_at: "2024-01-15T10:00:00Z",
      },
    ];

    mockPaginateIterator.mockReturnValue(
      (async function* () {
        yield { data: mockReviews };
      })()
    );

    const mockDb = {
      pullRequest: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "pr-1",
            number: 42,
            repository: { fullName: "org/repo1" },
          },
        ]),
      },
      contributor: {
        upsert: vi.fn().mockResolvedValue({ id: "contributor-1" }),
      },
      pullRequestReview: {
        upsert: vi.fn().mockResolvedValue({}),
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
      env: {
        GITHUB_TOKEN: "token123",
      },
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      runId: "run-123",
    };

    await pullRequestReviewScript.run(mockDb, context as never);

    expect(mockDb.pullRequestReview.upsert).not.toHaveBeenCalled();
    expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
      where: { id: "run-123" },
      data: { recordsImported: 0 },
    });
  });

  it("should handle errors and log them", async () => {
    mockPaginateIterator.mockImplementation(() => {
      throw new Error("API Error");
    });

    const mockDb = {
      pullRequest: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "pr-1",
            number: 42,
            repository: { fullName: "org/repo1" },
          },
        ]),
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
      env: {
        GITHUB_TOKEN: "token123",
      },
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      runId: "run-123",
    };

    await pullRequestReviewScript.run(mockDb, context as never);

    expect(mockDb.importLog.create).toHaveBeenCalledWith({
      data: {
        dataSourceRunId: "run-123",
        level: "ERROR",
        message: "Failed to import reviews for PR #42 in org/repo1: API Error",
        details: null,
      },
    });
    expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
      where: { id: "run-123" },
      data: { recordsImported: 0 },
    });
  });

  it("should handle empty pull request list", async () => {
    const mockDb = {
      pullRequest: {
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
      env: {
        GITHUB_TOKEN: "token123",
      },
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      runId: "run-123",
    };

    await pullRequestReviewScript.run(mockDb, context as never);

    expect(mockDb.importLog.create).not.toHaveBeenCalled();
    expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
      where: { id: "run-123" },
      data: { recordsImported: 0 },
    });
  });
});

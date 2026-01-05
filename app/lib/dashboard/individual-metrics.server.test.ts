import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("~/db.server", () => ({
  db: {
    contributor: { findMany: vi.fn() },
    commit: { findMany: vi.fn(), count: vi.fn() },
    pullRequest: { findMany: vi.fn(), count: vi.fn(), findFirst: vi.fn() },
    pullRequestReview: { findMany: vi.fn(), count: vi.fn() },
  },
}));

import { db } from "~/db.server";
import {
  fetchAchievements,
  fetchCommitMetrics,
  fetchContributors,
  fetchDistributions,
  fetchHeatmapData,
  fetchPullRequestMetrics,
  fetchReviewMetrics,
  fetchStreakData,
} from "./individual-metrics.server";

const createDateRange = (days: number) => {
  const endDate = new Date("2025-01-15T23:59:59.999Z");
  const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
  return { startDate, endDate, preset: "30d" as const };
};

describe("fetchContributors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns contributors from database", async () => {
    const mockContributors = [
      { id: "1", name: "Jane Smith", username: "janesmith", avatarUrl: "https://example.com/jane.jpg" },
      { id: "2", name: "John Doe", username: "johndoe", avatarUrl: null },
    ];
    vi.mocked(db.contributor.findMany).mockResolvedValue(mockContributors as never);

    const result = await fetchContributors();

    expect(result).toEqual(mockContributors);
    expect(db.contributor.findMany).toHaveBeenCalledWith({
      select: { id: true, name: true, username: true, avatarUrl: true },
      orderBy: { name: "asc" },
    });
  });
});

describe("fetchCommitMetrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns commit metrics with totals", async () => {
    const dateRange = createDateRange(7);
    const mockCommits = [
      { committedAt: new Date("2025-01-10"), linesAdded: 100, linesRemoved: 20, filesChanged: 5 },
      { committedAt: new Date("2025-01-11"), linesAdded: 50, linesRemoved: 10, filesChanged: 3 },
    ];
    vi.mocked(db.commit.findMany).mockResolvedValue(mockCommits as never);

    const result = await fetchCommitMetrics("contributor-1", dateRange);

    expect(result.total).toBe(2);
    expect(result.linesAdded).toBe(150);
    expect(result.linesRemoved).toBe(30);
    expect(result.filesChanged).toBe(8);
    expect(result.dailyAverage).toBeGreaterThan(0);
    expect(result.chart).toBeDefined();
  });

  it("returns zero daily average when no commits", async () => {
    const dateRange = createDateRange(7);
    vi.mocked(db.commit.findMany).mockResolvedValue([]);

    const result = await fetchCommitMetrics("contributor-1", dateRange);

    expect(result.total).toBe(0);
    expect(result.dailyAverage).toBe(0);
  });
});

describe("fetchPullRequestMetrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns PR metrics with merge rate", async () => {
    const dateRange = createDateRange(30);
    const mockPRs = [
      { id: "1", state: "MERGED", createdAt: new Date("2025-01-10"), iterationCount: 2 },
      { id: "2", state: "OPEN", createdAt: new Date("2025-01-11"), iterationCount: 1 },
    ];
    vi.mocked(db.pullRequest.findMany).mockResolvedValue(mockPRs as never);
    vi.mocked(db.pullRequest.count).mockResolvedValue(1);

    const result = await fetchPullRequestMetrics("contributor-1", dateRange);

    expect(result.created).toBe(2);
    expect(result.merged).toBe(1);
    expect(result.mergeRate).toBe(50);
    expect(result.avgIterations).toBe(1.5);
  });

  it("returns null metrics when no PRs", async () => {
    const dateRange = createDateRange(30);
    vi.mocked(db.pullRequest.findMany).mockResolvedValue([]);
    vi.mocked(db.pullRequest.count).mockResolvedValue(0);

    const result = await fetchPullRequestMetrics("contributor-1", dateRange);

    expect(result.mergeRate).toBeNull();
    expect(result.avgIterations).toBeNull();
  });
});

describe("fetchReviewMetrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns review metrics with avg time", async () => {
    const dateRange = createDateRange(30);
    const mockReviews = [
      {
        submittedAt: new Date("2025-01-10T12:00:00Z"),
        pullRequest: { createdAt: new Date("2025-01-10T08:00:00Z") },
      },
      {
        submittedAt: new Date("2025-01-11T14:00:00Z"),
        pullRequest: { createdAt: new Date("2025-01-11T10:00:00Z") },
      },
    ];
    vi.mocked(db.pullRequestReview.findMany).mockResolvedValue(mockReviews as never);

    const result = await fetchReviewMetrics("contributor-1", dateRange);

    expect(result.count).toBe(2);
    expect(result.avgTimeToReviewHours).toBe(4);
  });

  it("returns null avg time when no reviews", async () => {
    const dateRange = createDateRange(30);
    vi.mocked(db.pullRequestReview.findMany).mockResolvedValue([]);

    const result = await fetchReviewMetrics("contributor-1", dateRange);

    expect(result.count).toBe(0);
    expect(result.avgTimeToReviewHours).toBeNull();
  });

  it("filters out reviews without pull request", async () => {
    const dateRange = createDateRange(30);
    const mockReviews = [
      {
        submittedAt: new Date("2025-01-10T12:00:00Z"),
        pullRequest: null,
      },
    ];
    vi.mocked(db.pullRequestReview.findMany).mockResolvedValue(mockReviews as never);

    const result = await fetchReviewMetrics("contributor-1", dateRange);

    expect(result.avgTimeToReviewHours).toBeNull();
  });
});

describe("fetchStreakData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns zero streaks when no commits", async () => {
    vi.mocked(db.commit.findMany).mockResolvedValue([]);

    const result = await fetchStreakData("contributor-1");

    expect(result.currentStreak).toBe(0);
    expect(result.longestStreak).toBe(0);
  });

  it("calculates longest streak correctly", async () => {
    const mockCommits = [
      { committedAt: new Date("2025-01-15") },
      { committedAt: new Date("2025-01-14") },
      { committedAt: new Date("2025-01-13") },
      { committedAt: new Date("2025-01-10") },
    ];
    vi.mocked(db.commit.findMany).mockResolvedValue(mockCommits as never);

    const result = await fetchStreakData("contributor-1");

    expect(result.longestStreak).toBe(3);
  });
});

describe("fetchAchievements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns first commit achievement", async () => {
    vi.mocked(db.commit.count).mockResolvedValue(1);
    vi.mocked(db.pullRequest.findFirst).mockResolvedValue(null);
    vi.mocked(db.pullRequestReview.count).mockResolvedValue(0);

    const result = await fetchAchievements("contributor-1", { currentStreak: 0, longestStreak: 0 });

    expect(result).toContainEqual(expect.objectContaining({ id: "first-commit", name: "First Commit" }));
  });

  it("returns century achievement at 100 commits", async () => {
    vi.mocked(db.commit.count).mockResolvedValue(100);
    vi.mocked(db.pullRequest.findFirst).mockResolvedValue(null);
    vi.mocked(db.pullRequestReview.count).mockResolvedValue(0);

    const result = await fetchAchievements("contributor-1", { currentStreak: 0, longestStreak: 0 });

    expect(result).toContainEqual(expect.objectContaining({ id: "100-commits", name: "Century" }));
  });

  it("returns 500 club achievement at 500 commits", async () => {
    vi.mocked(db.commit.count).mockResolvedValue(500);
    vi.mocked(db.pullRequest.findFirst).mockResolvedValue(null);
    vi.mocked(db.pullRequestReview.count).mockResolvedValue(0);

    const result = await fetchAchievements("contributor-1", { currentStreak: 0, longestStreak: 0 });

    expect(result).toContainEqual(expect.objectContaining({ id: "500-commits", name: "500 Club" }));
  });

  it("returns prolific achievement at 1000 commits", async () => {
    vi.mocked(db.commit.count).mockResolvedValue(1000);
    vi.mocked(db.pullRequest.findFirst).mockResolvedValue(null);
    vi.mocked(db.pullRequestReview.count).mockResolvedValue(0);

    const result = await fetchAchievements("contributor-1", { currentStreak: 0, longestStreak: 0 });

    expect(result).toContainEqual(expect.objectContaining({ id: "1k-commits", name: "Prolific" }));
  });

  it("returns first merge achievement", async () => {
    vi.mocked(db.commit.count).mockResolvedValue(0);
    vi.mocked(db.pullRequest.findFirst).mockResolvedValue({ id: "pr-1" } as never);
    vi.mocked(db.pullRequestReview.count).mockResolvedValue(0);

    const result = await fetchAchievements("contributor-1", { currentStreak: 0, longestStreak: 0 });

    expect(result).toContainEqual(expect.objectContaining({ id: "first-merged", name: "First Merge" }));
  });

  it("returns reviewer achievement", async () => {
    vi.mocked(db.commit.count).mockResolvedValue(0);
    vi.mocked(db.pullRequest.findFirst).mockResolvedValue(null);
    vi.mocked(db.pullRequestReview.count).mockResolvedValue(1);

    const result = await fetchAchievements("contributor-1", { currentStreak: 0, longestStreak: 0 });

    expect(result).toContainEqual(expect.objectContaining({ id: "first-review", name: "Reviewer" }));
  });

  it("returns code guardian achievement at 50 reviews", async () => {
    vi.mocked(db.commit.count).mockResolvedValue(0);
    vi.mocked(db.pullRequest.findFirst).mockResolvedValue(null);
    vi.mocked(db.pullRequestReview.count).mockResolvedValue(50);

    const result = await fetchAchievements("contributor-1", { currentStreak: 0, longestStreak: 0 });

    expect(result).toContainEqual(expect.objectContaining({ id: "50-reviews", name: "Code Guardian" }));
  });

  it("returns week warrior achievement at 7 day streak", async () => {
    vi.mocked(db.commit.count).mockResolvedValue(0);
    vi.mocked(db.pullRequest.findFirst).mockResolvedValue(null);
    vi.mocked(db.pullRequestReview.count).mockResolvedValue(0);

    const result = await fetchAchievements("contributor-1", { currentStreak: 7, longestStreak: 7 });

    expect(result).toContainEqual(expect.objectContaining({ id: "7-day-streak", name: "Week Warrior" }));
  });

  it("returns monthly master achievement at 30 day streak", async () => {
    vi.mocked(db.commit.count).mockResolvedValue(0);
    vi.mocked(db.pullRequest.findFirst).mockResolvedValue(null);
    vi.mocked(db.pullRequestReview.count).mockResolvedValue(0);

    const result = await fetchAchievements("contributor-1", { currentStreak: 30, longestStreak: 30 });

    expect(result).toContainEqual(expect.objectContaining({ id: "30-day-streak", name: "Monthly Master" }));
  });
});

describe("fetchHeatmapData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns heatmap data for date range", async () => {
    const dateRange = createDateRange(7);
    const mockCommits = [{ committedAt: new Date("2025-01-10") }, { committedAt: new Date("2025-01-10") }, { committedAt: new Date("2025-01-12") }];
    vi.mocked(db.commit.findMany).mockResolvedValue(mockCommits as never);

    const result = await fetchHeatmapData("contributor-1", dateRange);

    expect(result.length).toBeGreaterThan(0);
    const jan10 = result.find((d) => d.date === "2025-01-10");
    expect(jan10?.count).toBe(2);
  });

  it("returns zero count for days without commits", async () => {
    const dateRange = createDateRange(7);
    vi.mocked(db.commit.findMany).mockResolvedValue([]);

    const result = await fetchHeatmapData("contributor-1", dateRange);

    expect(result.every((d) => d.count === 0)).toBe(true);
  });

  it("includes dayOfWeek and weekNumber", async () => {
    const dateRange = createDateRange(7);
    vi.mocked(db.commit.findMany).mockResolvedValue([]);

    const result = await fetchHeatmapData("contributor-1", dateRange);

    expect(result[0]).toHaveProperty("dayOfWeek");
    expect(result[0]).toHaveProperty("weekNumber");
  });
});

describe("fetchDistributions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns repository and language distributions", async () => {
    const dateRange = createDateRange(30);
    const mockCommits = [
      { repository: { name: "frontend-app", language: "TypeScript" } },
      { repository: { name: "frontend-app", language: "TypeScript" } },
      { repository: { name: "backend-api", language: "Go" } },
    ];
    vi.mocked(db.commit.findMany).mockResolvedValue(mockCommits as never);

    const result = await fetchDistributions("contributor-1", dateRange);

    expect(result.repositories).toContainEqual({ name: "frontend-app", value: 2 });
    expect(result.repositories).toContainEqual({ name: "backend-api", value: 1 });
    expect(result.languages).toContainEqual({ name: "TypeScript", value: 2 });
    expect(result.languages).toContainEqual({ name: "Go", value: 1 });
  });

  it("sorts repositories by count descending", async () => {
    const dateRange = createDateRange(30);
    const mockCommits = [
      { repository: { name: "repo-a", language: "TypeScript" } },
      { repository: { name: "repo-b", language: "TypeScript" } },
      { repository: { name: "repo-b", language: "TypeScript" } },
    ];
    vi.mocked(db.commit.findMany).mockResolvedValue(mockCommits as never);

    const result = await fetchDistributions("contributor-1", dateRange);

    expect(result.repositories[0].name).toBe("repo-b");
    expect(result.repositories[0].value).toBe(2);
  });

  it("limits repositories to top 10", async () => {
    const dateRange = createDateRange(30);
    const mockCommits = Array.from({ length: 15 }, (_, i) => ({
      repository: { name: `repo-${i}`, language: "TypeScript" },
    }));
    vi.mocked(db.commit.findMany).mockResolvedValue(mockCommits as never);

    const result = await fetchDistributions("contributor-1", dateRange);

    expect(result.repositories.length).toBe(10);
  });

  it("uses Unknown for null language", async () => {
    const dateRange = createDateRange(30);
    const mockCommits = [{ repository: { name: "repo-a", language: null } }];
    vi.mocked(db.commit.findMany).mockResolvedValue(mockCommits as never);

    const result = await fetchDistributions("contributor-1", dateRange);

    expect(result.languages).toContainEqual({ name: "Unknown", value: 1 });
  });
});

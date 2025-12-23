import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("~/db.server", () => ({
  db: {
    repository: {
      count: vi.fn(),
    },
    commit: {
      findMany: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    pullRequest: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    pipelineRun: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    pipelineStage: {
      groupBy: vi.fn(),
    },
    qualityScan: {
      findMany: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}));

import { db } from "~/db.server";
import type { DateRange } from "./date-range.js";
import { fetchDeliveryMetrics, fetchOperationalMetrics, fetchOverviewMetrics, fetchQualityMetrics } from "./metrics.server";

const createDateRange = (startDaysAgo: number, endDaysAgo = 0): DateRange => ({
  startDate: new Date(Date.now() - startDaysAgo * 24 * 60 * 60 * 1000),
  endDate: new Date(Date.now() - endDaysAgo * 24 * 60 * 60 * 1000),
  preset: "30d",
});

describe("fetchOverviewMetrics", () => {
  const currentRange = createDateRange(30);
  const previousRange = createDateRange(60, 31);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns repository count", async () => {
    vi.mocked(db.repository.count).mockResolvedValue(25);
    vi.mocked(db.commit.findMany).mockResolvedValue([]);
    vi.mocked(db.commit.count).mockResolvedValue(0);
    vi.mocked(db.pullRequest.count).mockResolvedValue(0);

    const result = await fetchOverviewMetrics(currentRange, previousRange);

    expect(result.repositories).toBe(25);
    expect(db.repository.count).toHaveBeenCalledWith({ where: { isEnabled: true } });
  });

  it("returns contributor count with trend", async () => {
    vi.mocked(db.repository.count).mockResolvedValue(10);
    vi.mocked(db.commit.findMany)
      .mockResolvedValueOnce([{ authorId: "a1" }, { authorId: "a2" }, { authorId: "a3" }] as never)
      .mockResolvedValueOnce([{ authorId: "a1" }, { authorId: "a2" }] as never);
    vi.mocked(db.commit.count).mockResolvedValue(0);
    vi.mocked(db.pullRequest.count).mockResolvedValue(0);

    const result = await fetchOverviewMetrics(currentRange, previousRange);

    expect(result.contributors.count).toBe(3);
    expect(result.contributors.trend.type).toBe("positive");
    expect(result.contributors.trend.value).toBe(50);
  });

  it("returns commit count with trend", async () => {
    vi.mocked(db.repository.count).mockResolvedValue(10);
    vi.mocked(db.commit.findMany).mockResolvedValue([]);
    vi.mocked(db.commit.count).mockResolvedValueOnce(150).mockResolvedValueOnce(100);
    vi.mocked(db.pullRequest.count).mockResolvedValue(0);

    const result = await fetchOverviewMetrics(currentRange, previousRange);

    expect(result.commits.count).toBe(150);
    expect(result.commits.trend.type).toBe("positive");
    expect(result.commits.trend.value).toBe(50);
  });

  it("returns pull request count with trend", async () => {
    vi.mocked(db.repository.count).mockResolvedValue(10);
    vi.mocked(db.commit.findMany).mockResolvedValue([]);
    vi.mocked(db.commit.count).mockResolvedValue(0);
    vi.mocked(db.pullRequest.count).mockResolvedValueOnce(80).mockResolvedValueOnce(100);

    const result = await fetchOverviewMetrics(currentRange, previousRange);

    expect(result.pullRequests.count).toBe(80);
    expect(result.pullRequests.trend.type).toBe("negative");
    expect(result.pullRequests.trend.value).toBe(20);
  });

  it("returns neutral trend when counts are equal", async () => {
    vi.mocked(db.repository.count).mockResolvedValue(10);
    vi.mocked(db.commit.findMany)
      .mockResolvedValueOnce([{ authorId: "a1" }] as never)
      .mockResolvedValueOnce([{ authorId: "a1" }] as never);
    vi.mocked(db.commit.count).mockResolvedValue(100);
    vi.mocked(db.pullRequest.count).mockResolvedValue(50);

    const result = await fetchOverviewMetrics(currentRange, previousRange);

    expect(result.commits.trend.type).toBe("neutral");
    expect(result.pullRequests.trend.type).toBe("neutral");
  });

  it("handles zero previous values", async () => {
    vi.mocked(db.repository.count).mockResolvedValue(10);
    vi.mocked(db.commit.findMany)
      .mockResolvedValueOnce([{ authorId: "a1" }] as never)
      .mockResolvedValueOnce([] as never);
    vi.mocked(db.commit.count).mockResolvedValueOnce(50).mockResolvedValueOnce(0);
    vi.mocked(db.pullRequest.count).mockResolvedValueOnce(10).mockResolvedValueOnce(0);

    const result = await fetchOverviewMetrics(currentRange, previousRange);

    expect(result.contributors.trend.type).toBe("positive");
    expect(result.contributors.trend.value).toBe(100);
    expect(result.commits.trend.type).toBe("positive");
    expect(result.pullRequests.trend.type).toBe("positive");
  });
});

describe("fetchDeliveryMetrics", () => {
  const currentRange = createDateRange(30);
  const previousRange = createDateRange(60, 31);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns deployment count with trend", async () => {
    vi.mocked(db.pipelineRun.count).mockResolvedValueOnce(45).mockResolvedValueOnce(30);
    vi.mocked(db.pullRequest.findMany).mockResolvedValue([]);
    vi.mocked(db.pullRequest.count).mockResolvedValue(0);
    vi.mocked(db.commit.groupBy).mockResolvedValue([]);

    const result = await fetchDeliveryMetrics(currentRange, previousRange);

    expect(result.deployments.count).toBe(45);
    expect(result.deployments.trend.type).toBe("positive");
    expect(result.deployments.trend.value).toBe(50);
    expect(db.pipelineRun.count).toHaveBeenCalledWith({
      where: {
        status: "SUCCESS",
        branch: { in: ["main", "master"] },
        triggerEvent: "push",
        completedAt: { gte: currentRange.startDate, lte: currentRange.endDate },
      },
    });
  });

  it("calculates average time to merge for merged PRs", async () => {
    const now = Date.now();
    const mergedPRs = [
      { createdAt: new Date(now - 48 * 60 * 60 * 1000), mergedAt: new Date(now) },
      { createdAt: new Date(now - 24 * 60 * 60 * 1000), mergedAt: new Date(now) },
    ];

    vi.mocked(db.pipelineRun.count).mockResolvedValue(0);
    vi.mocked(db.pullRequest.findMany).mockResolvedValue(mergedPRs as never);
    vi.mocked(db.pullRequest.count).mockResolvedValue(0);
    vi.mocked(db.commit.groupBy).mockResolvedValue([]);

    const result = await fetchDeliveryMetrics(currentRange, previousRange);

    expect(result.cycleTime.avgTimeToMergeHours).toBeCloseTo(36, 0);
  });

  it("returns null for time to merge when no merged PRs", async () => {
    vi.mocked(db.pipelineRun.count).mockResolvedValue(0);
    vi.mocked(db.pullRequest.findMany).mockResolvedValue([]);
    vi.mocked(db.pullRequest.count).mockResolvedValue(0);
    vi.mocked(db.commit.groupBy).mockResolvedValue([]);

    const result = await fetchDeliveryMetrics(currentRange, previousRange);

    expect(result.cycleTime.avgTimeToMergeHours).toBeNull();
  });

  it("excludes invalid merged PRs where mergedAt is before createdAt", async () => {
    const now = Date.now();
    const mergedPRs = [
      { createdAt: new Date(now - 24 * 60 * 60 * 1000), mergedAt: new Date(now) },
      { createdAt: new Date(now), mergedAt: new Date(now - 48 * 60 * 60 * 1000) },
    ];

    vi.mocked(db.pipelineRun.count).mockResolvedValue(0);
    vi.mocked(db.pullRequest.findMany).mockResolvedValue(mergedPRs as never);
    vi.mocked(db.pullRequest.count).mockResolvedValue(0);
    vi.mocked(db.commit.groupBy).mockResolvedValue([]);

    const result = await fetchDeliveryMetrics(currentRange, previousRange);

    expect(result.cycleTime.avgTimeToMergeHours).toBeCloseTo(24, 0);
  });

  it("returns PR activity metrics", async () => {
    vi.mocked(db.pipelineRun.count).mockResolvedValue(0);
    vi.mocked(db.pullRequest.findMany).mockResolvedValue([
      { createdAt: new Date(), mergedAt: new Date() },
      { createdAt: new Date(), mergedAt: new Date() },
      { createdAt: new Date(), mergedAt: new Date() },
    ] as never);
    vi.mocked(db.pullRequest.count).mockResolvedValueOnce(5).mockResolvedValueOnce(2);
    vi.mocked(db.commit.groupBy).mockResolvedValue([]);

    const result = await fetchDeliveryMetrics(currentRange, previousRange);

    expect(result.prActivity.merged).toBe(3);
    expect(result.prActivity.open).toBe(5);
    expect(result.prActivity.waitingReview).toBe(2);
  });

  it("aggregates commits by day for trend chart", async () => {
    const startDate = new Date("2025-01-01T00:00:00Z");
    const endDate = new Date("2025-01-03T23:59:59Z");
    const range: DateRange = { startDate, endDate, preset: "custom" };

    vi.mocked(db.pipelineRun.count).mockResolvedValue(0);
    vi.mocked(db.pullRequest.findMany).mockResolvedValue([]);
    vi.mocked(db.pullRequest.count).mockResolvedValue(0);
    vi.mocked(db.commit.groupBy).mockResolvedValue([
      { committedAt: new Date("2025-01-01T10:00:00Z"), _count: 5 },
      { committedAt: new Date("2025-01-01T15:00:00Z"), _count: 3 },
      { committedAt: new Date("2025-01-03T12:00:00Z"), _count: 7 },
    ] as never);

    const result = await fetchDeliveryMetrics(range, previousRange);

    expect(result.commitTrend).toHaveLength(3);
    expect(result.commitTrend[0]).toEqual({ date: "2025-01-01", value: 8 });
    expect(result.commitTrend[1]).toEqual({ date: "2025-01-02", value: 0 });
    expect(result.commitTrend[2]).toEqual({ date: "2025-01-03", value: 7 });
  });
});

describe("fetchOperationalMetrics", () => {
  const currentRange = createDateRange(30);
  const previousRange = createDateRange(60, 31);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calculates pipeline success rate", async () => {
    vi.mocked(db.pipelineRun.findMany)
      .mockResolvedValueOnce([
        { status: "SUCCESS", durationMs: 1000 },
        { status: "SUCCESS", durationMs: 2000 },
        { status: "FAILED", durationMs: 500 },
        { status: "SUCCESS", durationMs: 1500 },
      ] as never)
      .mockResolvedValueOnce([{ status: "SUCCESS" }, { status: "FAILED" }] as never);
    vi.mocked(db.pipelineStage.groupBy).mockResolvedValue([]);

    const result = await fetchOperationalMetrics(currentRange, previousRange);

    expect(result.successRate.value).toBe(75);
  });

  it("calculates success rate trend", async () => {
    vi.mocked(db.pipelineRun.findMany)
      .mockResolvedValueOnce([
        { status: "SUCCESS", durationMs: 1000 },
        { status: "SUCCESS", durationMs: 1000 },
        { status: "SUCCESS", durationMs: 1000 },
        { status: "FAILED", durationMs: 1000 },
      ] as never)
      .mockResolvedValueOnce([{ status: "SUCCESS" }, { status: "FAILED" }] as never);
    vi.mocked(db.pipelineStage.groupBy).mockResolvedValue([]);

    const result = await fetchOperationalMetrics(currentRange, previousRange);

    expect(result.successRate.value).toBe(75);
    expect(result.successRate.trend.type).toBe("positive");
    expect(result.successRate.trend.value).toBe(50);
  });

  it("returns null success rate when no pipeline runs", async () => {
    vi.mocked(db.pipelineRun.findMany).mockResolvedValue([]);
    vi.mocked(db.pipelineStage.groupBy).mockResolvedValue([]);

    const result = await fetchOperationalMetrics(currentRange, previousRange);

    expect(result.successRate.value).toBeNull();
    expect(result.successRate.trend.type).toBe("neutral");
  });

  it("calculates average duration from successful runs", async () => {
    vi.mocked(db.pipelineRun.findMany)
      .mockResolvedValueOnce([
        { status: "SUCCESS", durationMs: 60000 },
        { status: "SUCCESS", durationMs: 120000 },
        { status: "FAILED", durationMs: 30000 },
      ] as never)
      .mockResolvedValueOnce([]);
    vi.mocked(db.pipelineStage.groupBy).mockResolvedValue([]);

    const result = await fetchOperationalMetrics(currentRange, previousRange);

    expect(result.avgDurationMs).toBe(90000);
  });

  it("returns null average duration when no successful runs", async () => {
    vi.mocked(db.pipelineRun.findMany)
      .mockResolvedValueOnce([{ status: "FAILED", durationMs: 30000 }] as never)
      .mockResolvedValueOnce([]);
    vi.mocked(db.pipelineStage.groupBy).mockResolvedValue([]);

    const result = await fetchOperationalMetrics(currentRange, previousRange);

    expect(result.avgDurationMs).toBeNull();
  });

  it("returns stage breakdown sorted by duration", async () => {
    vi.mocked(db.pipelineRun.findMany).mockResolvedValue([]);
    vi.mocked(db.pipelineStage.groupBy).mockResolvedValue([
      { name: "build", _avg: { durationMs: 30000 }, _count: 10 },
      { name: "test", _avg: { durationMs: 120000 }, _count: 10 },
      { name: "deploy", _avg: { durationMs: 60000 }, _count: 10 },
    ] as never);

    const result = await fetchOperationalMetrics(currentRange, previousRange);

    expect(result.stageBreakdown).toHaveLength(3);
    expect(result.stageBreakdown[0].name).toBe("test");
    expect(result.stageBreakdown[0].avgDurationMs).toBe(120000);
    expect(result.stageBreakdown[1].name).toBe("deploy");
    expect(result.stageBreakdown[2].name).toBe("build");
  });

  it("limits stage breakdown to top 5 slowest stages", async () => {
    vi.mocked(db.pipelineRun.findMany).mockResolvedValue([]);
    vi.mocked(db.pipelineStage.groupBy).mockResolvedValue([
      { name: "stage1", _avg: { durationMs: 10000 }, _count: 1 },
      { name: "stage2", _avg: { durationMs: 20000 }, _count: 1 },
      { name: "stage3", _avg: { durationMs: 30000 }, _count: 1 },
      { name: "stage4", _avg: { durationMs: 40000 }, _count: 1 },
      { name: "stage5", _avg: { durationMs: 50000 }, _count: 1 },
      { name: "stage6", _avg: { durationMs: 60000 }, _count: 1 },
      { name: "stage7", _avg: { durationMs: 70000 }, _count: 1 },
    ] as never);

    const result = await fetchOperationalMetrics(currentRange, previousRange);

    expect(result.stageBreakdown).toHaveLength(5);
    expect(result.stageBreakdown[0].name).toBe("stage7");
    expect(result.stageBreakdown[4].name).toBe("stage3");
  });

  it("filters out stages with null duration", async () => {
    vi.mocked(db.pipelineRun.findMany).mockResolvedValue([]);
    vi.mocked(db.pipelineStage.groupBy).mockResolvedValue([
      { name: "build", _avg: { durationMs: 30000 }, _count: 10 },
      { name: "unknown", _avg: { durationMs: null }, _count: 5 },
    ] as never);

    const result = await fetchOperationalMetrics(currentRange, previousRange);

    expect(result.stageBreakdown).toHaveLength(1);
    expect(result.stageBreakdown[0].name).toBe("build");
  });
});

describe("fetchQualityMetrics", () => {
  const currentRange = createDateRange(30);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calculates overall coverage from latest scans per repository", async () => {
    vi.mocked(db.$queryRaw).mockResolvedValue([
      { repositoryId: "repo-1", coveragePercent: 80, newCodeCoveragePercent: 90, scannedAt: new Date() },
      { repositoryId: "repo-2", coveragePercent: 70, newCodeCoveragePercent: 85, scannedAt: new Date() },
    ]);
    vi.mocked(db.qualityScan.findMany).mockResolvedValue([]);

    const result = await fetchQualityMetrics(currentRange);

    expect(result.overallCoverage).toBe(75);
  });

  it("calculates new code coverage average", async () => {
    vi.mocked(db.$queryRaw).mockResolvedValue([
      { repositoryId: "repo-1", coveragePercent: 80, newCodeCoveragePercent: 95, scannedAt: new Date() },
      { repositoryId: "repo-2", coveragePercent: 70, newCodeCoveragePercent: 85, scannedAt: new Date() },
    ]);
    vi.mocked(db.qualityScan.findMany).mockResolvedValue([]);

    const result = await fetchQualityMetrics(currentRange);

    expect(result.newCodeCoverage).toBe(90);
  });

  it("returns null coverage when no scans have coverage data", async () => {
    vi.mocked(db.$queryRaw).mockResolvedValue([{ repositoryId: "repo-1", coveragePercent: null, newCodeCoveragePercent: null, scannedAt: new Date() }]);
    vi.mocked(db.qualityScan.findMany).mockResolvedValue([]);

    const result = await fetchQualityMetrics(currentRange);

    expect(result.overallCoverage).toBeNull();
    expect(result.newCodeCoverage).toBeNull();
  });

  it("returns coverage trend data", async () => {
    vi.mocked(db.$queryRaw).mockResolvedValue([]);
    vi.mocked(db.qualityScan.findMany).mockResolvedValue([
      { scannedAt: new Date("2025-01-01T10:00:00Z"), coveragePercent: 75.5 },
      { scannedAt: new Date("2025-01-02T10:00:00Z"), coveragePercent: 76.25 },
      { scannedAt: new Date("2025-01-03T10:00:00Z"), coveragePercent: 77.89 },
    ] as never);

    const result = await fetchQualityMetrics(currentRange);

    expect(result.coverageTrend).toHaveLength(3);
    expect(result.coverageTrend[0]).toEqual({ date: "2025-01-01", value: 75.5 });
    expect(result.coverageTrend[1]).toEqual({ date: "2025-01-02", value: 76.3 });
    expect(result.coverageTrend[2]).toEqual({ date: "2025-01-03", value: 77.9 });
  });

  it("returns empty coverage trend when no scans in range", async () => {
    vi.mocked(db.$queryRaw).mockResolvedValue([]);
    vi.mocked(db.qualityScan.findMany).mockResolvedValue([]);

    const result = await fetchQualityMetrics(currentRange);

    expect(result.coverageTrend).toEqual([]);
  });

  it("handles mixed coverage data with some nulls", async () => {
    vi.mocked(db.$queryRaw).mockResolvedValue([
      { repositoryId: "repo-1", coveragePercent: 80, newCodeCoveragePercent: null, scannedAt: new Date() },
      { repositoryId: "repo-2", coveragePercent: null, newCodeCoveragePercent: 90, scannedAt: new Date() },
      { repositoryId: "repo-3", coveragePercent: 60, newCodeCoveragePercent: 70, scannedAt: new Date() },
    ]);
    vi.mocked(db.qualityScan.findMany).mockResolvedValue([]);

    const result = await fetchQualityMetrics(currentRange);

    expect(result.overallCoverage).toBe(70);
    expect(result.newCodeCoverage).toBe(80);
  });

  it("rounds coverage values to one decimal place", async () => {
    vi.mocked(db.$queryRaw).mockResolvedValue([{ repositoryId: "repo-1", coveragePercent: 75.333, newCodeCoveragePercent: 85.666, scannedAt: new Date() }]);
    vi.mocked(db.qualityScan.findMany).mockResolvedValue([]);

    const result = await fetchQualityMetrics(currentRange);

    expect(result.overallCoverage).toBe(75.3);
    expect(result.newCodeCoverage).toBe(85.7);
  });
});

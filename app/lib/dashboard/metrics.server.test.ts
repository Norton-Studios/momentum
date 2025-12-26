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
    issue: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    issueStatusTransition: {
      findMany: vi.fn(),
    },
    securityVulnerability: {
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}));

import { db } from "~/db.server";
import type { DateRange } from "./date-range.js";
import { fetchDeliveryMetrics, fetchOperationalMetrics, fetchOverviewMetrics, fetchQualityMetrics, fetchSecurityMetrics, fetchTicketMetrics } from "./metrics.server";

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
    vi.mocked(db.pullRequest.findMany).mockResolvedValue([]);

    const result = await fetchOverviewMetrics(currentRange, previousRange, null);

    expect(result.repositories).toBe(25);
    expect(db.repository.count).toHaveBeenCalledWith({ where: { isEnabled: true } });
  });

  it("returns contributor count with trend", async () => {
    vi.mocked(db.repository.count).mockResolvedValue(10);
    vi.mocked(db.commit.findMany)
      .mockResolvedValueOnce([{ authorId: "a1" }, { authorId: "a2" }, { authorId: "a3" }] as never)
      .mockResolvedValueOnce([{ authorId: "a1" }, { authorId: "a2" }] as never)
      .mockResolvedValueOnce([{ committedAt: new Date() }] as never)
      .mockResolvedValueOnce([{ committedAt: new Date(), authorId: "a1" }] as never);
    vi.mocked(db.commit.count).mockResolvedValue(0);
    vi.mocked(db.pullRequest.count).mockResolvedValue(0);
    vi.mocked(db.pullRequest.findMany).mockResolvedValue([]);

    const result = await fetchOverviewMetrics(currentRange, previousRange, null);

    expect(result.contributors.count).toBe(3);
    expect(result.contributors.trend.type).toBe("positive");
    expect(result.contributors.trend.value).toBe(50);
  });

  it("returns commit count with trend", async () => {
    vi.mocked(db.repository.count).mockResolvedValue(10);
    vi.mocked(db.commit.findMany).mockResolvedValue([]);
    vi.mocked(db.commit.count).mockResolvedValueOnce(150).mockResolvedValueOnce(100);
    vi.mocked(db.pullRequest.count).mockResolvedValue(0);
    vi.mocked(db.pullRequest.findMany).mockResolvedValue([]);

    const result = await fetchOverviewMetrics(currentRange, previousRange, null);

    expect(result.commits.count).toBe(150);
    expect(result.commits.trend.type).toBe("positive");
    expect(result.commits.trend.value).toBe(50);
  });

  it("returns pull request count with trend", async () => {
    vi.mocked(db.repository.count).mockResolvedValue(10);
    vi.mocked(db.commit.findMany).mockResolvedValue([]);
    vi.mocked(db.commit.count).mockResolvedValue(0);
    vi.mocked(db.pullRequest.count).mockResolvedValueOnce(80).mockResolvedValueOnce(100);
    vi.mocked(db.pullRequest.findMany).mockResolvedValue([]);

    const result = await fetchOverviewMetrics(currentRange, previousRange, null);

    expect(result.pullRequests.count).toBe(80);
    expect(result.pullRequests.trend.type).toBe("negative");
    expect(result.pullRequests.trend.value).toBe(20);
  });
});

describe("fetchDeliveryMetrics", () => {
  const currentRange = createDateRange(30);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns open PR count", async () => {
    vi.mocked(db.pullRequest.findMany)
      .mockResolvedValueOnce([{ createdAt: new Date() }, { createdAt: new Date() }, { createdAt: new Date() }] as never)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([] as never);
    vi.mocked(db.commit.findMany).mockResolvedValue([]);

    const result = await fetchDeliveryMetrics(currentRange, null);

    expect(result.openPRs).toBe(3);
  });

  it("calculates average PR age for open PRs", async () => {
    const now = Date.now();
    vi.mocked(db.pullRequest.findMany)
      .mockResolvedValueOnce([{ createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000) }, { createdAt: new Date(now - 4 * 24 * 60 * 60 * 1000) }] as never)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([] as never);
    vi.mocked(db.commit.findMany).mockResolvedValue([]);

    const result = await fetchDeliveryMetrics(currentRange, null);

    expect(result.avgPrAgeDays).toBeCloseTo(3, 0);
  });

  it("returns null for avgPrAgeDays when no open PRs", async () => {
    vi.mocked(db.pullRequest.findMany).mockResolvedValue([]);
    vi.mocked(db.commit.findMany).mockResolvedValue([]);

    const result = await fetchDeliveryMetrics(currentRange, null);

    expect(result.avgPrAgeDays).toBeNull();
  });

  it("returns commits to master count", async () => {
    vi.mocked(db.pullRequest.findMany).mockResolvedValue([]);
    vi.mocked(db.commit.findMany).mockResolvedValue([{ committedAt: new Date() }] as never);

    const result = await fetchDeliveryMetrics(currentRange, null);

    expect(result.commitsToMaster).toBe(1);
  });

  it("calculates average time to review", async () => {
    const now = Date.now();
    vi.mocked(db.pullRequest.findMany)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([
        { createdAt: new Date(now - 24 * 60 * 60 * 1000), reviews: [{ submittedAt: new Date(now - 12 * 60 * 60 * 1000) }] },
        { createdAt: new Date(now - 48 * 60 * 60 * 1000), reviews: [{ submittedAt: new Date(now - 24 * 60 * 60 * 1000) }] },
      ] as never);
    vi.mocked(db.commit.findMany).mockResolvedValue([]);

    const result = await fetchDeliveryMetrics(currentRange, null);

    expect(result.avgTimeToReviewHours).toBeCloseTo(18, 0);
  });
});

describe("fetchOperationalMetrics", () => {
  const currentRange = createDateRange(30);
  const completedAt = new Date();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calculates master success rate", async () => {
    vi.mocked(db.pipelineRun.findMany)
      .mockResolvedValueOnce([
        { status: "SUCCESS", durationMs: 1000, completedAt },
        { status: "SUCCESS", durationMs: 2000, completedAt },
        { status: "FAILED", durationMs: 500, completedAt },
        { status: "SUCCESS", durationMs: 1500, completedAt },
      ] as never)
      .mockResolvedValueOnce([{ status: "SUCCESS", durationMs: 1000, completedAt }] as never);
    vi.mocked(db.pipelineStage.groupBy).mockResolvedValue([]);

    const result = await fetchOperationalMetrics(currentRange, null);

    expect(result.masterSuccessRate).toBe(75);
  });

  it("calculates PR success rate", async () => {
    vi.mocked(db.pipelineRun.findMany)
      .mockResolvedValueOnce([{ status: "SUCCESS", durationMs: 1000, completedAt }] as never)
      .mockResolvedValueOnce([
        { status: "SUCCESS", durationMs: 1000, completedAt },
        { status: "FAILED", durationMs: 1000, completedAt },
      ] as never);
    vi.mocked(db.pipelineStage.groupBy).mockResolvedValue([]);

    const result = await fetchOperationalMetrics(currentRange, null);

    expect(result.prSuccessRate).toBe(50);
  });

  it("returns null success rate when no pipeline runs", async () => {
    vi.mocked(db.pipelineRun.findMany).mockResolvedValue([]);
    vi.mocked(db.pipelineStage.groupBy).mockResolvedValue([]);

    const result = await fetchOperationalMetrics(currentRange, null);

    expect(result.masterSuccessRate).toBeNull();
    expect(result.prSuccessRate).toBeNull();
  });

  it("calculates average duration for master and PR", async () => {
    vi.mocked(db.pipelineRun.findMany)
      .mockResolvedValueOnce([
        { status: "SUCCESS", durationMs: 60000, completedAt },
        { status: "SUCCESS", durationMs: 120000, completedAt },
      ] as never)
      .mockResolvedValueOnce([
        { status: "SUCCESS", durationMs: 30000, completedAt },
        { status: "SUCCESS", durationMs: 90000, completedAt },
      ] as never);
    vi.mocked(db.pipelineStage.groupBy).mockResolvedValue([]);

    const result = await fetchOperationalMetrics(currentRange, null);

    expect(result.masterAvgDurationMs).toBe(90000);
    expect(result.prAvgDurationMs).toBe(60000);
  });

  it("returns failure steps for master and PR", async () => {
    vi.mocked(db.pipelineRun.findMany).mockResolvedValue([]);
    vi.mocked(db.pipelineStage.groupBy)
      .mockResolvedValueOnce([{ name: "build", _count: 5 }] as never)
      .mockResolvedValueOnce([
        { name: "test", _count: 10 },
        { name: "lint", _count: 3 },
      ] as never);

    const result = await fetchOperationalMetrics(currentRange, null);

    expect(result.masterFailureSteps).toEqual([{ name: "build", value: 5 }]);
    expect(result.prFailureSteps).toEqual([
      { name: "test", value: 10 },
      { name: "lint", value: 3 },
    ]);
  });
});

describe("fetchQualityMetrics", () => {
  const currentRange = createDateRange(30);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calculates overall coverage from latest scans per repository", async () => {
    vi.mocked(db.$queryRaw)
      .mockResolvedValueOnce([
        { repositoryId: "repo-1", coveragePercent: 80, bugsCount: 5 },
        { repositoryId: "repo-2", coveragePercent: 70, bugsCount: 10 },
      ])
      .mockResolvedValueOnce([]);

    const result = await fetchQualityMetrics(currentRange, null);

    expect(result.overallCoverage).toBe(75);
  });

  it("returns total bugs count", async () => {
    vi.mocked(db.$queryRaw)
      .mockResolvedValueOnce([
        { repositoryId: "repo-1", coveragePercent: 80, bugsCount: 5 },
        { repositoryId: "repo-2", coveragePercent: 70, bugsCount: 10 },
      ])
      .mockResolvedValueOnce([]);

    const result = await fetchQualityMetrics(currentRange, null);

    expect(result.bugsCount).toBe(15);
  });

  it("returns null coverage when no scans have coverage data", async () => {
    vi.mocked(db.$queryRaw)
      .mockResolvedValueOnce([{ repositoryId: "repo-1", coveragePercent: null, bugsCount: null }])
      .mockResolvedValueOnce([]);

    const result = await fetchQualityMetrics(currentRange, null);

    expect(result.overallCoverage).toBeNull();
  });

  it("handles null bugsCount", async () => {
    vi.mocked(db.$queryRaw)
      .mockResolvedValueOnce([
        { repositoryId: "repo-1", coveragePercent: 80, bugsCount: null },
        { repositoryId: "repo-2", coveragePercent: 70, bugsCount: 5 },
      ])
      .mockResolvedValueOnce([]);

    const result = await fetchQualityMetrics(currentRange, null);

    expect(result.bugsCount).toBe(5);
  });
});

describe("fetchTicketMetrics", () => {
  const currentRange = createDateRange(30);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns active ticket count", async () => {
    vi.mocked(db.issue.findMany)
      .mockResolvedValueOnce([{ id: "1", createdAt: new Date(), status: "IN_PROGRESS" }] as never)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([] as never);
    vi.mocked(db.issueStatusTransition.findMany).mockResolvedValue([]);

    const result = await fetchTicketMetrics(currentRange, null);

    expect(result.activeCount).toBe(1);
  });

  it("returns completed ticket count", async () => {
    vi.mocked(db.issue.findMany)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([{ resolvedAt: new Date() }, { resolvedAt: new Date() }, { resolvedAt: new Date() }] as never)
      .mockResolvedValueOnce([] as never);
    vi.mocked(db.issueStatusTransition.findMany).mockResolvedValue([]);

    const result = await fetchTicketMetrics(currentRange, null);

    expect(result.completedCount).toBe(3);
  });

  it("calculates average active ticket age", async () => {
    const now = Date.now();
    vi.mocked(db.issue.findMany)
      .mockResolvedValueOnce([
        { id: "1", createdAt: new Date(now - 5 * 24 * 60 * 60 * 1000), status: "IN_PROGRESS" },
        { id: "2", createdAt: new Date(now - 10 * 24 * 60 * 60 * 1000), status: "IN_PROGRESS" },
      ] as never)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([] as never);
    vi.mocked(db.issueStatusTransition.findMany).mockResolvedValue([]);

    const result = await fetchTicketMetrics(currentRange, null);

    expect(result.avgActiveTicketAgeDays).toBeCloseTo(7.5, 0);
  });

  it("returns null for avgActiveTicketAgeDays when no active tickets", async () => {
    vi.mocked(db.issue.findMany)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([] as never);
    vi.mocked(db.issueStatusTransition.findMany).mockResolvedValue([]);

    const result = await fetchTicketMetrics(currentRange, null);

    expect(result.avgActiveTicketAgeDays).toBeNull();
  });
});

describe("fetchSecurityMetrics", () => {
  const currentRange = createDateRange(30);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns CVE counts by severity", async () => {
    vi.mocked(db.securityVulnerability.groupBy).mockResolvedValue([
      { severity: "CRITICAL", _count: 2 },
      { severity: "HIGH", _count: 5 },
      { severity: "MEDIUM", _count: 10 },
    ] as never);
    vi.mocked(db.securityVulnerability.findMany).mockResolvedValue([]);

    const result = await fetchSecurityMetrics(currentRange, null);

    expect(result.cveBySeverity.critical).toBe(2);
    expect(result.cveBySeverity.high).toBe(5);
    expect(result.cveBySeverity.medium).toBe(10);
    expect(result.cveBySeverity.low).toBe(0);
  });

  it("calculates average time to close", async () => {
    const now = Date.now();
    vi.mocked(db.securityVulnerability.groupBy).mockResolvedValue([]);
    vi.mocked(db.securityVulnerability.findMany).mockResolvedValue([
      { discoveredAt: new Date(now - 10 * 24 * 60 * 60 * 1000), resolvedAt: new Date(now) },
      { discoveredAt: new Date(now - 20 * 24 * 60 * 60 * 1000), resolvedAt: new Date(now) },
    ] as never);

    const result = await fetchSecurityMetrics(currentRange, null);

    expect(result.avgTimeToCloseDays).toBeCloseTo(15, 0);
  });

  it("returns null for avgTimeToCloseDays when no resolved vulnerabilities", async () => {
    vi.mocked(db.securityVulnerability.groupBy).mockResolvedValue([]);
    vi.mocked(db.securityVulnerability.findMany).mockResolvedValue([]);

    const result = await fetchSecurityMetrics(currentRange, null);

    expect(result.avgTimeToCloseDays).toBeNull();
  });
});

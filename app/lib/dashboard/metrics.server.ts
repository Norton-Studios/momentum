import { db } from "~/db.server.js";
import { type ChartDataPoint, calculateTrend, type DateRange, type TrendValue } from "./date-range.js";

export async function fetchOverviewMetrics(dateRange: DateRange, previousRange: DateRange): Promise<OverviewMetrics> {
  const [repositories, currentContributors, previousContributors, currentCommits, previousCommits, currentPRs, previousPRs] = await Promise.all([
    db.repository.count({ where: { isEnabled: true } }),
    db.commit.findMany({
      where: {
        committedAt: { gte: dateRange.startDate, lte: dateRange.endDate },
      },
      select: { authorId: true },
      distinct: ["authorId"],
    }),
    db.commit.findMany({
      where: {
        committedAt: { gte: previousRange.startDate, lte: previousRange.endDate },
      },
      select: { authorId: true },
      distinct: ["authorId"],
    }),
    db.commit.count({
      where: { committedAt: { gte: dateRange.startDate, lte: dateRange.endDate } },
    }),
    db.commit.count({
      where: { committedAt: { gte: previousRange.startDate, lte: previousRange.endDate } },
    }),
    db.pullRequest.count({
      where: { createdAt: { gte: dateRange.startDate, lte: dateRange.endDate } },
    }),
    db.pullRequest.count({
      where: { createdAt: { gte: previousRange.startDate, lte: previousRange.endDate } },
    }),
  ]);

  return {
    repositories,
    contributors: {
      count: currentContributors.length,
      trend: calculateTrend(currentContributors.length, previousContributors.length),
    },
    commits: {
      count: currentCommits,
      trend: calculateTrend(currentCommits, previousCommits),
    },
    pullRequests: {
      count: currentPRs,
      trend: calculateTrend(currentPRs, previousPRs),
    },
  };
}

export async function fetchDeliveryMetrics(dateRange: DateRange, previousRange: DateRange): Promise<DeliveryMetrics> {
  const [currentDeployments, previousDeployments, mergedPRs, openPRs, commitsByDay] = await Promise.all([
    db.pipelineRun.count({
      where: {
        status: "SUCCESS",
        branch: { in: ["main", "master"] },
        triggerEvent: "push",
        completedAt: { gte: dateRange.startDate, lte: dateRange.endDate },
      },
    }),
    db.pipelineRun.count({
      where: {
        status: "SUCCESS",
        branch: { in: ["main", "master"] },
        triggerEvent: "push",
        completedAt: { gte: previousRange.startDate, lte: previousRange.endDate },
      },
    }),
    db.pullRequest.findMany({
      where: {
        state: "MERGED",
        mergedAt: { gte: dateRange.startDate, lte: dateRange.endDate },
      },
      select: { createdAt: true, mergedAt: true },
    }),
    db.pullRequest.count({
      where: { state: "OPEN" },
    }),
    db.commit.groupBy({
      by: ["committedAt"],
      where: { committedAt: { gte: dateRange.startDate, lte: dateRange.endDate } },
      _count: true,
    }),
  ]);

  const validMergedPRs = mergedPRs.filter((pr) => pr.mergedAt && pr.mergedAt.getTime() > pr.createdAt.getTime());
  const avgTimeToMergeMs =
    validMergedPRs.length > 0 ? validMergedPRs.reduce((sum, pr) => sum + (pr.mergedAt!.getTime() - pr.createdAt.getTime()), 0) / validMergedPRs.length : null;

  const avgTimeToMergeHours = avgTimeToMergeMs ? avgTimeToMergeMs / (1000 * 60 * 60) : null;

  const waitingReview = await db.pullRequest.count({
    where: {
      state: "OPEN",
      reviews: { none: {} },
    },
  });

  const commitTrend = aggregateByDay(commitsByDay, dateRange);

  return {
    deployments: {
      count: currentDeployments,
      trend: calculateTrend(currentDeployments, previousDeployments),
    },
    cycleTime: {
      avgTimeToMergeHours,
    },
    commitTrend,
    prActivity: {
      merged: mergedPRs.length,
      open: openPRs,
      waitingReview,
    },
  };
}

export async function fetchOperationalMetrics(dateRange: DateRange, previousRange: DateRange): Promise<OperationalMetrics> {
  const [currentRuns, previousRuns, stageStats] = await Promise.all([
    db.pipelineRun.findMany({
      where: {
        status: { in: ["SUCCESS", "FAILED"] },
        completedAt: { gte: dateRange.startDate, lte: dateRange.endDate },
      },
      select: { status: true, durationMs: true },
    }),
    db.pipelineRun.findMany({
      where: {
        status: { in: ["SUCCESS", "FAILED"] },
        completedAt: { gte: previousRange.startDate, lte: previousRange.endDate },
      },
      select: { status: true },
    }),
    db.pipelineStage.groupBy({
      by: ["name"],
      where: {
        pipelineRun: {
          completedAt: { gte: dateRange.startDate, lte: dateRange.endDate },
        },
        status: "SUCCESS",
        durationMs: { not: null },
      },
      _avg: { durationMs: true },
      _count: true,
    }),
  ]);

  const currentSuccessCount = currentRuns.filter((r) => r.status === "SUCCESS").length;
  const currentFailedCount = currentRuns.filter((r) => r.status === "FAILED").length;
  const currentTotal = currentSuccessCount + currentFailedCount;

  const previousSuccessCount = previousRuns.filter((r) => r.status === "SUCCESS").length;
  const previousTotal = previousRuns.length;

  const currentSuccessRate = currentTotal > 0 ? (currentSuccessCount / currentTotal) * 100 : null;
  const previousSuccessRate = previousTotal > 0 ? (previousSuccessCount / previousTotal) * 100 : null;

  const successRateTrend =
    currentSuccessRate !== null && previousSuccessRate !== null ? calculateTrend(currentSuccessRate, previousSuccessRate) : { value: 0, type: "neutral" as const };

  const successfulRuns = currentRuns.filter((r) => r.status === "SUCCESS" && r.durationMs !== null);
  const avgDurationMs = successfulRuns.length > 0 ? successfulRuns.reduce((sum, r) => sum + r.durationMs!, 0) / successfulRuns.length : null;

  const stageBreakdown = stageStats
    .filter((s) => s._avg.durationMs !== null)
    .map((s) => ({
      name: s.name,
      avgDurationMs: Math.round(s._avg.durationMs!),
    }))
    .sort((a, b) => b.avgDurationMs - a.avgDurationMs)
    .slice(0, 5);

  return {
    successRate: {
      value: currentSuccessRate,
      trend: successRateTrend,
    },
    avgDurationMs: avgDurationMs ? Math.round(avgDurationMs) : null,
    stageBreakdown,
  };
}

export async function fetchQualityMetrics(dateRange: DateRange): Promise<QualityMetrics> {
  const latestScans = await db.$queryRaw<QualityScanRow[]>`
		SELECT DISTINCT ON (repository_id)
			repository_id as "repositoryId",
			coverage_percent as "coveragePercent",
			new_code_coverage_percent as "newCodeCoveragePercent",
			scanned_at as "scannedAt"
		FROM analysis.quality_scan
		WHERE scanned_at <= ${dateRange.endDate}
		ORDER BY repository_id, scanned_at DESC
	`;

  const coverageTrendData = await db.qualityScan.findMany({
    where: {
      scannedAt: { gte: dateRange.startDate, lte: dateRange.endDate },
      coveragePercent: { not: null },
    },
    select: { scannedAt: true, coveragePercent: true },
    orderBy: { scannedAt: "asc" },
  });

  const scansWithCoverage = latestScans.filter((s) => s.coveragePercent !== null);
  const overallCoverage = scansWithCoverage.length > 0 ? scansWithCoverage.reduce((sum, s) => sum + s.coveragePercent!, 0) / scansWithCoverage.length : null;

  const scansWithNewCodeCoverage = latestScans.filter((s) => s.newCodeCoveragePercent !== null);
  const newCodeCoverage =
    scansWithNewCodeCoverage.length > 0 ? scansWithNewCodeCoverage.reduce((sum, s) => sum + s.newCodeCoveragePercent!, 0) / scansWithNewCodeCoverage.length : null;

  const coverageTrend: ChartDataPoint[] = coverageTrendData.map((scan) => ({
    date: scan.scannedAt.toISOString().split("T")[0],
    value: Math.round(scan.coveragePercent! * 10) / 10,
  }));

  return {
    overallCoverage: overallCoverage ? Math.round(overallCoverage * 10) / 10 : null,
    newCodeCoverage: newCodeCoverage ? Math.round(newCodeCoverage * 10) / 10 : null,
    coverageTrend,
  };
}

function aggregateByDay(data: { committedAt: Date; _count: number }[], dateRange: DateRange): ChartDataPoint[] {
  const dayMap = new Map<string, number>();

  const current = new Date(dateRange.startDate);
  while (current <= dateRange.endDate) {
    dayMap.set(current.toISOString().split("T")[0], 0);
    current.setDate(current.getDate() + 1);
  }

  for (const item of data) {
    const day = item.committedAt.toISOString().split("T")[0];
    if (dayMap.has(day)) {
      dayMap.set(day, (dayMap.get(day) || 0) + item._count);
    }
  }

  return Array.from(dayMap.entries()).map(([date, value]) => ({ date, value }));
}

interface QualityScanRow {
  repositoryId: string;
  coveragePercent: number | null;
  newCodeCoveragePercent: number | null;
  scannedAt: Date;
}

export interface OverviewMetrics {
  repositories: number;
  contributors: { count: number; trend: TrendValue };
  commits: { count: number; trend: TrendValue };
  pullRequests: { count: number; trend: TrendValue };
}

export interface DeliveryMetrics {
  deployments: { count: number; trend: TrendValue };
  cycleTime: { avgTimeToMergeHours: number | null };
  commitTrend: ChartDataPoint[];
  prActivity: {
    merged: number;
    open: number;
    waitingReview: number;
  };
}

export interface OperationalMetrics {
  successRate: { value: number | null; trend: TrendValue };
  avgDurationMs: number | null;
  stageBreakdown: { name: string; avgDurationMs: number }[];
}

export interface QualityMetrics {
  overallCoverage: number | null;
  newCodeCoverage: number | null;
  coverageTrend: ChartDataPoint[];
}

export interface DashboardData {
  overview: OverviewMetrics;
  delivery: DeliveryMetrics;
  operational: OperationalMetrics;
  quality: QualityMetrics;
}

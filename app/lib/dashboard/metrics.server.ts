import { db } from "~/db.server.js";
import { type ChartDataPoint, calculateTrend, type DateRange, type TrendValue } from "./date-range.js";

const ACTIVE_ISSUE_STATUSES = ["TODO", "IN_PROGRESS", "IN_REVIEW", "BLOCKED"] as const;
const MAIN_BRANCHES = ["main", "master"] as const;
const MS_PER_DAY = 1000 * 60 * 60 * 24;
const MS_PER_HOUR = 1000 * 60 * 60;

export async function fetchOverviewMetrics(dateRange: DateRange, previousRange: DateRange, teamId: string | null): Promise<OverviewMetrics> {
  const repositoryIds = teamId ? await getTeamRepositoryIds(teamId) : null;
  const repoFilter = repositoryIds ? { repositoryId: { in: repositoryIds } } : {};
  const repoIdFilter = repositoryIds ? { id: { in: repositoryIds } } : {};

  const [repositories, currentContributors, previousContributors, currentCommits, previousCommits, currentPRs, previousPRs, commitsWithDates, prsWithDates, contributorsByDay] =
    await Promise.all([
      db.repository.count({ where: { isEnabled: true, ...repoIdFilter } }),
      db.commit.findMany({
        where: {
          committedAt: { gte: dateRange.startDate, lte: dateRange.endDate },
          ...repoFilter,
        },
        select: { authorId: true },
        distinct: ["authorId"],
      }),
      db.commit.findMany({
        where: {
          committedAt: { gte: previousRange.startDate, lte: previousRange.endDate },
          ...repoFilter,
        },
        select: { authorId: true },
        distinct: ["authorId"],
      }),
      db.commit.count({
        where: { committedAt: { gte: dateRange.startDate, lte: dateRange.endDate }, ...repoFilter },
      }),
      db.commit.count({
        where: { committedAt: { gte: previousRange.startDate, lte: previousRange.endDate }, ...repoFilter },
      }),
      db.pullRequest.count({
        where: { createdAt: { gte: dateRange.startDate, lte: dateRange.endDate }, ...repoFilter },
      }),
      db.pullRequest.count({
        where: { createdAt: { gte: previousRange.startDate, lte: previousRange.endDate }, ...repoFilter },
      }),
      db.commit.findMany({
        where: { committedAt: { gte: dateRange.startDate, lte: dateRange.endDate }, ...repoFilter },
        select: { committedAt: true },
      }),
      db.pullRequest.findMany({
        where: { createdAt: { gte: dateRange.startDate, lte: dateRange.endDate }, ...repoFilter },
        select: { createdAt: true },
      }),
      db.commit.findMany({
        where: { committedAt: { gte: dateRange.startDate, lte: dateRange.endDate }, ...repoFilter },
        select: { committedAt: true, authorId: true },
      }),
    ]);

  return {
    repositories,
    contributors: {
      count: currentContributors.length,
      trend: calculateTrend(currentContributors.length, previousContributors.length),
      chart: aggregateUniqueByDay(contributorsByDay, "committedAt", "authorId", dateRange),
    },
    commits: {
      count: currentCommits,
      trend: calculateTrend(currentCommits, previousCommits),
      chart: aggregateCountByDay(commitsWithDates, "committedAt", dateRange),
    },
    pullRequests: {
      count: currentPRs,
      trend: calculateTrend(currentPRs, previousPRs),
      chart: aggregateCountByDay(prsWithDates, "createdAt", dateRange),
    },
  };
}

async function getTeamRepositoryIds(teamId: string): Promise<string[]> {
  const teamRepos = await db.teamRepository.findMany({
    where: { teamId },
    select: { repositoryId: true },
  });
  return teamRepos.map((tr) => tr.repositoryId);
}

async function getTeamProjectIds(teamId: string): Promise<string[]> {
  const teamProjects = await db.teamProject.findMany({
    where: { teamId },
    select: { projectId: true },
  });
  return teamProjects.map((tp) => tp.projectId);
}

export async function fetchDeliveryMetrics(dateRange: DateRange, teamId: string | null): Promise<DeliveryMetrics> {
  const repositoryIds = teamId ? await getTeamRepositoryIds(teamId) : null;
  const repoFilter = repositoryIds ? { repositoryId: { in: repositoryIds } } : {};
  const now = new Date();

  const [openPRsWithAge, allPRsForHistory, commitsToMasterWithDates, reviewedPRs] = await Promise.all([
    db.pullRequest.findMany({
      where: { state: "OPEN", ...repoFilter },
      select: { createdAt: true },
    }),
    db.pullRequest.findMany({
      where: {
        createdAt: { lte: dateRange.endDate },
        ...repoFilter,
      },
      select: { createdAt: true, closedAt: true, state: true },
    }),
    db.commit.findMany({
      where: {
        committedAt: { gte: dateRange.startDate, lte: dateRange.endDate },
        branch: { in: [...MAIN_BRANCHES] },
        ...repoFilter,
      },
      select: { committedAt: true },
    }),
    db.pullRequest.findMany({
      where: {
        createdAt: { gte: dateRange.startDate, lte: dateRange.endDate },
        reviews: { some: {} },
        ...repoFilter,
      },
      select: {
        createdAt: true,
        reviews: {
          select: { submittedAt: true },
          orderBy: { submittedAt: "asc" },
          take: 1,
        },
      },
    }),
  ]);

  const avgPrAgeDays =
    openPRsWithAge.length > 0 ? openPRsWithAge.reduce((sum, pr) => sum + (now.getTime() - pr.createdAt.getTime()), 0) / openPRsWithAge.length / MS_PER_DAY : null;

  const reviewTimes = reviewedPRs
    .filter((pr): pr is typeof pr & { reviews: [{ submittedAt: Date }] } => pr.reviews.length > 0 && pr.reviews[0].submittedAt !== null)
    .map((pr) => ({
      date: pr.createdAt,
      value: (pr.reviews[0].submittedAt.getTime() - pr.createdAt.getTime()) / MS_PER_HOUR,
    }))
    .filter((r) => r.value >= 0);

  const avgTimeToReviewHours = reviewTimes.length > 0 ? reviewTimes.reduce((sum, r) => sum + r.value, 0) / reviewTimes.length : null;

  const timeToReviewChart = aggregateAverageByDay(reviewTimes, dateRange);

  const { openPRsChart, avgPrAgeChart } = computePRHistoryCharts(allPRsForHistory, dateRange);

  return {
    avgPrAgeDays: avgPrAgeDays ? Math.round(avgPrAgeDays * 10) / 10 : null,
    avgPrAgeChart,
    openPRs: openPRsWithAge.length,
    openPRsChart,
    commitsToMaster: commitsToMasterWithDates.length,
    commitsToMasterChart: aggregateCountByDay(commitsToMasterWithDates, "committedAt", dateRange),
    avgTimeToReviewHours: avgTimeToReviewHours ? Math.round(avgTimeToReviewHours * 10) / 10 : null,
    timeToReviewChart,
  };
}

function computePRHistoryCharts(
  prs: { createdAt: Date; closedAt: Date | null; state: string }[],
  dateRange: DateRange
): { openPRsChart: ChartDataPoint[]; avgPrAgeChart: ChartDataPoint[] } {
  const openPRsChart: ChartDataPoint[] = [];
  const avgPrAgeChart: ChartDataPoint[] = [];

  const current = new Date(dateRange.startDate);
  while (current <= dateRange.endDate) {
    const dayEnd = new Date(current);
    dayEnd.setHours(23, 59, 59, 999);

    const openOnDay = prs.filter((pr) => {
      const wasCreated = pr.createdAt <= dayEnd;
      const wasOpen = pr.closedAt === null || pr.closedAt > dayEnd;
      return wasCreated && wasOpen;
    });

    const count = openOnDay.length;
    openPRsChart.push({ date: current.toISOString().split("T")[0], value: count });

    if (count > 0) {
      const totalAgeDays = openOnDay.reduce((sum, pr) => sum + (dayEnd.getTime() - pr.createdAt.getTime()) / MS_PER_DAY, 0);
      avgPrAgeChart.push({ date: current.toISOString().split("T")[0], value: Math.round((totalAgeDays / count) * 10) / 10 });
    } else {
      avgPrAgeChart.push({ date: current.toISOString().split("T")[0], value: 0 });
    }

    current.setDate(current.getDate() + 1);
  }

  return { openPRsChart, avgPrAgeChart };
}

export async function fetchOperationalMetrics(dateRange: DateRange, teamId: string | null): Promise<OperationalMetrics> {
  const repositoryIds = teamId ? await getTeamRepositoryIds(teamId) : null;
  const pipelineRepoFilter = repositoryIds ? { pipeline: { repositoryId: { in: repositoryIds } } } : {};

  const [masterRuns, prRuns, masterFailedStages, prFailedStages] = await Promise.all([
    db.pipelineRun.findMany({
      where: {
        status: { in: ["SUCCESS", "FAILED"] },
        branch: { in: [...MAIN_BRANCHES] },
        completedAt: { gte: dateRange.startDate, lte: dateRange.endDate },
        ...pipelineRepoFilter,
      },
      select: { status: true, durationMs: true, completedAt: true },
    }),
    db.pipelineRun.findMany({
      where: {
        status: { in: ["SUCCESS", "FAILED"] },
        branch: { notIn: [...MAIN_BRANCHES] },
        completedAt: { gte: dateRange.startDate, lte: dateRange.endDate },
        ...pipelineRepoFilter,
      },
      select: { status: true, durationMs: true, completedAt: true },
    }),
    db.pipelineStage.groupBy({
      by: ["name"],
      where: {
        pipelineRun: {
          branch: { in: [...MAIN_BRANCHES] },
          completedAt: { gte: dateRange.startDate, lte: dateRange.endDate },
          ...pipelineRepoFilter,
        },
        status: "FAILED",
      },
      _count: true,
    }),
    db.pipelineStage.groupBy({
      by: ["name"],
      where: {
        pipelineRun: {
          branch: { notIn: [...MAIN_BRANCHES] },
          completedAt: { gte: dateRange.startDate, lte: dateRange.endDate },
          ...pipelineRepoFilter,
        },
        status: "FAILED",
      },
      _count: true,
    }),
  ]);

  const masterSuccessRate = calculateSuccessRate(masterRuns);
  const prSuccessRate = calculateSuccessRate(prRuns);

  const masterSuccessfulRuns = masterRuns.filter((r) => r.status === "SUCCESS" && r.durationMs !== null && r.completedAt !== null);
  const prSuccessfulRuns = prRuns.filter((r) => r.status === "SUCCESS" && r.durationMs !== null && r.completedAt !== null);

  const masterDurations = masterSuccessfulRuns.map((r) => r.durationMs as number);
  const prDurationsArr = prSuccessfulRuns.map((r) => r.durationMs as number);

  const masterAvgDurationMs = masterDurations.length > 0 ? Math.round(masterDurations.reduce((sum, d) => sum + d, 0) / masterDurations.length) : null;
  const prAvgDurationMs = prDurationsArr.length > 0 ? Math.round(prDurationsArr.reduce((sum, d) => sum + d, 0) / prDurationsArr.length) : null;

  const masterDurationChart = aggregateAverageByDay(
    masterSuccessfulRuns.map((r) => ({ date: r.completedAt as Date, value: (r.durationMs as number) / 60000 })),
    dateRange
  );
  const prDurationChart = aggregateAverageByDay(
    prSuccessfulRuns.map((r) => ({ date: r.completedAt as Date, value: (r.durationMs as number) / 60000 })),
    dateRange
  );

  return {
    masterSuccessRate,
    prSuccessRate,
    masterSuccessRateChart: aggregateSuccessRateByDay(masterRuns, dateRange),
    prSuccessRateChart: aggregateSuccessRateByDay(prRuns, dateRange),
    masterAvgDurationMs,
    prAvgDurationMs,
    masterDurationChart,
    prDurationChart,
    masterFailureSteps: masterFailedStages.map((s) => ({ name: s.name, value: s._count })).sort((a, b) => b.value - a.value),
    prFailureSteps: prFailedStages.map((s) => ({ name: s.name, value: s._count })).sort((a, b) => b.value - a.value),
  };
}

function calculateSuccessRate(runs: { status: string }[]): number | null {
  const successCount = runs.filter((r) => r.status === "SUCCESS").length;
  const total = runs.length;
  return total > 0 ? Math.round((successCount / total) * 1000) / 10 : null;
}

export async function fetchQualityMetrics(dateRange: DateRange, teamId: string | null): Promise<QualityMetrics> {
  const repositoryIds = teamId ? await getTeamRepositoryIds(teamId) : null;

  const [latestScans, historicalScans] = await Promise.all([
    repositoryIds
      ? db.$queryRaw<QualityScanRow[]>`
			SELECT DISTINCT ON (repository_id)
				repository_id as "repositoryId",
				coverage_percent as "coveragePercent",
				bugs_count as "bugsCount"
			FROM analysis.quality_scan
			WHERE scanned_at <= ${dateRange.endDate}
			AND repository_id = ANY(${repositoryIds})
			ORDER BY repository_id, scanned_at DESC
		`
      : db.$queryRaw<QualityScanRow[]>`
			SELECT DISTINCT ON (repository_id)
				repository_id as "repositoryId",
				coverage_percent as "coveragePercent",
				bugs_count as "bugsCount"
			FROM analysis.quality_scan
			WHERE scanned_at <= ${dateRange.endDate}
			ORDER BY repository_id, scanned_at DESC
		`,
    repositoryIds
      ? db.$queryRaw<QualityScanHistoryRow[]>`
			SELECT scanned_at as "scannedAt", coverage_percent as "coveragePercent", bugs_count as "bugsCount"
			FROM analysis.quality_scan
			WHERE scanned_at >= ${dateRange.startDate} AND scanned_at <= ${dateRange.endDate}
			AND repository_id = ANY(${repositoryIds})
			ORDER BY scanned_at ASC
		`
      : db.$queryRaw<QualityScanHistoryRow[]>`
			SELECT scanned_at as "scannedAt", coverage_percent as "coveragePercent", bugs_count as "bugsCount"
			FROM analysis.quality_scan
			WHERE scanned_at >= ${dateRange.startDate} AND scanned_at <= ${dateRange.endDate}
			ORDER BY scanned_at ASC
		`,
  ]);

  type ScanWithCoverage = QualityScanRow & { coveragePercent: number };
  const scansWithCoverage = latestScans.filter((s): s is ScanWithCoverage => s.coveragePercent !== null);
  const overallCoverage = scansWithCoverage.length > 0 ? scansWithCoverage.reduce((sum, s) => sum + s.coveragePercent, 0) / scansWithCoverage.length : null;

  const totalBugsCount = latestScans.reduce((sum, s) => sum + (s.bugsCount || 0), 0);

  type HistoricalScanWithCoverage = QualityScanHistoryRow & { coveragePercent: number };
  const coverageChart = aggregateAverageByDay(
    historicalScans.filter((s): s is HistoricalScanWithCoverage => s.coveragePercent !== null).map((s) => ({ date: s.scannedAt, value: s.coveragePercent })),
    dateRange
  );

  const bugsChart = aggregateSumByDay(
    historicalScans.map((s) => ({ date: s.scannedAt, value: s.bugsCount || 0 })),
    dateRange
  );

  return {
    overallCoverage: overallCoverage ? Math.round(overallCoverage * 10) / 10 : null,
    coverageChart,
    bugsCount: totalBugsCount,
    bugsChart,
  };
}

export async function fetchTicketMetrics(dateRange: DateRange, teamId: string | null): Promise<TicketMetrics> {
  const projectIds = teamId ? await getTeamProjectIds(teamId) : null;
  const projectFilter = projectIds ? { projectId: { in: projectIds } } : {};
  const now = new Date();

  const [activeIssues, completedIssuesWithDates, allIssuesForHistory, statusTransitions] = await Promise.all([
    db.issue.findMany({
      where: {
        status: { in: [...ACTIVE_ISSUE_STATUSES] },
        ...projectFilter,
      },
      select: { id: true, createdAt: true, status: true },
    }),
    db.issue.findMany({
      where: {
        status: "DONE",
        resolvedAt: { gte: dateRange.startDate, lte: dateRange.endDate },
        ...projectFilter,
      },
      select: { resolvedAt: true },
    }),
    db.issue.findMany({
      where: {
        createdAt: { lte: dateRange.endDate },
        ...projectFilter,
      },
      select: { createdAt: true, resolvedAt: true, status: true },
    }),
    db.issueStatusTransition.findMany({
      where: {
        issue: {
          status: { in: [...ACTIVE_ISSUE_STATUSES] },
          ...projectFilter,
        },
      },
      select: { issueId: true, toStatus: true, transitionedAt: true },
      orderBy: { transitionedAt: "asc" },
    }),
  ]);

  const avgActiveTicketAgeDays =
    activeIssues.length > 0 ? activeIssues.reduce((sum, issue) => sum + (now.getTime() - issue.createdAt.getTime()), 0) / activeIssues.length / MS_PER_DAY : null;

  const cumulativeTimeInColumnHours = calculateCumulativeTimeInColumn(statusTransitions, now);

  type IssueWithResolvedAt = { resolvedAt: Date };
  const completedChart = aggregateCountByDay(
    completedIssuesWithDates.filter((i): i is IssueWithResolvedAt => i.resolvedAt !== null),
    "resolvedAt",
    dateRange
  );

  const { activeCountChart, avgActiveTicketAgeChart } = computeTicketHistoryCharts(allIssuesForHistory, dateRange);

  return {
    avgActiveTicketAgeDays: avgActiveTicketAgeDays ? Math.round(avgActiveTicketAgeDays * 10) / 10 : null,
    avgActiveTicketAgeChart,
    activeCount: activeIssues.length,
    activeCountChart,
    completedCount: completedIssuesWithDates.length,
    completedChart,
    cumulativeTimeInColumnHours: cumulativeTimeInColumnHours ? Math.round(cumulativeTimeInColumnHours * 10) / 10 : null,
  };
}

function computeTicketHistoryCharts(
  issues: { createdAt: Date; resolvedAt: Date | null; status: string }[],
  dateRange: DateRange
): { activeCountChart: ChartDataPoint[]; avgActiveTicketAgeChart: ChartDataPoint[] } {
  const activeCountChart: ChartDataPoint[] = [];
  const avgActiveTicketAgeChart: ChartDataPoint[] = [];

  const current = new Date(dateRange.startDate);
  while (current <= dateRange.endDate) {
    const dayEnd = new Date(current);
    dayEnd.setHours(23, 59, 59, 999);

    const activeOnDay = issues.filter((issue) => {
      const wasCreated = issue.createdAt <= dayEnd;
      const wasActive = issue.resolvedAt === null || issue.resolvedAt > dayEnd;
      return wasCreated && wasActive;
    });

    const count = activeOnDay.length;
    activeCountChart.push({ date: current.toISOString().split("T")[0], value: count });

    if (count > 0) {
      const totalAgeDays = activeOnDay.reduce((sum, issue) => sum + (dayEnd.getTime() - issue.createdAt.getTime()) / MS_PER_DAY, 0);
      avgActiveTicketAgeChart.push({ date: current.toISOString().split("T")[0], value: Math.round((totalAgeDays / count) * 10) / 10 });
    } else {
      avgActiveTicketAgeChart.push({ date: current.toISOString().split("T")[0], value: 0 });
    }

    current.setDate(current.getDate() + 1);
  }

  return { activeCountChart, avgActiveTicketAgeChart };
}

function calculateCumulativeTimeInColumn(transitions: { issueId: string; toStatus: string; transitionedAt: Date }[], now: Date): number | null {
  if (transitions.length === 0) return null;

  const issueTransitions = new Map<string, { toStatus: string; transitionedAt: Date }[]>();
  for (const t of transitions) {
    const list = issueTransitions.get(t.issueId) || [];
    list.push({ toStatus: t.toStatus, transitionedAt: t.transitionedAt });
    issueTransitions.set(t.issueId, list);
  }

  let totalMs = 0;
  for (const [, issueTs] of issueTransitions) {
    for (let i = 0; i < issueTs.length; i++) {
      const endTime = i < issueTs.length - 1 ? issueTs[i + 1].transitionedAt.getTime() : now.getTime();
      totalMs += endTime - issueTs[i].transitionedAt.getTime();
    }
  }

  return totalMs / (1000 * 60 * 60);
}

export async function fetchSecurityMetrics(dateRange: DateRange, teamId: string | null): Promise<SecurityMetrics> {
  const repositoryIds = teamId ? await getTeamRepositoryIds(teamId) : null;
  const repoFilter = repositoryIds ? { repositoryId: { in: repositoryIds } } : {};

  const [openVulnerabilities, resolvedVulnerabilities] = await Promise.all([
    db.securityVulnerability.groupBy({
      by: ["severity"],
      where: {
        status: { in: ["OPEN", "IN_PROGRESS"] },
        ...repoFilter,
      },
      _count: true,
    }),
    db.securityVulnerability.findMany({
      where: {
        status: "RESOLVED",
        resolvedAt: { not: null },
        discoveredAt: { gte: dateRange.startDate, lte: dateRange.endDate },
        ...repoFilter,
      },
      select: { discoveredAt: true, resolvedAt: true },
    }),
  ]);

  const cveBySeverity: SeverityCount = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };

  for (const v of openVulnerabilities) {
    const key = v.severity.toLowerCase() as keyof SeverityCount;
    if (key in cveBySeverity) {
      cveBySeverity[key] = v._count;
    }
  }

  type VulnWithResolvedAt = { discoveredAt: Date; resolvedAt: Date };
  const vulnsWithResolvedAt = resolvedVulnerabilities.filter((v): v is VulnWithResolvedAt => v.resolvedAt !== null);

  const avgTimeToCloseDays =
    vulnsWithResolvedAt.length > 0
      ? vulnsWithResolvedAt.reduce((sum, v) => sum + (v.resolvedAt.getTime() - v.discoveredAt.getTime()), 0) / vulnsWithResolvedAt.length / MS_PER_DAY
      : null;

  const timeToCloseChart = aggregateAverageByDay(
    vulnsWithResolvedAt.map((v) => ({
      date: v.resolvedAt,
      value: (v.resolvedAt.getTime() - v.discoveredAt.getTime()) / MS_PER_DAY,
    })),
    dateRange
  );

  return {
    cveBySeverity,
    avgTimeToCloseDays: avgTimeToCloseDays ? Math.round(avgTimeToCloseDays * 10) / 10 : null,
    timeToCloseChart,
  };
}

function initializeDayMap(dateRange: DateRange): Map<string, number> {
  const dayMap = new Map<string, number>();
  const current = new Date(dateRange.startDate);
  while (current <= dateRange.endDate) {
    dayMap.set(current.toISOString().split("T")[0], 0);
    current.setDate(current.getDate() + 1);
  }
  return dayMap;
}

function aggregateCountByDay<T extends Record<string, unknown>>(data: T[], dateField: keyof T, dateRange: DateRange): ChartDataPoint[] {
  const dayMap = initializeDayMap(dateRange);

  for (const item of data) {
    const dateValue = item[dateField];
    if (dateValue instanceof Date) {
      const day = dateValue.toISOString().split("T")[0];
      if (dayMap.has(day)) {
        dayMap.set(day, (dayMap.get(day) || 0) + 1);
      }
    }
  }

  return Array.from(dayMap.entries()).map(([date, value]) => ({ date, value }));
}

function aggregateUniqueByDay<T extends Record<string, unknown>>(data: T[], dateField: keyof T, uniqueField: keyof T, dateRange: DateRange): ChartDataPoint[] {
  const dayMap = initializeDayMap(dateRange);
  const uniqueByDay = new Map<string, Set<unknown>>();

  for (const item of data) {
    const dateValue = item[dateField];
    if (dateValue instanceof Date) {
      const day = dateValue.toISOString().split("T")[0];
      if (dayMap.has(day)) {
        const existing = uniqueByDay.get(day) ?? new Set();
        existing.add(item[uniqueField]);
        uniqueByDay.set(day, existing);
      }
    }
  }

  for (const [day, uniqueSet] of uniqueByDay) {
    dayMap.set(day, uniqueSet.size);
  }

  return Array.from(dayMap.entries()).map(([date, value]) => ({ date, value }));
}

function aggregateAverageByDay(data: { date: Date; value: number }[], dateRange: DateRange): ChartDataPoint[] {
  const dayValues = new Map<string, number[]>();
  const dayMap = initializeDayMap(dateRange);

  for (const item of data) {
    const day = item.date.toISOString().split("T")[0];
    if (dayMap.has(day)) {
      const existing = dayValues.get(day) ?? [];
      existing.push(item.value);
      dayValues.set(day, existing);
    }
  }

  for (const [day, values] of dayValues) {
    if (values.length > 0) {
      const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
      dayMap.set(day, Math.round(avg * 10) / 10);
    }
  }

  return Array.from(dayMap.entries()).map(([date, value]) => ({ date, value }));
}

function aggregateSumByDay(data: { date: Date; value: number }[], dateRange: DateRange): ChartDataPoint[] {
  const dayMap = initializeDayMap(dateRange);

  for (const item of data) {
    const day = item.date.toISOString().split("T")[0];
    if (dayMap.has(day)) {
      dayMap.set(day, (dayMap.get(day) || 0) + item.value);
    }
  }

  return Array.from(dayMap.entries()).map(([date, value]) => ({ date, value }));
}

function aggregateSuccessRateByDay(runs: { status: string; completedAt: Date | null }[], dateRange: DateRange): ChartDataPoint[] {
  const dayMap = initializeDayMap(dateRange);
  const dayRuns = new Map<string, { success: number; total: number }>();

  for (const run of runs) {
    if (!run.completedAt) continue;
    const day = run.completedAt.toISOString().split("T")[0];
    if (dayMap.has(day)) {
      const stats = dayRuns.get(day) ?? { success: 0, total: 0 };
      stats.total++;
      if (run.status === "SUCCESS") {
        stats.success++;
      }
      dayRuns.set(day, stats);
    }
  }

  for (const [day, stats] of dayRuns) {
    if (stats.total > 0) {
      dayMap.set(day, Math.round((stats.success / stats.total) * 1000) / 10);
    }
  }

  return Array.from(dayMap.entries()).map(([date, value]) => ({ date, value }));
}

interface QualityScanRow {
  repositoryId: string;
  coveragePercent: number | null;
  bugsCount: number | null;
}

interface QualityScanHistoryRow {
  scannedAt: Date;
  coveragePercent: number | null;
  bugsCount: number | null;
}

interface SeverityCount {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface OverviewMetrics {
  repositories: number;
  contributors: { count: number; trend: TrendValue; chart: ChartDataPoint[] };
  commits: { count: number; trend: TrendValue; chart: ChartDataPoint[] };
  pullRequests: { count: number; trend: TrendValue; chart: ChartDataPoint[] };
}

export interface DeliveryMetrics {
  avgPrAgeDays: number | null;
  avgPrAgeChart: ChartDataPoint[];
  openPRs: number;
  openPRsChart: ChartDataPoint[];
  commitsToMaster: number;
  commitsToMasterChart: ChartDataPoint[];
  avgTimeToReviewHours: number | null;
  timeToReviewChart: ChartDataPoint[];
}

export interface TicketMetrics {
  avgActiveTicketAgeDays: number | null;
  avgActiveTicketAgeChart: ChartDataPoint[];
  activeCount: number;
  activeCountChart: ChartDataPoint[];
  completedCount: number;
  completedChart: ChartDataPoint[];
  cumulativeTimeInColumnHours: number | null;
}

export interface OperationalMetrics {
  masterSuccessRate: number | null;
  prSuccessRate: number | null;
  masterSuccessRateChart: ChartDataPoint[];
  prSuccessRateChart: ChartDataPoint[];
  masterAvgDurationMs: number | null;
  prAvgDurationMs: number | null;
  masterDurationChart: ChartDataPoint[];
  prDurationChart: ChartDataPoint[];
  masterFailureSteps: { name: string; value: number }[];
  prFailureSteps: { name: string; value: number }[];
}

export interface QualityMetrics {
  overallCoverage: number | null;
  coverageChart: ChartDataPoint[];
  bugsCount: number;
  bugsChart: ChartDataPoint[];
}

export interface SecurityMetrics {
  cveBySeverity: SeverityCount;
  avgTimeToCloseDays: number | null;
  timeToCloseChart: ChartDataPoint[];
}

export interface DashboardData {
  overview: OverviewMetrics;
  delivery: DeliveryMetrics;
  tickets: TicketMetrics;
  operational: OperationalMetrics;
  quality: QualityMetrics;
  security: SecurityMetrics;
}

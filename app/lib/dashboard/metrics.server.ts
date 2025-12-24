import { db } from "~/db.server.js";
import { type ChartDataPoint, calculateTrend, type DateRange, type TrendValue } from "./date-range.js";

const ACTIVE_ISSUE_STATUSES = ["TODO", "IN_PROGRESS", "IN_REVIEW", "BLOCKED"] as const;
const MAIN_BRANCHES = ["main", "master"] as const;

export async function fetchOverviewMetrics(dateRange: DateRange, previousRange: DateRange, teamId: string | null): Promise<OverviewMetrics> {
  const repositoryIds = teamId ? await getTeamRepositoryIds(teamId) : null;
  const repoFilter = repositoryIds ? { repositoryId: { in: repositoryIds } } : {};
  const repoIdFilter = repositoryIds ? { id: { in: repositoryIds } } : {};

  const [repositories, currentContributors, previousContributors, currentCommits, previousCommits, currentPRs, previousPRs] = await Promise.all([
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

export async function fetchDeliveryMetrics(dateRange: DateRange, previousRange: DateRange, teamId: string | null): Promise<DeliveryMetrics> {
  const repositoryIds = teamId ? await getTeamRepositoryIds(teamId) : null;
  const repoFilter = repositoryIds ? { repositoryId: { in: repositoryIds } } : {};
  const pipelineRepoFilter = repositoryIds ? { pipeline: { repositoryId: { in: repositoryIds } } } : {};
  const now = new Date();

  const [openPRsWithAge, commitsToMaster, prsWithFirstReview] = await Promise.all([
    db.pullRequest.findMany({
      where: { state: "OPEN", ...repoFilter },
      select: { createdAt: true },
    }),
    db.commit.count({
      where: {
        committedAt: { gte: dateRange.startDate, lte: dateRange.endDate },
        branch: { in: [...MAIN_BRANCHES] },
        ...repoFilter,
      },
    }),
    db.pullRequest.findMany({
      where: {
        state: "OPEN",
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
    openPRsWithAge.length > 0 ? openPRsWithAge.reduce((sum, pr) => sum + (now.getTime() - pr.createdAt.getTime()), 0) / openPRsWithAge.length / (1000 * 60 * 60 * 24) : null;

  const prsWithValidReview = prsWithFirstReview.filter((pr) => pr.reviews.length > 0 && pr.reviews[0].submittedAt);
  const avgTimeToReviewHours =
    prsWithValidReview.length > 0
      ? prsWithValidReview.reduce((sum, pr) => sum + (pr.reviews[0].submittedAt!.getTime() - pr.createdAt.getTime()), 0) / prsWithValidReview.length / (1000 * 60 * 60)
      : null;

  return {
    avgPrAgeDays: avgPrAgeDays ? Math.round(avgPrAgeDays * 10) / 10 : null,
    openPRs: openPRsWithAge.length,
    commitsToMaster,
    avgTimeToReviewHours: avgTimeToReviewHours ? Math.round(avgTimeToReviewHours * 10) / 10 : null,
  };
}

export async function fetchOperationalMetrics(dateRange: DateRange, teamId: string | null): Promise<OperationalMetrics> {
  const repositoryIds = teamId ? await getTeamRepositoryIds(teamId) : null;
  const pipelineRepoFilter = repositoryIds ? { pipeline: { repositoryId: { in: repositoryIds } } } : {};

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [masterRuns, prRuns, masterFailedStages, prFailedStages] = await Promise.all([
    db.pipelineRun.findMany({
      where: {
        status: { in: ["SUCCESS", "FAILED"] },
        branch: { in: [...MAIN_BRANCHES] },
        completedAt: { gte: sevenDaysAgo },
        ...pipelineRepoFilter,
      },
      select: { status: true, durationMs: true },
    }),
    db.pipelineRun.findMany({
      where: {
        status: { in: ["SUCCESS", "FAILED"] },
        branch: { notIn: [...MAIN_BRANCHES] },
        completedAt: { gte: sevenDaysAgo },
        ...pipelineRepoFilter,
      },
      select: { status: true, durationMs: true },
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

  const masterSuccessfulRuns = masterRuns.filter((r) => r.status === "SUCCESS" && r.durationMs !== null);
  const prSuccessfulRuns = prRuns.filter((r) => r.status === "SUCCESS" && r.durationMs !== null);

  const masterAvgDurationMs = masterSuccessfulRuns.length > 0 ? Math.round(masterSuccessfulRuns.reduce((sum, r) => sum + r.durationMs!, 0) / masterSuccessfulRuns.length) : null;
  const prAvgDurationMs = prSuccessfulRuns.length > 0 ? Math.round(prSuccessfulRuns.reduce((sum, r) => sum + r.durationMs!, 0) / prSuccessfulRuns.length) : null;

  return {
    masterSuccessRate,
    prSuccessRate,
    masterAvgDurationMs,
    prAvgDurationMs,
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
  const repoFilter = repositoryIds ? { repositoryId: { in: repositoryIds } } : {};

  const latestScans = repositoryIds
    ? await db.$queryRaw<QualityScanRow[]>`
		SELECT DISTINCT ON (repository_id)
			repository_id as "repositoryId",
			coverage_percent as "coveragePercent",
			bugs_count as "bugsCount"
		FROM analysis.quality_scan
		WHERE scanned_at <= ${dateRange.endDate}
		AND repository_id = ANY(${repositoryIds})
		ORDER BY repository_id, scanned_at DESC
	`
    : await db.$queryRaw<QualityScanRow[]>`
		SELECT DISTINCT ON (repository_id)
			repository_id as "repositoryId",
			coverage_percent as "coveragePercent",
			bugs_count as "bugsCount"
		FROM analysis.quality_scan
		WHERE scanned_at <= ${dateRange.endDate}
		ORDER BY repository_id, scanned_at DESC
	`;

  const scansWithCoverage = latestScans.filter((s) => s.coveragePercent !== null);
  const overallCoverage = scansWithCoverage.length > 0 ? scansWithCoverage.reduce((sum, s) => sum + s.coveragePercent!, 0) / scansWithCoverage.length : null;

  const totalBugsCount = latestScans.reduce((sum, s) => sum + (s.bugsCount || 0), 0);

  return {
    overallCoverage: overallCoverage ? Math.round(overallCoverage * 10) / 10 : null,
    bugsCount: totalBugsCount,
  };
}

export async function fetchTicketMetrics(dateRange: DateRange, teamId: string | null): Promise<TicketMetrics> {
  const projectIds = teamId ? await getTeamProjectIds(teamId) : null;
  const projectFilter = projectIds ? { projectId: { in: projectIds } } : {};
  const now = new Date();

  const [activeIssues, completedIssues, statusTransitions] = await Promise.all([
    db.issue.findMany({
      where: {
        status: { in: [...ACTIVE_ISSUE_STATUSES] },
        ...projectFilter,
      },
      select: { id: true, createdAt: true, status: true },
    }),
    db.issue.count({
      where: {
        status: "DONE",
        resolvedAt: { gte: dateRange.startDate, lte: dateRange.endDate },
        ...projectFilter,
      },
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
    activeIssues.length > 0 ? activeIssues.reduce((sum, issue) => sum + (now.getTime() - issue.createdAt.getTime()), 0) / activeIssues.length / (1000 * 60 * 60 * 24) : null;

  const cumulativeTimeInColumnHours = calculateCumulativeTimeInColumn(statusTransitions, now);

  return {
    avgActiveTicketAgeDays: avgActiveTicketAgeDays ? Math.round(avgActiveTicketAgeDays * 10) / 10 : null,
    activeCount: activeIssues.length,
    completedCount: completedIssues,
    cumulativeTimeInColumnHours: cumulativeTimeInColumnHours ? Math.round(cumulativeTimeInColumnHours * 10) / 10 : null,
  };
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

  const avgTimeToCloseDays =
    resolvedVulnerabilities.length > 0
      ? resolvedVulnerabilities.reduce((sum, v) => sum + (v.resolvedAt!.getTime() - v.discoveredAt.getTime()), 0) / resolvedVulnerabilities.length / (1000 * 60 * 60 * 24)
      : null;

  return {
    cveBySeverity,
    avgTimeToCloseDays: avgTimeToCloseDays ? Math.round(avgTimeToCloseDays * 10) / 10 : null,
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
  contributors: { count: number; trend: TrendValue };
  commits: { count: number; trend: TrendValue };
  pullRequests: { count: number; trend: TrendValue };
}

export interface DeliveryMetrics {
  avgPrAgeDays: number | null;
  openPRs: number;
  commitsToMaster: number;
  avgTimeToReviewHours: number | null;
}

export interface TicketMetrics {
  avgActiveTicketAgeDays: number | null;
  activeCount: number;
  completedCount: number;
  cumulativeTimeInColumnHours: number | null;
}

export interface OperationalMetrics {
  masterSuccessRate: number | null;
  prSuccessRate: number | null;
  masterAvgDurationMs: number | null;
  prAvgDurationMs: number | null;
  masterFailureSteps: { name: string; value: number }[];
  prFailureSteps: { name: string; value: number }[];
}

export interface QualityMetrics {
  overallCoverage: number | null;
  bugsCount: number;
}

export interface SecurityMetrics {
  cveBySeverity: SeverityCount;
  avgTimeToCloseDays: number | null;
}

export interface DashboardData {
  overview: OverviewMetrics;
  delivery: DeliveryMetrics;
  tickets: TicketMetrics;
  operational: OperationalMetrics;
  quality: QualityMetrics;
  security: SecurityMetrics;
}

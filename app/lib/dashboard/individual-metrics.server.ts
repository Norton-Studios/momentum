import { db } from "~/db.server.js";
import type { ChartDataPoint, DateRange } from "./date-range.js";

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const MS_PER_HOUR = 1000 * 60 * 60;

export async function fetchContributors(): Promise<ContributorOption[]> {
  return db.contributor.findMany({
    select: { id: true, name: true, username: true, avatarUrl: true },
    orderBy: { name: "asc" },
  });
}

export async function fetchCommitMetrics(contributorId: string, dateRange: DateRange): Promise<CommitMetrics> {
  const commits = await db.commit.findMany({
    where: {
      authorId: contributorId,
      committedAt: { gte: dateRange.startDate, lte: dateRange.endDate },
    },
    select: {
      committedAt: true,
      linesAdded: true,
      linesRemoved: true,
      filesChanged: true,
    },
  });

  const days = Math.max(1, Math.ceil((dateRange.endDate.getTime() - dateRange.startDate.getTime()) / MS_PER_DAY));
  const dailyAverage = commits.length > 0 ? Math.round((commits.length / days) * 10) / 10 : 0;

  return {
    total: commits.length,
    dailyAverage,
    linesAdded: commits.reduce((sum, c) => sum + c.linesAdded, 0),
    linesRemoved: commits.reduce((sum, c) => sum + c.linesRemoved, 0),
    filesChanged: commits.reduce((sum, c) => sum + c.filesChanged, 0),
    chart: aggregateCountByDay(commits, "committedAt", dateRange),
  };
}

export async function fetchPullRequestMetrics(contributorId: string, dateRange: DateRange): Promise<PRMetrics> {
  const [created, merged] = await Promise.all([
    db.pullRequest.findMany({
      where: {
        authorId: contributorId,
        createdAt: { gte: dateRange.startDate, lte: dateRange.endDate },
      },
      select: { id: true, state: true, createdAt: true, iterationCount: true },
    }),
    db.pullRequest.count({
      where: {
        authorId: contributorId,
        state: "MERGED",
        mergedAt: { gte: dateRange.startDate, lte: dateRange.endDate },
      },
    }),
  ]);

  const mergeRate = created.length > 0 ? Math.round((merged / created.length) * 1000) / 10 : null;
  const avgIterations = created.length > 0 ? Math.round((created.reduce((sum, pr) => sum + pr.iterationCount, 0) / created.length) * 10) / 10 : null;

  return {
    created: created.length,
    merged,
    mergeRate,
    avgIterations,
    chart: aggregateCountByDay(created, "createdAt", dateRange),
  };
}

export async function fetchReviewMetrics(contributorId: string, dateRange: DateRange): Promise<ReviewMetrics> {
  const reviews = await db.pullRequestReview.findMany({
    where: {
      reviewerId: contributorId,
      submittedAt: { gte: dateRange.startDate, lte: dateRange.endDate },
    },
    select: {
      submittedAt: true,
      pullRequest: { select: { createdAt: true } },
    },
  });

  const reviewTimes = reviews.filter((r) => r.pullRequest).map((r) => (r.submittedAt.getTime() - r.pullRequest.createdAt.getTime()) / MS_PER_HOUR);

  const avgTimeToReviewHours = reviewTimes.length > 0 ? Math.round((reviewTimes.reduce((a, b) => a + b, 0) / reviewTimes.length) * 10) / 10 : null;

  return {
    count: reviews.length,
    avgTimeToReviewHours,
    chart: aggregateCountByDay(reviews, "submittedAt", dateRange),
  };
}

export async function fetchStreakData(contributorId: string): Promise<StreakData> {
  const commits = await db.commit.findMany({
    where: { authorId: contributorId },
    select: { committedAt: true },
    orderBy: { committedAt: "desc" },
  });

  const uniqueDates = [...new Set(commits.map((c) => c.committedAt.toISOString().split("T")[0]))].sort().reverse();

  const currentStreak = calculateCurrentStreak(uniqueDates);
  const longestStreak = calculateLongestStreak(uniqueDates);

  return { currentStreak, longestStreak };
}

function calculateCurrentStreak(sortedDatesDesc: string[]): number {
  if (sortedDatesDesc.length === 0) return 0;

  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - MS_PER_DAY).toISOString().split("T")[0];

  if (sortedDatesDesc[0] !== today && sortedDatesDesc[0] !== yesterday) {
    return 0;
  }

  let streak = 1;
  for (let i = 1; i < sortedDatesDesc.length; i++) {
    const current = new Date(sortedDatesDesc[i - 1]);
    const prev = new Date(sortedDatesDesc[i]);
    const diffDays = (current.getTime() - prev.getTime()) / MS_PER_DAY;

    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function calculateLongestStreak(sortedDatesDesc: string[]): number {
  if (sortedDatesDesc.length === 0) return 0;

  const sortedAsc = [...sortedDatesDesc].reverse();
  let longest = 1;
  let current = 1;

  for (let i = 1; i < sortedAsc.length; i++) {
    const prev = new Date(sortedAsc[i - 1]);
    const curr = new Date(sortedAsc[i]);
    const diffDays = (curr.getTime() - prev.getTime()) / MS_PER_DAY;

    if (diffDays === 1) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }
  return longest;
}

export async function fetchAchievements(contributorId: string, streakData: StreakData): Promise<Achievement[]> {
  const [totalCommits, firstMergedPR, totalReviews] = await Promise.all([
    db.commit.count({ where: { authorId: contributorId } }),
    db.pullRequest.findFirst({
      where: { authorId: contributorId, state: "MERGED" },
      orderBy: { mergedAt: "asc" },
    }),
    db.pullRequestReview.count({ where: { reviewerId: contributorId } }),
  ]);

  const achievements: Achievement[] = [];

  if (totalCommits >= 1) {
    achievements.push({ id: "first-commit", name: "First Commit", icon: "commit", earned: true });
  }
  if (totalCommits >= 100) {
    achievements.push({ id: "100-commits", name: "Century", icon: "century", earned: true, description: "100 commits" });
  }
  if (totalCommits >= 500) {
    achievements.push({ id: "500-commits", name: "500 Club", icon: "star", earned: true, description: "500 commits" });
  }
  if (totalCommits >= 1000) {
    achievements.push({ id: "1k-commits", name: "Prolific", icon: "trophy", earned: true, description: "1000 commits" });
  }

  if (firstMergedPR) {
    achievements.push({ id: "first-merged", name: "First Merge", icon: "merge", earned: true });
  }

  if (totalReviews >= 1) {
    achievements.push({ id: "first-review", name: "Reviewer", icon: "review", earned: true });
  }
  if (totalReviews >= 50) {
    achievements.push({ id: "50-reviews", name: "Code Guardian", icon: "shield", earned: true, description: "50 reviews" });
  }

  if (streakData.longestStreak >= 7) {
    achievements.push({ id: "7-day-streak", name: "Week Warrior", icon: "fire", earned: true, description: "7-day streak" });
  }
  if (streakData.longestStreak >= 30) {
    achievements.push({ id: "30-day-streak", name: "Monthly Master", icon: "calendar", earned: true, description: "30-day streak" });
  }

  return achievements;
}

export async function fetchHeatmapData(contributorId: string, dateRange: DateRange): Promise<HeatmapDay[]> {
  const commits = await db.commit.findMany({
    where: {
      authorId: contributorId,
      committedAt: { gte: dateRange.startDate, lte: dateRange.endDate },
    },
    select: { committedAt: true },
  });

  const dayMap = new Map<string, number>();
  for (const commit of commits) {
    const day = commit.committedAt.toISOString().split("T")[0];
    dayMap.set(day, (dayMap.get(day) || 0) + 1);
  }

  const result: HeatmapDay[] = [];
  const current = new Date(dateRange.startDate);
  let weekNumber = 0;
  let lastDayOfWeek = -1;

  while (current <= dateRange.endDate) {
    const dateStr = current.toISOString().split("T")[0];
    const dayOfWeek = current.getDay();

    if (dayOfWeek < lastDayOfWeek) {
      weekNumber++;
    }
    lastDayOfWeek = dayOfWeek;

    result.push({
      date: dateStr,
      count: dayMap.get(dateStr) || 0,
      dayOfWeek,
      weekNumber,
    });
    current.setDate(current.getDate() + 1);
  }

  return result;
}

export async function fetchDistributions(contributorId: string, dateRange: DateRange): Promise<Distributions> {
  const commits = await db.commit.findMany({
    where: {
      authorId: contributorId,
      committedAt: { gte: dateRange.startDate, lte: dateRange.endDate },
    },
    select: {
      repository: {
        select: { name: true, language: true },
      },
    },
  });

  const repoMap = new Map<string, number>();
  const langMap = new Map<string, number>();

  for (const commit of commits) {
    const repoName = commit.repository.name;
    repoMap.set(repoName, (repoMap.get(repoName) || 0) + 1);

    const lang = commit.repository.language || "Unknown";
    langMap.set(lang, (langMap.get(lang) || 0) + 1);
  }

  return {
    repositories: Array.from(repoMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10),
    languages: Array.from(langMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value),
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

export interface ContributorOption {
  id: string;
  name: string;
  username: string | null;
  avatarUrl: string | null;
}

export interface CommitMetrics {
  total: number;
  dailyAverage: number;
  linesAdded: number;
  linesRemoved: number;
  filesChanged: number;
  chart: ChartDataPoint[];
}

export interface PRMetrics {
  created: number;
  merged: number;
  mergeRate: number | null;
  avgIterations: number | null;
  chart: ChartDataPoint[];
}

export interface ReviewMetrics {
  count: number;
  avgTimeToReviewHours: number | null;
  chart: ChartDataPoint[];
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
}

export interface Achievement {
  id: string;
  name: string;
  icon: string;
  earned: boolean;
  description?: string;
}

export interface HeatmapDay {
  date: string;
  count: number;
  dayOfWeek: number;
  weekNumber: number;
}

export interface Distributions {
  repositories: { name: string; value: number }[];
  languages: { name: string; value: number }[];
}

export interface IndividualDashboardData {
  commits: CommitMetrics;
  pullRequests: PRMetrics;
  reviews: ReviewMetrics;
  streaks: StreakData;
  achievements: Achievement[];
  heatmap: HeatmapDay[];
  distributions: Distributions;
}

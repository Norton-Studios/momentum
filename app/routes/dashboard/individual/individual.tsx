import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { requireUser } from "~/auth/auth.server";
import { logout } from "~/auth/session.server";
import { AppLayout } from "~/components/app-layout/app-layout";
import { AchievementBadges } from "~/components/dashboard/achievement-badges/achievement-badges.js";
import { PieChart } from "~/components/dashboard/charts/pie-chart.js";
import { TrendBarChart } from "~/components/dashboard/charts/trend-bar-chart.js";
import { CommitHeatmap } from "~/components/dashboard/commit-heatmap/commit-heatmap.js";
import { ContributorSelector } from "~/components/dashboard/contributor-selector/contributor-selector.js";
import { DatePicker } from "~/components/dashboard/date-picker/date-picker.js";
import { StreakCard } from "~/components/dashboard/streak-card/streak-card.js";
import { parseDateRange } from "~/lib/dashboard/date-range.js";
import {
  fetchAchievements,
  fetchCommitMetrics,
  fetchContributors,
  fetchDistributions,
  fetchHeatmapData,
  fetchPullRequestMetrics,
  fetchReviewMetrics,
  fetchStreakData,
  type IndividualDashboardData,
} from "~/lib/dashboard/individual-metrics.server.js";
import "./individual.css";

export function meta() {
  return [
    { title: "Individual Dashboard - Momentum" },
    {
      name: "description",
      content: "Personal productivity metrics and achievements",
    },
  ];
}

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireUser(request);
  const url = new URL(request.url);
  const dateRange = parseDateRange(url.searchParams);
  const contributorId = url.searchParams.get("contributorId");

  const contributors = await fetchContributors();

  const selectedContributorId = contributorId || contributors[0]?.id;

  if (!selectedContributorId) {
    return {
      user,
      contributors,
      selectedContributorId: null,
      dateRange: {
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString(),
        preset: dateRange.preset,
      },
      data: null,
    };
  }

  const streaks = await fetchStreakData(selectedContributorId);

  const [commits, pullRequests, reviews, achievements, heatmap, distributions] = await Promise.all([
    fetchCommitMetrics(selectedContributorId, dateRange),
    fetchPullRequestMetrics(selectedContributorId, dateRange),
    fetchReviewMetrics(selectedContributorId, dateRange),
    fetchAchievements(selectedContributorId, streaks),
    fetchHeatmapData(selectedContributorId, dateRange),
    fetchDistributions(selectedContributorId, dateRange),
  ]);

  return {
    user,
    contributors,
    selectedContributorId,
    dateRange: {
      startDate: dateRange.startDate.toISOString(),
      endDate: dateRange.endDate.toISOString(),
      preset: dateRange.preset,
    },
    data: { commits, pullRequests, reviews, streaks, achievements, heatmap, distributions },
  };
}

export async function action({ request }: LoaderFunctionArgs) {
  return logout(request);
}

export default function IndividualDashboard() {
  const { user, contributors, selectedContributorId, data } = useLoaderData<typeof loader>();
  const selectedContributor = contributors.find((c) => c.id === selectedContributorId);

  if (!data) {
    return (
      <AppLayout activeNav="individual" user={user}>
        <div className="page-header">
          <div className="page-header-content">
            <h1 className="page-title">Individual Dashboard</h1>
            <p className="page-subtitle">Personal productivity metrics and achievements</p>
          </div>
          <div className="page-header-controls">
            <ContributorSelector contributors={contributors} defaultContributorId={selectedContributorId} />
            <DatePicker />
          </div>
        </div>
        <div className="empty-state">
          <p>No contributors found. Import data from a version control system to see individual metrics.</p>
        </div>
      </AppLayout>
    );
  }

  const { commits, pullRequests, reviews, streaks, achievements, heatmap, distributions } = data as IndividualDashboardData;

  return (
    <AppLayout activeNav="individual" user={user}>
      <div className="page-header">
        <div className="page-header-content">
          <h1 className="page-title">{selectedContributor?.name || "Individual Dashboard"}</h1>
          <p className="page-subtitle">Personal productivity metrics and achievements</p>
        </div>
        <div className="page-header-controls">
          <ContributorSelector contributors={contributors} defaultContributorId={selectedContributorId} />
          <DatePicker />
        </div>
      </div>

      <section className="gamification-section">
        <StreakCard currentStreak={streaks.currentStreak} longestStreak={streaks.longestStreak} />
        <AchievementBadges achievements={achievements} />
      </section>

      <section className="metric-section">
        <div className="section-header">
          <div className="section-title">Commits</div>
          <div className="section-divider" />
        </div>

        <div className="commits-top-row">
          <ChartCell label="Total Commits" value={commits.total}>
            <TrendBarChart data={commits.chart} />
          </ChartCell>
          <CommitHeatmap data={heatmap} totalCommits={commits.total} />
        </div>

        <div className="stats-row">
          <StatCell label="Daily Average" value={commits.dailyAverage} />
          <StatCell label="Lines Added" value={`+${commits.linesAdded.toLocaleString()}`} />
          <StatCell label="Lines Removed" value={`-${commits.linesRemoved.toLocaleString()}`} />
        </div>
      </section>

      <section className="metric-section">
        <div className="section-header">
          <div className="section-title">Pull Requests</div>
          <div className="section-divider" />
        </div>

        <div className="metric-grid-two">
          <ChartCell label="PRs Created" value={pullRequests.created}>
            <TrendBarChart data={pullRequests.chart} />
          </ChartCell>
          <ChartCell label="PRs Merged" value={pullRequests.merged} />
          <ChartCell label="Merge Rate" value={formatPercent(pullRequests.mergeRate)} />
          <ChartCell label="Avg Iterations" value={formatNumber(pullRequests.avgIterations)} />
        </div>
      </section>

      <section className="metric-section">
        <div className="section-header">
          <div className="section-title">Code Reviews</div>
          <div className="section-divider" />
        </div>

        <div className="metric-grid-two">
          <ChartCell label="Reviews Given" value={reviews.count}>
            <TrendBarChart data={reviews.chart} />
          </ChartCell>
          <ChartCell label="Avg Time to Review" value={formatHours(reviews.avgTimeToReviewHours)} />
        </div>
      </section>

      <section className="metric-section">
        <div className="section-header">
          <div className="section-title">Distributions</div>
          <div className="section-divider" />
        </div>

        <div className="metric-grid-two">
          <div className="chart-cell with-chart">
            <div className="chart-cell-label">Repository Distribution</div>
            <PieChart data={distributions.repositories} />
          </div>
          <div className="chart-cell with-chart">
            <div className="chart-cell-label">Language Distribution</div>
            <PieChart data={distributions.languages} />
          </div>
        </div>
      </section>
    </AppLayout>
  );
}

function formatPercent(value: number | null): string {
  if (value === null) return "N/A";
  return `${value.toFixed(1)}%`;
}

function formatNumber(value: number | null): string {
  if (value === null) return "N/A";
  return value.toFixed(1);
}

function formatHours(hours: number | null): string {
  if (hours === null) return "N/A";
  if (hours < 1) return "<1h";
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = Math.floor(hours / 24);
  const remainingHours = Math.round(hours % 24);
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}

function ChartCell({ label, value, children }: ChartCellProps) {
  const formattedValue = typeof value === "number" ? value.toLocaleString() : value;
  const hasChart = Boolean(children);

  return (
    <div className={`chart-cell ${hasChart ? "with-chart" : ""}`}>
      <div className="chart-cell-header">
        <div className="chart-cell-label">{label}</div>
        <div className="chart-cell-value">{formattedValue}</div>
      </div>
      {children}
    </div>
  );
}

interface ChartCellProps {
  label: string;
  value: number | string;
  children?: React.ReactNode;
}

function StatCell({ label, value }: StatCellProps) {
  const formattedValue = typeof value === "number" ? value.toLocaleString() : value;

  return (
    <div className="stat-cell">
      <div className="stat-cell-label">{label}</div>
      <div className="stat-cell-value">{formattedValue}</div>
    </div>
  );
}

interface StatCellProps {
  label: string;
  value: number | string;
}

import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { requireUser } from "~/auth/auth.server";
import { logout } from "~/auth/session.server";
import { AppLayout } from "~/components/app-layout/app-layout";
import { PieChart } from "~/components/dashboard/charts/pie-chart.js";
import { StackedBarChart } from "~/components/dashboard/charts/stacked-bar-chart.js";
import { TrendBarChart } from "~/components/dashboard/charts/trend-bar-chart.js";
import { TrendLineChart } from "~/components/dashboard/charts/trend-line-chart.js";
import { DatePicker } from "~/components/dashboard/date-picker/date-picker.js";
import { OverviewCard } from "~/components/dashboard/overview-card/overview-card.js";
import { TeamSelector } from "~/components/dashboard/team-selector/team-selector.js";
import { db } from "~/db.server.js";
import { getPreviousPeriod, parseDateRange } from "~/lib/dashboard/date-range.js";
import {
  type DashboardData,
  fetchDeliveryMetrics,
  fetchOperationalMetrics,
  fetchOverviewMetrics,
  fetchQualityMetrics,
  fetchSecurityMetrics,
  fetchTicketMetrics,
} from "~/lib/dashboard/metrics.server.js";
import "./dashboard.css";

export function meta() {
  return [
    { title: "Organization Dashboard - Momentum" },
    {
      name: "description",
      content: "Comprehensive metrics across all teams and repositories",
    },
  ];
}

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireUser(request);
  const url = new URL(request.url);
  const dateRange = parseDateRange(url.searchParams);
  const previousRange = getPreviousPeriod(dateRange);
  const teamId = url.searchParams.get("teamId");

  const [overview, delivery, tickets, operational, quality, security, teams] = await Promise.all([
    fetchOverviewMetrics(dateRange, previousRange, teamId),
    fetchDeliveryMetrics(dateRange, teamId),
    fetchTicketMetrics(dateRange, teamId),
    fetchOperationalMetrics(dateRange, teamId),
    fetchQualityMetrics(dateRange, teamId),
    fetchSecurityMetrics(dateRange, teamId),
    fetchTeams(),
  ]);

  return {
    user,
    teams,
    dateRange: {
      startDate: dateRange.startDate.toISOString(),
      endDate: dateRange.endDate.toISOString(),
      preset: dateRange.preset,
    },
    data: { overview, delivery, tickets, operational, quality, security },
  };
}

async function fetchTeams() {
  return db.team.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function action({ request }: LoaderFunctionArgs) {
  return logout(request);
}

export default function Dashboard() {
  const { user, teams, data } = useLoaderData<typeof loader>();
  const { overview, delivery, tickets, operational, quality, security } = data as DashboardData;

  const cveSeverityData =
    security.cveBySeverity.critical > 0 || security.cveBySeverity.high > 0 || security.cveBySeverity.medium > 0 || security.cveBySeverity.low > 0
      ? [
          {
            label: "Current",
            critical: security.cveBySeverity.critical,
            high: security.cveBySeverity.high,
            medium: security.cveBySeverity.medium,
            low: security.cveBySeverity.low,
          },
        ]
      : [];

  return (
    <AppLayout activeNav="organization" user={user}>
      <div className="page-header">
        <div className="page-header-content">
          <h1 className="page-title">Organization Overview</h1>
          <p className="page-subtitle">Comprehensive metrics across all teams and repositories</p>
        </div>
        <div className="page-header-controls">
          <TeamSelector teams={teams} />
          <DatePicker />
        </div>
      </div>

      <div className="overview-grid">
        <OverviewCard label="Repositories" value={overview.repositories} subtitle="Active projects" />
        <OverviewCard label="Contributors" value={overview.contributors.count} trend={overview.contributors.trend} />
        <OverviewCard label="Commits" value={overview.commits.count} trend={overview.commits.trend} />
        <OverviewCard label="Pull Requests" value={overview.pullRequests.count} trend={overview.pullRequests.trend} />
      </div>

      <section className="metric-section">
        <div className="section-header">
          <div className="section-title">Delivery</div>
          <div className="section-divider" />
        </div>

        <div className="metric-grid-two">
          <ChartCell label="Average PR Age" value={formatDays(delivery.avgPrAgeDays)} unit="d">
            <TrendLineChart data={delivery.avgPrAgeChart} unit="d" />
          </ChartCell>
          <ChartCell label="Average Active Ticket Age" value={formatDays(tickets.avgActiveTicketAgeDays)} unit="d">
            <TrendLineChart data={tickets.avgActiveTicketAgeChart} unit="d" />
          </ChartCell>
          <ChartCell label="Num PRs Open" value={delivery.openPRs}>
            <TrendLineChart data={delivery.openPRsChart} />
          </ChartCell>
          <ChartCell label="Num Active Tickets" value={tickets.activeCount}>
            <TrendLineChart data={tickets.activeCountChart} />
          </ChartCell>
          <ChartCell label="Commits to Master" value={delivery.commitsToMaster}>
            <TrendBarChart data={delivery.commitsToMasterChart} />
          </ChartCell>
          <ChartCell label="Tickets Completed" value={tickets.completedCount}>
            <TrendBarChart data={tickets.completedChart} />
          </ChartCell>
          <ChartCell label="Time to Review" value={formatHoursShort(delivery.avgTimeToReviewHours)} unit="h">
            <TrendLineChart data={delivery.timeToReviewChart} unit="h" />
          </ChartCell>
          <ChartCell label="Cumulative Time in Column" value={formatHoursShort(tickets.cumulativeTimeInColumnHours)} unit="h" />
        </div>
      </section>

      <section className="metric-section">
        <div className="section-header">
          <div className="section-title">Operational</div>
          <div className="section-divider" />
        </div>

        <div className="metric-grid-two">
          <ChartCell label="Pipeline Success (Master)" value={formatPercent(operational.masterSuccessRate)}>
            <TrendLineChart data={operational.masterSuccessRateChart} unit="%" />
          </ChartCell>
          <ChartCell label="Pipeline Success (PR)" value={formatPercent(operational.prSuccessRate)}>
            <TrendLineChart data={operational.prSuccessRateChart} unit="%" />
          </ChartCell>
          <ChartCell label="Pipeline Duration (Master)" value={formatDurationShort(operational.masterAvgDurationMs)} unit="m">
            <TrendLineChart data={operational.masterDurationChart} unit="m" />
          </ChartCell>
          <ChartCell label="Pipeline Duration (PR)" value={formatDurationShort(operational.prAvgDurationMs)} unit="m">
            <TrendLineChart data={operational.prDurationChart} unit="m" />
          </ChartCell>
          <div className="chart-cell">
            <div className="chart-cell-label">Failure Steps (Master)</div>
            <PieChart data={operational.masterFailureSteps} />
          </div>
          <div className="chart-cell">
            <div className="chart-cell-label">Failure Steps (PR)</div>
            <PieChart data={operational.prFailureSteps} />
          </div>
        </div>
      </section>

      <section className="metric-section">
        <div className="section-header">
          <div className="section-title">Quality</div>
          <div className="section-divider" />
        </div>

        <div className="metric-grid-two">
          <ChartCell label="Code Coverage" value={formatPercent(quality.overallCoverage)}>
            <TrendLineChart data={quality.coverageChart} unit="%" />
          </ChartCell>
          <ChartCell label="Sonar Bugs" value={quality.bugsCount}>
            <TrendLineChart data={quality.bugsChart} />
          </ChartCell>
        </div>
      </section>

      <section className="metric-section">
        <div className="section-header">
          <div className="section-title">Security</div>
          <div className="section-divider" />
        </div>

        <div className="metric-grid-two">
          <div className="chart-cell">
            <div className="chart-cell-label">CVEs by Severity</div>
            <StackedBarChart data={cveSeverityData} />
          </div>
          <ChartCell label="Avg Time to Close CVE" value={formatDays(security.avgTimeToCloseDays)} unit="d">
            <TrendLineChart data={security.timeToCloseChart} unit="d" />
          </ChartCell>
        </div>
      </section>
    </AppLayout>
  );
}

function formatDays(days: number | null): string {
  if (days === null) return "N/A";
  if (days < 1) return "<1d";
  return `${Math.round(days)}d`;
}

function formatPercent(value: number | null): string {
  if (value === null) return "N/A";
  return `${value.toFixed(1)}%`;
}

function formatHoursShort(hours: number | null): string {
  if (hours === null) return "N/A";
  if (hours < 1) return "<1h";
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = Math.floor(hours / 24);
  const remainingHours = Math.round(hours % 24);
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}

function formatDurationShort(ms: number | null): string {
  if (ms === null) return "N/A";
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

function ChartCell({ label, value, unit, children }: ChartCellProps) {
  const formattedValue = typeof value === "number" ? value.toLocaleString() : value;
  const hasChart = Boolean(children);

  return (
    <div className={`chart-cell ${hasChart ? "with-chart" : ""}`}>
      <div className="chart-cell-header">
        <div className="chart-cell-label">{label}</div>
        <div className="chart-cell-value">
          {formattedValue}
          {unit && <span className="chart-cell-unit">{unit}</span>}
        </div>
      </div>
      {children}
    </div>
  );
}

interface ChartCellProps {
  label: string;
  value: number | string;
  unit?: string;
  children?: React.ReactNode;
}

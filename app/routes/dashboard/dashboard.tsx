import { useEffect, useRef, useState } from "react";
import type { LoaderFunctionArgs } from "react-router";
import { Form, Link, useLoaderData } from "react-router";
import { requireUser } from "~/auth/auth.server";
import { logout } from "~/auth/session.server";
import { TrendBarChart } from "~/components/dashboard/charts/trend-bar-chart.js";
import { TrendLineChart } from "~/components/dashboard/charts/trend-line-chart.js";
import { DatePicker } from "~/components/dashboard/date-picker/date-picker.js";
import { OverviewCard } from "~/components/dashboard/overview-card/overview-card.js";
import { Logo } from "~/components/logo/logo";
import { formatDuration, formatHours, formatTrendString, getPreviousPeriod, parseDateRange } from "~/lib/dashboard/date-range.js";
import { type DashboardData, fetchDeliveryMetrics, fetchOperationalMetrics, fetchOverviewMetrics, fetchQualityMetrics } from "~/lib/dashboard/metrics.server.js";
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

  const [overview, delivery, operational, quality] = await Promise.all([
    fetchOverviewMetrics(dateRange, previousRange),
    fetchDeliveryMetrics(dateRange, previousRange),
    fetchOperationalMetrics(dateRange, previousRange),
    fetchQualityMetrics(dateRange),
  ]);

  return {
    user,
    dateRange: {
      startDate: dateRange.startDate.toISOString(),
      endDate: dateRange.endDate.toISOString(),
      preset: dateRange.preset,
    },
    data: { overview, delivery, operational, quality },
  };
}

export async function action({ request }: LoaderFunctionArgs) {
  return logout(request);
}

export default function Dashboard() {
  const { user, data } = useLoaderData<typeof loader>();
  const { overview, delivery, operational, quality } = data as DashboardData;
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const initials =
    user.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || user.email[0].toUpperCase();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isDropdownOpen]);

  return (
    <>
      <header className="dashboard-header">
        <div className="header-top">
          <Logo linkTo="/dashboard" />
          <div className="header-actions">
            <div className="user-profile-container" ref={dropdownRef}>
              <button type="button" className="user-profile" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
                <span>{user.name || user.email}</span>
                <div className="user-icon">{initials}</div>
              </button>
              {isDropdownOpen && (
                <div className="user-dropdown">
                  <Link to="/profile" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                    Profile
                  </Link>
                  <Form method="post">
                    <button type="submit" className="dropdown-item">
                      Log Out
                    </button>
                  </Form>
                </div>
              )}
            </div>
          </div>
        </div>
        <nav className="main-nav">
          <Link to="#" className="nav-item active">
            Organization
          </Link>
          <Link to="#" className="nav-item">
            Team
          </Link>
          <Link to="#" className="nav-item">
            Individual
          </Link>
          <Link to="#" className="nav-item">
            Settings
          </Link>
        </nav>
      </header>

      <main className="page-container">
        <div className="page-header">
          <div className="page-header-content">
            <h1 className="page-title">Organization Overview</h1>
            <p className="page-subtitle">Comprehensive metrics across all teams and repositories</p>
          </div>
          <DatePicker />
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

          <div className="metric-grid">
            <MetricCard
              title="Deployment Velocity"
              value={delivery.deployments.count.toString()}
              trend={formatTrendString(delivery.deployments.trend)}
              trendType={delivery.deployments.trend.type === "positive" ? "positive" : "negative"}
              label="Deployments in period"
              stats={[
                { value: formatHours(delivery.cycleTime.avgTimeToMergeHours), label: "Time to Merge" },
                { value: delivery.prActivity.open.toString(), label: "Open PRs" },
                { value: delivery.prActivity.waitingReview.toString(), label: "Waiting Review" },
              ]}
            />

            <MetricCard
              title="Commit & PR Activity"
              value={overview.commits.count.toLocaleString()}
              trend={formatTrendString(overview.commits.trend)}
              trendType={overview.commits.trend.type === "positive" ? "positive" : "negative"}
              label="Commits in period"
              chart={<TrendBarChart data={delivery.commitTrend} />}
              stats={[
                { value: delivery.prActivity.merged.toString(), label: "PRs Merged" },
                { value: formatHours(delivery.cycleTime.avgTimeToMergeHours), label: "Avg Time to Merge" },
                { value: delivery.prActivity.open.toString(), label: "Open PRs" },
              ]}
            />
          </div>
        </section>

        <section className="metric-section">
          <div className="section-header">
            <div className="section-title">Operational</div>
            <div className="section-divider" />
          </div>

          <div className="metric-grid-two">
            <MetricCard
              title="Pipeline Success Rate"
              value={operational.successRate.value !== null ? `${operational.successRate.value.toFixed(1)}%` : "N/A"}
              trend={formatTrendString(operational.successRate.trend)}
              trendType={operational.successRate.trend.type === "positive" ? "positive" : "negative"}
              label="Average success rate"
            />

            <MetricCard
              title="Pipeline Duration"
              value={formatDuration(operational.avgDurationMs)}
              label="Average duration"
              stats={operational.stageBreakdown.slice(0, 3).map((stage) => ({
                value: formatDuration(stage.avgDurationMs),
                label: stage.name,
              }))}
            />
          </div>
        </section>

        <section className="metric-section">
          <div className="section-header">
            <div className="section-title">Quality</div>
            <div className="section-divider" />
          </div>

          <div className="metric-grid">
            <MetricCard
              title="Code Coverage"
              value={quality.overallCoverage !== null ? `${quality.overallCoverage}%` : "N/A"}
              label="Overall coverage"
              chart={quality.coverageTrend.length > 0 ? <TrendLineChart data={quality.coverageTrend} unit="%" /> : undefined}
              stats={[
                { value: quality.newCodeCoverage !== null ? `${quality.newCodeCoverage}%` : "N/A", label: "New Code" },
                { value: "80%", label: "Target" },
                {
                  value: quality.overallCoverage !== null ? `${Math.max(0, 80 - quality.overallCoverage).toFixed(1)}%` : "N/A",
                  label: "Gap",
                },
              ]}
            />
          </div>
        </section>
      </main>
    </>
  );
}

function MetricCard({ title, value, trend, trendType, label, chart, stats }: MetricCardProps) {
  return (
    <div className="metric-card">
      <div className="metric-header">
        <h3 className="metric-title">{title}</h3>
        <Link to="#" className="metric-link">
          View All
        </Link>
      </div>
      <div className="metric-primary">
        <div className="metric-value">
          {value}
          {trend && <span className={`metric-trend ${trendType}`}>{trend}</span>}
        </div>
        <div className="metric-label">{label}</div>
      </div>
      {chart}
      {stats && (
        <div className="metric-stats">
          {stats.map((stat) => (
            <div key={stat.label} className="stat-item">
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  trend?: string;
  trendType?: "positive" | "negative";
  label: string;
  chart?: React.ReactNode;
  stats?: Array<{ value: string; label: string }>;
}

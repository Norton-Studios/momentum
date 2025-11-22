import { useEffect, useRef, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, Link, useLoaderData } from "react-router";
import { requireUser } from "~/auth/auth.server";
import { logout } from "~/auth/session.server";
import { Logo } from "~/components/logo/logo";
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
  return { user };
}

export async function action({ request }: ActionFunctionArgs) {
  return logout(request);
}

export default function Dashboard() {
  const { user } = useLoaderData<typeof loader>();
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
          <div className="date-selector">
            <button type="button" className="date-btn">
              7d
            </button>
            <button type="button" className="date-btn active">
              30d
            </button>
            <button type="button" className="date-btn">
              60d
            </button>
            <button type="button" className="date-btn">
              90d
            </button>
            <button type="button" className="date-btn">
              Custom
            </button>
          </div>
        </div>

        <div className="overview-grid">
          <div className="overview-card">
            <div className="overview-label">Repositories</div>
            <div className="overview-value">50</div>
            <div className="overview-change">Active projects</div>
          </div>
          <div className="overview-card">
            <div className="overview-label">Contributors</div>
            <div className="overview-value">23</div>
            <div className="overview-change positive">↑ 2 this month</div>
          </div>
          <div className="overview-card">
            <div className="overview-label">Commits</div>
            <div className="overview-value">1,098</div>
            <div className="overview-change negative">↓ 12% from last period</div>
          </div>
          <div className="overview-card">
            <div className="overview-label">Pull Requests</div>
            <div className="overview-value">156</div>
            <div className="overview-change negative">↓ 8% from last period</div>
          </div>
        </div>

        <section className="metric-section">
          <div className="section-header">
            <div className="section-title">Delivery</div>
            <div className="section-divider" />
          </div>

          <div className="metric-grid">
            <MetricCard
              title="Deployment Velocity"
              value="12"
              trend="↑ 33%"
              trendType="positive"
              label="Deployments this week"
              stats={[
                { value: "2.1d", label: "Cycle Time" },
                { value: "3.5d", label: "Lead Time" },
                { value: "18h", label: "Time to Merge" },
              ]}
            />

            <MetricCard
              title="Commit & PR Activity"
              value="287"
              trend="↑ 12%"
              trendType="positive"
              label="Commits this week"
              stats={[
                { value: "45", label: "PRs Merged" },
                { value: "18.2h", label: "Avg Time to Merge" },
                { value: "23", label: "Open PRs" },
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
            <MetricCard title="Pipeline Success Rate" value="92.2%" trend="↓ 2.3%" trendType="negative" label="30-day average" />

            <MetricCard
              title="Pipeline Duration"
              value="12.5m"
              trend="↓ 1.2m"
              trendType="positive"
              label="Average duration"
              stats={[
                { value: "8m", label: "Build" },
                { value: "3m", label: "Test" },
                { value: "1.5m", label: "Deploy" },
              ]}
            />
          </div>
        </section>

        <section className="metric-section">
          <div className="section-header">
            <div className="section-title">Quality</div>
            <div className="section-divider" />
          </div>

          <div className="metric-grid-two">
            <MetricCard
              title="Code Coverage"
              value="76%"
              trend="↓ 2%"
              trendType="negative"
              label="Overall coverage"
              stats={[
                { value: "85%", label: "New Code" },
                { value: "80%", label: "Target" },
                { value: "2%", label: "Gap" },
              ]}
            />

            <div className="metric-card">
              <div className="metric-header">
                <h3 className="metric-title">Security Vulnerabilities</h3>
                <Link to="#" className="metric-link">
                  View All
                </Link>
              </div>
              <div className="metric-primary">
                <div className="metric-value">
                  31
                  <span className="metric-trend negative">↑ 8</span>
                </div>
                <div className="metric-label">Total vulnerabilities</div>
              </div>
              <div className="severity-bars">
                <div className="severity-item">
                  <span className="severity-label">Critical</span>
                  <div className="severity-bar">
                    <div className="severity-fill" style={{ width: "20%" }} />
                  </div>
                  <span className="severity-count">2</span>
                </div>
                <div className="severity-item">
                  <span className="severity-label">High</span>
                  <div className="severity-bar">
                    <div className="severity-fill" style={{ width: "40%" }} />
                  </div>
                  <span className="severity-count">8</span>
                </div>
                <div className="severity-item">
                  <span className="severity-label">Medium</span>
                  <div className="severity-bar">
                    <div className="severity-fill" style={{ width: "50%" }} />
                  </div>
                  <span className="severity-count">10</span>
                </div>
                <div className="severity-item">
                  <span className="severity-label">Low</span>
                  <div className="severity-bar">
                    <div className="severity-fill" style={{ width: "15%" }} />
                  </div>
                  <span className="severity-count">3</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  trend?: string;
  trendType?: "positive" | "negative";
  label: string;
  stats?: Array<{ value: string; label: string }>;
}

function MetricCard({ title, value, trend, trendType, label, stats }: MetricCardProps) {
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
      <div className="metric-chart">
        <div className="chart-bar" style={{ height: "45%" }} />
        <div className="chart-bar" style={{ height: "60%" }} />
        <div className="chart-bar" style={{ height: "55%" }} />
        <div className="chart-bar" style={{ height: "70%" }} />
        <div className="chart-bar" style={{ height: "85%" }} />
        <div className="chart-bar" style={{ height: "75%" }} />
        <div className="chart-bar" style={{ height: "100%" }} />
      </div>
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

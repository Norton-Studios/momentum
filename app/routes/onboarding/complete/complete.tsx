import { Link, useLoaderData } from "react-router";
import { Button } from "../../../components/button/button";
import { Logo } from "../../../components/logo/logo";
import type { completeLoader } from "./complete.server";
import "./complete.css";

export { completeLoader as loader } from "./complete.server";

export default function Complete() {
  const data = useLoaderData<typeof completeLoader>();

  return (
    <>
      <header className="onboarding-header">
        <div className="header-content">
          <Logo />
          <div className="progress-indicator">
            <div className="progress-step completed">
              <span className="step-number">1</span>
              <span>Welcome</span>
            </div>
            <div className="progress-step completed">
              <span className="step-number">2</span>
              <span>Data Sources</span>
            </div>
            <div className="progress-step completed">
              <span className="step-number">3</span>
              <span>Import</span>
            </div>
            <div className="progress-step active">
              <span className="step-number">4</span>
              <span>Complete</span>
            </div>
          </div>
        </div>
      </header>

      <main className="onboarding-main">
        <div className="page-header">
          <h1>You're All Set</h1>
          <p>Momentum is now collecting data from your development tools. Your metrics will appear as data becomes available.</p>
        </div>

        <div className="complete-card">
          <div className="section-header">
            <h2 className="section-title">Connected Data Sources</h2>
          </div>
          <ul className="datasources-list">
            {data.dataSources.map((ds) => (
              <li key={`${ds.provider}-${ds.name}`} className="datasource-item">
                <span className="datasource-provider">{ds.provider}</span>
                <span className="datasource-name">{ds.name}</span>
                <span className="status-badge connected">Connected</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="summary-card">
          <div className="section-header">
            <h2 className="section-title">Data Collection Summary</h2>
          </div>
          <div className="summary-grid">
            <div className="stat-box">
              <span className="stat-number">{data.summary.repositories}</span>
              <span className="stat-title">Repositories</span>
              <span className="stat-subtitle">Tracked</span>
            </div>
            <div className="stat-box">
              <span className="stat-number">{data.summary.commits}</span>
              <span className="stat-title">Commits</span>
              <span className="stat-subtitle">Imported</span>
            </div>
            <div className="stat-box">
              <span className="stat-number">{data.summary.pullRequests}</span>
              <span className="stat-title">Pull Requests</span>
              <span className="stat-subtitle">Imported</span>
            </div>
            <div className="stat-box">
              <span className="stat-number">{data.summary.contributors}</span>
              <span className="stat-title">Contributors</span>
              <span className="stat-subtitle">Identified</span>
            </div>
          </div>
        </div>

        <div className="next-steps-card">
          <div className="section-header">
            <h2 className="section-title">Next Steps</h2>
          </div>
          <ul className="next-steps-list">
            <li className="next-step-item">
              <span className="step-arrow">→</span>
              <span>Explore your organization metrics</span>
            </li>
            <li className="next-step-item">
              <span className="step-arrow">→</span>
              <span>View individual contributor metrics</span>
            </li>
            <li className="next-step-item">
              <span className="step-arrow">→</span>
              <span>Configure additional data sources</span>
            </li>
            <li className="next-step-item">
              <span className="step-arrow">→</span>
              <span>Set up your teams</span>
            </li>
          </ul>
        </div>

        <div className="bottom-actions">
          <div className="connection-summary">
            <strong>{data.dataSources.length}</strong> data source{data.dataSources.length !== 1 ? "s" : ""} connected
          </div>
          <div className="action-buttons">
            <Link to="/onboarding/datasources" className="skip-link">
              Add More Sources
            </Link>
            <Link to="/dashboard">
              <Button>Go to Dashboard</Button>
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}

import { useLoaderData } from "react-router";
import type { completeLoader } from "./complete.server";
import "./complete.css";

export { completeLoader as loader } from "./complete.server";

export default function Complete() {
  const data = useLoaderData<typeof completeLoader>();

  return (
    <div className="onboarding-container">
      <div className="complete-content">
        <div className="success-icon">🎉</div>

        <h1>You're All Set!</h1>

        <p className="complete-message">Momentum is now collecting data from your development tools.</p>

        <div className="data-sources-summary">
          <h3>Connected Data Sources:</h3>
          <ul>
            {data.dataSources.map((ds) => (
              <li key={`${ds.provider}-${ds.name}`}>
                <strong>{ds.provider}</strong> ({ds.name})
              </li>
            ))}
          </ul>
        </div>

        <div className="collection-summary">
          <h3>Data Collection Summary:</h3>
          <div className="summary-grid">
            <div className="summary-item">
              <span className="summary-icon">📦</span>
              <span className="summary-value">{data.summary.repositories}</span>
              <span className="summary-label">repositories tracked</span>
            </div>
            <div className="summary-item">
              <span className="summary-icon">💾</span>
              <span className="summary-value">{data.summary.commits}</span>
              <span className="summary-label">commits imported</span>
            </div>
            <div className="summary-item">
              <span className="summary-icon">🔀</span>
              <span className="summary-value">{data.summary.mergeRequests}</span>
              <span className="summary-label">pull requests imported</span>
            </div>
            <div className="summary-item">
              <span className="summary-icon">👥</span>
              <span className="summary-value">{data.summary.contributors}</span>
              <span className="summary-label">contributors identified</span>
            </div>
          </div>
        </div>

        <div className="next-steps">
          <h3>Next Steps:</h3>
          <ul>
            <li>→ Explore your organization metrics</li>
            <li>→ View individual contributor metrics</li>
            <li>→ Configure additional data sources</li>
            <li>→ Invite team members</li>
          </ul>
        </div>

        <div className="complete-actions">
          <a href="/dashboard" className="btn-primary">
            Go to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}

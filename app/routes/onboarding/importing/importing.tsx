import { Form, useLoaderData } from "react-router";
import type { importingLoader } from "./importing.server";
import "./importing.css";

export { importingAction as action, importingLoader as loader } from "./importing.server";

export default function Importing() {
  const data = useLoaderData<typeof importingLoader>();

  return (
    <div className="onboarding-container">
      <div className="importing-content">
        <div className="importing-icon">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Loading spinner">
            <title>Loading</title>
            <circle cx="12" cy="12" r="10" stroke="#1976d2" strokeWidth="2" strokeLinecap="round" strokeDasharray="63" strokeDashoffset="0">
              <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1.5s" repeatCount="indefinite" />
            </circle>
          </svg>
        </div>

        <h1>Import Started</h1>

        <p className="importing-message">{data.message}</p>

        <div className="importing-stats">
          <div className="stat-item">
            <span className="stat-value">{data.enabledRepos}</span>
            <span className="stat-label">Repositories Selected</span>
          </div>
        </div>

        <div className="import-info">
          <h3>What's happening now:</h3>
          <ul>
            <li>Repository metadata has been saved</li>
            <li>Background jobs will collect commit history (last 90 days)</li>
            <li>Pull requests and contributors will be imported</li>
            <li>CI/CD pipeline data will be gathered (if configured)</li>
          </ul>

          <p className="info-note">
            <strong>Note:</strong> The import process may take several minutes to hours depending on the number of repositories and amount of data. You can continue to the
            dashboard and check back later.
          </p>
        </div>

        <div className="onboarding-actions">
          <a href="/onboarding/repositories" className="btn-secondary">
            Back to Repository Selection
          </a>
          <Form method="post">
            <input type="hidden" name="intent" value="continue" />
            <button type="submit" className="btn-primary">
              Continue to Dashboard
            </button>
          </Form>
        </div>
      </div>
    </div>
  );
}

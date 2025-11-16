import { useState } from "react";
import { Link } from "react-router";
import { Button } from "../components/button";
import { Logo } from "../components/logo";
import "../styles/onboarding-datasources.css";

export function meta() {
  return [
    { title: "Connect Data Sources - Momentum" },
    {
      name: "description",
      content: "Connect your development tools to Momentum",
    },
  ];
}

interface DataSource {
  id: string;
  name: string;
  icon: string;
  description: string;
  isConnected: boolean;
  isRequired: boolean;
}

export default function OnboardingDataSources() {
  const [connectedSources, setConnectedSources] = useState<Set<string>>(new Set());
  const [activeForm, setActiveForm] = useState<string | null>(null);

  const versionControlSources: DataSource[] = [
    {
      id: "github",
      name: "GitHub",
      icon: "⎈",
      description: "Connect your GitHub organization to import repositories, commits, pull requests, and contributor data. Track code collaboration and delivery velocity.",
      isConnected: false,
      isRequired: true,
    },
    {
      id: "gitlab",
      name: "GitLab",
      icon: "⚡",
      description: "Connect to GitLab (cloud or self-hosted) to track projects, merge requests, CI/CD pipelines, and team activity across your development lifecycle.",
      isConnected: false,
      isRequired: true,
    },
    {
      id: "bitbucket",
      name: "Bitbucket",
      icon: "◆",
      description: "Connect Bitbucket to import repositories, commits, and pull requests from your workspace. Monitor code quality and team collaboration.",
      isConnected: false,
      isRequired: true,
    },
  ];

  const cicdSources: DataSource[] = [
    {
      id: "jenkins",
      name: "Jenkins",
      icon: "⚙",
      description: "Track build pipelines, job success rates, deployment frequency, and failure analysis from your Jenkins instance.",
      isConnected: false,
      isRequired: false,
    },
    {
      id: "circleci",
      name: "CircleCI",
      icon: "○",
      description: "Monitor pipeline performance, workflow duration, and build success metrics from your CircleCI projects.",
      isConnected: false,
      isRequired: false,
    },
  ];

  const qualitySources: DataSource[] = [
    {
      id: "sonarqube",
      name: "SonarQube",
      icon: "◉",
      description: "Import code quality metrics, test coverage, technical debt, security vulnerabilities, and code smells from SonarQube projects.",
      isConnected: false,
      isRequired: false,
    },
  ];

  const toggleForm = (sourceId: string) => {
    setActiveForm(activeForm === sourceId ? null : sourceId);
  };

  const handleSaveConnection = (sourceId: string) => {
    setConnectedSources(new Set([...connectedSources, sourceId]));
    setActiveForm(null);
  };

  const hasRequiredConnections = versionControlSources.some((source) => connectedSources.has(source.id));

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
            <div className="progress-step active">
              <span className="step-number">2</span>
              <span>Data Sources</span>
            </div>
            <div className="progress-step">
              <span className="step-number">3</span>
              <span>Import</span>
            </div>
            <div className="progress-step">
              <span className="step-number">4</span>
              <span>Complete</span>
            </div>
          </div>
        </div>
      </header>

      <main className="onboarding-main">
        <div className="page-header">
          <h1>Connect Your Tools</h1>
          <p>Momentum integrates with your existing development workflow. Connect at least one version control system to begin tracking metrics.</p>
        </div>

        <section className="datasource-section">
          <div className="section-header">
            <h2 className="section-title">
              Version Control
              <span className="required-badge">Required</span>
            </h2>
          </div>

          <div className="datasource-list">
            {versionControlSources.map((source) => (
              <DataSourceCard
                key={source.id}
                source={source}
                isConnected={connectedSources.has(source.id)}
                isFormActive={activeForm === source.id}
                onToggleForm={toggleForm}
                onSave={handleSaveConnection}
              />
            ))}
          </div>
        </section>

        <section className="datasource-section">
          <div className="section-header">
            <h2 className="section-title">CI/CD Platforms</h2>
          </div>

          <div className="datasource-list">
            {cicdSources.map((source) => (
              <DataSourceCard
                key={source.id}
                source={source}
                isConnected={connectedSources.has(source.id)}
                isFormActive={activeForm === source.id}
                onToggleForm={toggleForm}
                onSave={handleSaveConnection}
              />
            ))}
          </div>
        </section>

        <section className="datasource-section">
          <div className="section-header">
            <h2 className="section-title">Code Quality</h2>
          </div>

          <div className="datasource-list">
            {qualitySources.map((source) => (
              <DataSourceCard
                key={source.id}
                source={source}
                isConnected={connectedSources.has(source.id)}
                isFormActive={activeForm === source.id}
                onToggleForm={toggleForm}
                onSave={handleSaveConnection}
              />
            ))}
          </div>
        </section>

        <div className="bottom-actions">
          <div className="connection-summary">
            <strong>{connectedSources.size > 0 ? 1 : 0}</strong> of 1 required data sources connected
          </div>
          <div className="action-buttons">
            <Link to="#" className="skip-link">
              Skip for now
            </Link>
            <Button disabled={!hasRequiredConnections}>Continue to Import</Button>
          </div>
        </div>
      </main>
    </>
  );
}

interface DataSourceCardProps {
  source: DataSource;
  isConnected: boolean;
  isFormActive: boolean;
  onToggleForm: (id: string) => void;
  onSave: (id: string) => void;
}

function DataSourceCard({ source, isConnected, isFormActive, onToggleForm, onSave }: DataSourceCardProps) {
  return (
    <div className={`datasource-card ${isConnected ? "connected" : ""}`} id={`${source.id}Card`}>
      <div className="card-header">
        <div className="datasource-info">
          <div className="datasource-title">
            <span className="datasource-icon">{source.icon}</span>
            <h3>{source.name}</h3>
          </div>
          <p>{source.description}</p>
        </div>
        <span className={`status-badge ${isConnected ? "connected" : ""}`} id={`${source.id}Status`}>
          {isConnected ? "Connected" : "Not Connected"}
        </span>
      </div>

      <button type="button" className="btn-configure" onClick={() => onToggleForm(source.id)}>
        Configure {source.name}
      </button>

      {isFormActive && (
        <div className="config-form active">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSave(source.id);
            }}
          >
            <div className="form-group">
              <label htmlFor={`${source.id}-config`}>Configuration</label>
              <input type="text" id={`${source.id}-config`} placeholder="Enter configuration details" />
              <div className="form-help">Configuration details for {source.name}</div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn-test">
                Test Connection
              </button>
              <button type="submit" className="btn-save">
                Save Configuration
              </button>
              <button type="button" className="btn-cancel" onClick={() => onToggleForm(source.id)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

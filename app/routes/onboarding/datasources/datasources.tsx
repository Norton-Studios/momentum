import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, Link, useActionData, useLoaderData } from "react-router";
import { requireUser } from "~/auth/auth.server";
import { db } from "~/db.server";
import { Button } from "../../../components/button/button";
import { Logo } from "../../../components/logo/logo";
import { PROVIDER_CONFIGS } from "./datasources.config";
import { datasourcesAction } from "./datasources.server";
import "./datasources.css";

export function meta() {
  return [
    { title: "Connect Data Sources - Momentum" },
    {
      name: "description",
      content: "Connect your development tools to Momentum",
    },
  ];
}

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireUser(request);

  const dataSources = await db.dataSource.findMany({
    select: {
      id: true,
      provider: true,
      isEnabled: true,
    },
  });

  const connectedProviders = dataSources.filter((ds) => ds.isEnabled).map((ds) => ds.provider.toLowerCase());

  return { user, connectedProviders };
}

export async function action(args: ActionFunctionArgs) {
  return datasourcesAction(args);
}

export default function OnboardingDataSources() {
  const { connectedProviders } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [activeForm, setActiveForm] = useState<string | null>(null);

  const successfulProvider = actionData && "success" in actionData && actionData.success && "provider" in actionData ? actionData.provider : null;
  const connectedSet = new Set([...connectedProviders, ...(successfulProvider ? [successfulProvider] : [])]);

  const versionControlSources: DataSource[] = [
    {
      id: "github",
      name: "GitHub",
      icon: "⎈",
      description: "Connect your GitHub organization to import repositories, commits, pull requests, and contributor data. Track code collaboration and delivery velocity.",
      isConnected: connectedSet.has("github"),
      isRequired: true,
    },
    {
      id: "gitlab",
      name: "GitLab",
      icon: "⚡",
      description: "Connect to GitLab (cloud or self-hosted) to track projects, merge requests, CI/CD pipelines, and team activity across your development lifecycle.",
      isConnected: connectedSet.has("gitlab"),
      isRequired: true,
    },
    {
      id: "bitbucket",
      name: "Bitbucket",
      icon: "◆",
      description: "Connect Bitbucket to import repositories, commits, and pull requests from your workspace. Monitor code quality and team collaboration.",
      isConnected: connectedSet.has("bitbucket"),
      isRequired: true,
    },
  ];

  const cicdSources: DataSource[] = [
    {
      id: "jenkins",
      name: "Jenkins",
      icon: "⚙",
      description: "Track build pipelines, job success rates, deployment frequency, and failure analysis from your Jenkins instance.",
      isConnected: connectedSet.has("jenkins"),
      isRequired: false,
    },
    {
      id: "circleci",
      name: "CircleCI",
      icon: "○",
      description: "Monitor pipeline performance, workflow duration, and build success metrics from your CircleCI projects.",
      isConnected: connectedSet.has("circleci"),
      isRequired: false,
    },
  ];

  const qualitySources: DataSource[] = [
    {
      id: "sonarqube",
      name: "SonarQube",
      icon: "◉",
      description: "Import code quality metrics, test coverage, technical debt, security vulnerabilities, and code smells from SonarQube projects.",
      isConnected: connectedSet.has("sonarqube"),
      isRequired: false,
    },
  ];

  const toggleForm = (sourceId: string) => {
    setActiveForm(activeForm === sourceId ? null : sourceId);
  };

  const hasRequiredConnections = versionControlSources.some((source) => connectedSet.has(source.id));

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
              <DataSourceCard key={source.id} source={source} isFormActive={activeForm === source.id} onToggleForm={toggleForm} actionData={actionData} />
            ))}
          </div>
        </section>

        <section className="datasource-section">
          <div className="section-header">
            <h2 className="section-title">CI/CD Platforms</h2>
          </div>

          <div className="datasource-list">
            {cicdSources.map((source) => (
              <DataSourceCard key={source.id} source={source} isFormActive={activeForm === source.id} onToggleForm={toggleForm} actionData={actionData} />
            ))}
          </div>
        </section>

        <section className="datasource-section">
          <div className="section-header">
            <h2 className="section-title">Code Quality</h2>
          </div>

          <div className="datasource-list">
            {qualitySources.map((source) => (
              <DataSourceCard key={source.id} source={source} isFormActive={activeForm === source.id} onToggleForm={toggleForm} actionData={actionData} />
            ))}
          </div>
        </section>

        <div className="bottom-actions">
          <div className="connection-summary">
            <strong>{connectedSet.size > 0 ? 1 : 0}</strong> of 1 required data sources connected
          </div>
          <div className="action-buttons">
            <Link to="/dashboard" className="skip-link">
              Skip for now
            </Link>
            <Form method="post">
              <input type="hidden" name="intent" value="continue" />
              <Button type="submit" disabled={!hasRequiredConnections}>
                Continue to Import
              </Button>
            </Form>
          </div>
        </div>
      </main>
    </>
  );
}

function DataSourceCard({ source, isFormActive, onToggleForm, actionData }: DataSourceCardProps) {
  const providerConfig = PROVIDER_CONFIGS[source.id];
  const testSuccess = actionData && "testSuccess" in actionData && actionData.provider === source.id;
  const testError = actionData && "testError" in actionData && actionData.provider === source.id ? actionData.testError : null;

  return (
    <div className={`datasource-card ${source.isConnected ? "connected" : ""}`} id={`${source.id}Card`}>
      <div className="card-header">
        <div className="datasource-info">
          <div className="datasource-title">
            <span className="datasource-icon">{source.icon}</span>
            <h3>{source.name}</h3>
          </div>
          <p>{source.description}</p>
        </div>
        <span className={`status-badge ${source.isConnected ? "connected" : ""}`} id={`${source.id}Status`}>
          {source.isConnected ? "Connected" : "Not Connected"}
        </span>
      </div>

      <button type="button" className="btn-configure" onClick={() => onToggleForm(source.id)}>
        Configure {source.name}
      </button>

      {isFormActive && (
        <div className="config-form active">
          <Form method="post" id={`${source.id}-form`}>
            <input type="hidden" name="provider" value={source.id} />
            {providerConfig?.fields.map((field) => (
              <div className="form-group" key={field.key}>
                <label htmlFor={`${source.id}-${field.key}`}>
                  {field.label}
                  {field.required && <span className="required">*</span>}
                </label>
                <input type={field.type} id={`${source.id}-${field.key}`} name={field.key} placeholder={field.placeholder} required={field.required} />
              </div>
            ))}
            {testSuccess && <div className="test-success">Connection successful!</div>}
            {testError && <div className="test-error">{testError}</div>}
            <div className="form-actions">
              <button type="submit" name="intent" value="test" className="btn-test">
                Test Connection
              </button>
              <button type="submit" name="intent" value="connect" className="btn-save">
                Save Configuration
              </button>
              <button type="button" className="btn-cancel" onClick={() => onToggleForm(source.id)}>
                Cancel
              </button>
            </div>
          </Form>
        </div>
      )}
    </div>
  );
}

interface DataSource {
  id: string;
  name: string;
  icon: string;
  description: string;
  isConnected: boolean;
  isRequired: boolean;
}

interface DataSourceCardProps {
  source: DataSource;
  isFormActive: boolean;
  onToggleForm: (id: string) => void;
  actionData: ReturnType<typeof useActionData<typeof action>>;
}

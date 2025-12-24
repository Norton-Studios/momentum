import { useCallback, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, Link, useLoaderData } from "react-router";
import { requireAdmin } from "~/auth/auth.server";
import { type DataSource, DataSourceCard } from "~/components/data-sources";
import { CircleCIIcon, GitHubIcon, GitLabIcon, JenkinsIcon, JiraIcon, SonarQubeIcon } from "~/components/icons/provider-icons";
import { db } from "~/db.server";
import { Button } from "../../../components/button/button";
import { Logo } from "../../../components/logo/logo";
import { datasourcesAction } from "./data-sources.server";
import "./data-sources.css";

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
  const user = await requireAdmin(request);

  const dataSources = await db.dataSource.findMany({
    select: {
      id: true,
      provider: true,
      isEnabled: true,
      configs: {
        select: {
          key: true,
          value: true,
        },
      },
    },
  });

  const connectedProviders = dataSources.filter((ds) => ds.isEnabled).map((ds) => ds.provider.toLowerCase());

  const dataSourceConfigs: Record<string, Record<string, string>> = {};
  for (const ds of dataSources) {
    const provider = ds.provider.toLowerCase();
    dataSourceConfigs[provider] = {};
    for (const config of ds.configs) {
      dataSourceConfigs[provider][config.key] = config.value;
    }
  }

  return { user, connectedProviders, dataSourceConfigs };
}

export async function action(args: ActionFunctionArgs) {
  return datasourcesAction(args);
}

const VCS_PROVIDERS = new Set(["github", "gitlab"]);
const PROJECT_MANAGEMENT_PROVIDERS = new Set(["jira"]);

export default function OnboardingDataSources() {
  const { connectedProviders, dataSourceConfigs } = useLoaderData<typeof loader>();
  const [activeForm, setActiveForm] = useState<string | null>(null);
  const [expandedRepositories, setExpandedRepositories] = useState<Set<string>>(new Set());
  const [newlyConnectedProviders, setNewlyConnectedProviders] = useState<Set<string>>(new Set());

  const connectedSet = new Set([...connectedProviders, ...newlyConnectedProviders]);

  const handleConnectionSuccess = useCallback((provider: string) => {
    setNewlyConnectedProviders((prev) => new Set([...prev, provider]));
    setActiveForm(null);
    if (VCS_PROVIDERS.has(provider) || PROJECT_MANAGEMENT_PROVIDERS.has(provider)) {
      setExpandedRepositories((prev) => new Set([...prev, provider]));
    }
    const cardElement = document.getElementById(`${provider}Card`);
    if (cardElement) {
      cardElement.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, []);

  const versionControlSources: DataSource[] = [
    {
      id: "github",
      name: "GitHub",
      icon: <GitHubIcon />,
      description: "Connect your GitHub organization to import repositories, commits, pull requests, and contributor data. Track code collaboration and delivery velocity.",
      isConnected: connectedSet.has("github"),
      isRequired: true,
      isVcs: true,
      isProjectManagement: false,
    },
    {
      id: "gitlab",
      name: "GitLab",
      icon: <GitLabIcon />,
      description: "Connect to GitLab (cloud or self-hosted) to track projects, merge requests, CI/CD pipelines, and team activity across your development lifecycle.",
      isConnected: connectedSet.has("gitlab"),
      isRequired: true,
      isVcs: true,
      isProjectManagement: false,
    },
  ];

  const cicdSources: DataSource[] = [
    {
      id: "jenkins",
      name: "Jenkins",
      icon: <JenkinsIcon />,
      description: "Track build pipelines, job success rates, deployment frequency, and failure analysis from your Jenkins instance.",
      isConnected: connectedSet.has("jenkins"),
      isRequired: false,
      isVcs: false,
      isProjectManagement: false,
    },
    {
      id: "circleci",
      name: "CircleCI",
      icon: <CircleCIIcon />,
      description: "Monitor pipeline performance, workflow duration, and build success metrics from your CircleCI projects.",
      isConnected: connectedSet.has("circleci"),
      isRequired: false,
      isVcs: false,
      isProjectManagement: false,
    },
  ];

  const qualitySources: DataSource[] = [
    {
      id: "sonarqube",
      name: "SonarQube",
      icon: <SonarQubeIcon />,
      description: "Import code quality metrics, test coverage, technical debt, security vulnerabilities, and code smells from SonarQube projects.",
      isConnected: connectedSet.has("sonarqube"),
      isRequired: false,
      isVcs: false,
      isProjectManagement: false,
    },
  ];

  const projectManagementSources: DataSource[] = [
    {
      id: "jira",
      name: "Jira",
      icon: <JiraIcon />,
      description: "Connect Jira Cloud or Data Center to track projects, sprints, issues, and status transitions. Analyze delivery velocity and cycle time metrics.",
      isConnected: connectedSet.has("jira"),
      isRequired: false,
      isVcs: false,
      isProjectManagement: true,
    },
  ];

  const toggleForm = (sourceId: string) => {
    setActiveForm(activeForm === sourceId ? null : sourceId);
  };

  const toggleRepositories = (sourceId: string) => {
    setExpandedRepositories((prev) => {
      const next = new Set(prev);
      if (next.has(sourceId)) {
        next.delete(sourceId);
      } else {
        next.add(sourceId);
      }
      return next;
    });
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
              <DataSourceCard
                key={source.id}
                source={source}
                isFormActive={activeForm === source.id}
                isRepositoriesExpanded={expandedRepositories.has(source.id)}
                onToggleForm={toggleForm}
                onToggleRepositories={toggleRepositories}
                onConnectionSuccess={handleConnectionSuccess}
                configs={dataSourceConfigs[source.id] || {}}
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
                isFormActive={activeForm === source.id}
                isRepositoriesExpanded={false}
                onToggleForm={toggleForm}
                onToggleRepositories={toggleRepositories}
                onConnectionSuccess={handleConnectionSuccess}
                configs={dataSourceConfigs[source.id] || {}}
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
                isFormActive={activeForm === source.id}
                isRepositoriesExpanded={false}
                onToggleForm={toggleForm}
                onToggleRepositories={toggleRepositories}
                onConnectionSuccess={handleConnectionSuccess}
                configs={dataSourceConfigs[source.id] || {}}
              />
            ))}
          </div>
        </section>

        <section className="datasource-section">
          <div className="section-header">
            <h2 className="section-title">Project Management</h2>
          </div>

          <div className="datasource-list">
            {projectManagementSources.map((source) => (
              <DataSourceCard
                key={source.id}
                source={source}
                isFormActive={activeForm === source.id}
                isRepositoriesExpanded={expandedRepositories.has(source.id)}
                onToggleForm={toggleForm}
                onToggleRepositories={toggleRepositories}
                onConnectionSuccess={handleConnectionSuccess}
                configs={dataSourceConfigs[source.id] || {}}
              />
            ))}
          </div>
        </section>

        <div className="bottom-actions">
          <div className="connection-summary">
            <strong>{hasRequiredConnections ? "1" : "0"}</strong> of 1 required connection established
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

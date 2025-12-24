import { useCallback, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { type DataSource, DataSourceCard } from "~/components/data-sources";
import { CircleCIIcon, GitHubIcon, GitLabIcon, JenkinsIcon, JiraIcon, SonarQubeIcon } from "~/components/icons/provider-icons";
import { SettingsLayout } from "../settings-layout";
import { action as dataSourcesAction, loader as dataSourcesLoader } from "./data-sources.server";
import "~/routes/onboarding/data-sources/data-sources.css";
import "./data-sources.css";

export function meta() {
  return [
    { title: "Data Sources - Settings - Momentum" },
    {
      name: "description",
      content: "Manage your data source integrations",
    },
  ];
}

export async function loader(args: LoaderFunctionArgs) {
  return dataSourcesLoader(args);
}

export async function action(args: ActionFunctionArgs) {
  return dataSourcesAction(args);
}

const VCS_PROVIDERS = new Set(["github", "gitlab"]);
const PROJECT_MANAGEMENT_PROVIDERS = new Set(["jira"]);

export default function DataSourcesSettings() {
  const { dataSources, user } = useLoaderData<typeof loader>();
  const [activeForm, setActiveForm] = useState<string | null>(null);
  const [expandedRepositories, setExpandedRepositories] = useState<Set<string>>(new Set());

  const connectedProviderIds = new Set(dataSources.map((ds) => ds.provider.toLowerCase()));

  const dataSourceConfigs: Record<string, Record<string, string>> = {};
  for (const ds of dataSources) {
    const provider = ds.provider.toLowerCase();
    dataSourceConfigs[provider] = {};
    for (const config of ds.configs) {
      dataSourceConfigs[provider][config.key] = config.value;
    }
  }

  const handleConnectionSuccess = useCallback((provider: string) => {
    setActiveForm(null);
    if (VCS_PROVIDERS.has(provider) || PROJECT_MANAGEMENT_PROVIDERS.has(provider)) {
      setExpandedRepositories((prev) => new Set([...prev, provider]));
    }
  }, []);

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

  const versionControlSources: DataSource[] = [
    {
      id: "github",
      name: "GitHub",
      icon: <GitHubIcon />,
      description: "Connect your GitHub organization to import repositories, commits, pull requests, and contributor data.",
      isConnected: connectedProviderIds.has("github"),
      isVcs: true,
      isProjectManagement: false,
    },
    {
      id: "gitlab",
      name: "GitLab",
      icon: <GitLabIcon />,
      description: "Connect to GitLab (cloud or self-hosted) to track projects, merge requests, and CI/CD pipelines.",
      isConnected: connectedProviderIds.has("gitlab"),
      isVcs: true,
      isProjectManagement: false,
    },
  ];

  const cicdSources: DataSource[] = [
    {
      id: "jenkins",
      name: "Jenkins",
      icon: <JenkinsIcon />,
      description: "Track build pipelines, job success rates, and deployment frequency from your Jenkins instance.",
      isConnected: connectedProviderIds.has("jenkins"),
      isVcs: false,
      isProjectManagement: false,
    },
    {
      id: "circleci",
      name: "CircleCI",
      icon: <CircleCIIcon />,
      description: "Monitor pipeline performance, workflow duration, and build success metrics.",
      isConnected: connectedProviderIds.has("circleci"),
      isVcs: false,
      isProjectManagement: false,
    },
  ];

  const qualitySources: DataSource[] = [
    {
      id: "sonarqube",
      name: "SonarQube",
      icon: <SonarQubeIcon />,
      description: "Import code quality metrics, test coverage, technical debt, and security vulnerabilities.",
      isConnected: connectedProviderIds.has("sonarqube"),
      isVcs: false,
      isProjectManagement: false,
    },
  ];

  const projectManagementSources: DataSource[] = [
    {
      id: "jira",
      name: "Jira",
      icon: <JiraIcon />,
      description: "Connect Jira Cloud or Data Center to track projects, sprints, issues, and status transitions.",
      isConnected: connectedProviderIds.has("jira"),
      isVcs: false,
      isProjectManagement: true,
    },
  ];

  return (
    <SettingsLayout activeTab="data-sources" user={user}>
      <div className="data-sources-settings-page">
        <section className="datasource-section">
          <div className="section-header">
            <h2 className="section-title">Version Control</h2>
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
      </div>
    </SettingsLayout>
  );
}

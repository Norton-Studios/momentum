import { useCallback, useEffect, useMemo, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, Link, useFetcher, useLoaderData } from "react-router";
import { requireAdmin } from "~/auth/auth.server";
import { CircleCIIcon, GitHubIcon, GitLabIcon, getProviderIcon, JenkinsIcon, JiraIcon, SonarQubeIcon } from "~/components/icons/provider-icons";
import { SelectableList } from "~/components/selectable-list/selectable-list";
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
    // Auto-expand repositories/projects after successful connection
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

function DataSourceCard({ source, isFormActive, isRepositoriesExpanded, onToggleForm, onToggleRepositories, configs, onConnectionSuccess }: DataSourceCardProps) {
  const providerConfig = PROVIDER_CONFIGS[source.id];
  const fetcher = useFetcher();
  // Initialize with configs, but only use saved configs if they have content
  const [formValues, setFormValues] = useState<Record<string, string>>(() => {
    return Object.keys(configs).length > 0 ? configs : {};
  });
  const [hasInitialized, setHasInitialized] = useState(false);

  const fetcherData = fetcher.data as { testSuccess?: boolean; testError?: string; success?: boolean; provider?: string } | undefined;
  const testSuccess = fetcherData?.testSuccess && fetcherData?.provider === source.id;
  const testError = fetcherData?.testError && fetcherData?.provider === source.id ? fetcherData.testError : null;
  const saveSuccess = fetcherData?.success && fetcherData?.provider === source.id;

  // Only sync configs to formValues once when configs first becomes non-empty
  // This prevents loader revalidation from overwriting user input
  useEffect(() => {
    if (!hasInitialized && Object.keys(configs).length > 0) {
      setFormValues(configs);
      setHasInitialized(true);
    }
  }, [configs, hasInitialized]);

  useEffect(() => {
    if (saveSuccess) {
      onConnectionSuccess(source.id);
    }
  }, [saveSuccess, source.id, onConnectionSuccess]);

  const handleFieldChange = (key: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  const shouldShowField = (field: { showWhen?: Record<string, string> }): boolean => {
    if (!field.showWhen) return true;
    return Object.entries(field.showWhen).every(([key, value]) => formValues[key] === value);
  };

  const handleSubmit = (intent: string) => {
    const formData = new FormData();
    formData.append("intent", intent);
    formData.append("provider", source.id);
    for (const [key, value] of Object.entries(formValues)) {
      formData.append(key, value);
    }
    fetcher.submit(formData, { method: "post" });
  };

  const isSubmitting = fetcher.state === "submitting";

  return (
    <div className={`datasource-card ${source.isConnected || saveSuccess ? "connected" : ""}`} id={`${source.id}Card`}>
      <div className="card-header">
        <div className="datasource-info">
          <div className="datasource-title">
            <span className="datasource-icon">{source.icon}</span>
            <h3>{source.name}</h3>
          </div>
          <p>{source.description}</p>
        </div>
        <span className={`status-badge ${source.isConnected || saveSuccess ? "connected" : ""}`} id={`${source.id}Status`}>
          {source.isConnected || saveSuccess ? "Connected" : "Not Connected"}
        </span>
      </div>

      <button type="button" className="btn-configure" onClick={() => onToggleForm(source.id)}>
        {source.isConnected || saveSuccess ? `Edit ${source.name} Configuration` : `Configure ${source.name}`}
      </button>

      {isFormActive && (
        <div className="config-form active">
          <input type="hidden" name="provider" value={source.id} />
          {providerConfig?.fields.map((field) => {
            if (!shouldShowField(field)) return null;

            return (
              <div className="form-group" key={field.key}>
                <label htmlFor={`${source.id}-${field.key}`}>
                  {field.label}
                  {field.required && <span className="required">*</span>}
                </label>
                {field.type === "select" && field.options ? (
                  <select
                    id={`${source.id}-${field.key}`}
                    name={field.key}
                    required={field.required}
                    value={formValues[field.key] || ""}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                  >
                    <option value="">Select...</option>
                    {field.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type}
                    id={`${source.id}-${field.key}`}
                    name={field.key}
                    placeholder={field.placeholder}
                    required={field.required}
                    value={formValues[field.key] || ""}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                  />
                )}
              </div>
            );
          })}
          {testSuccess && <div className="test-success">Connection successful!</div>}
          {testError && <div className="test-error">{testError}</div>}
          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={() => onToggleForm(source.id)}>
              Cancel
            </button>
            <button type="button" className="btn-test" onClick={() => handleSubmit("test")} disabled={isSubmitting}>
              {isSubmitting ? "Testing..." : "Test Connection"}
            </button>
            <button type="button" className="btn-save" onClick={() => handleSubmit("connect")} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Configuration"}
            </button>
          </div>
        </div>
      )}

      {source.isVcs && (source.isConnected || saveSuccess) && (
        <RepositoriesSection provider={source.id} isExpanded={isRepositoriesExpanded} onToggle={() => onToggleRepositories(source.id)} />
      )}
      {source.isProjectManagement && (source.isConnected || saveSuccess) && (
        <ProjectsSection provider={source.id} isExpanded={isRepositoriesExpanded} onToggle={() => onToggleRepositories(source.id)} />
      )}
    </div>
  );
}

function RepositoriesSection({ provider, isExpanded, onToggle }: RepositoriesSectionProps) {
  const fetcher = useFetcher();
  const [searchValue, setSearchValue] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [allRepositories, setAllRepositories] = useState<Repository[]>([]);
  const [_nextCursor, setNextCursor] = useState<string | undefined>();
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    if (isExpanded && !hasInitialized) {
      const formData = new FormData();
      formData.append("intent", "fetch-repositories");
      formData.append("provider", provider);
      fetcher.submit(formData, { method: "post" });
      setHasInitialized(true);
    }
  }, [isExpanded, hasInitialized, provider, fetcher]);

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      const data = fetcher.data as RepositoriesFetcherData;
      if ("repositories" in data) {
        setAllRepositories(data.repositories);
        setNextCursor(data.nextCursor);
        const enabledIds = new Set(data.repositories.filter((r) => r.isEnabled).map((r) => r.id));
        setSelectedIds(enabledIds);
      }
    }
  }, [fetcher.data, fetcher.state]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchValue(value);
  }, []);

  const handleToggle = (repositoryId: string, isEnabled: boolean) => {
    const formData = new FormData();
    formData.append("intent", "toggle-repository");
    formData.append("repositoryId", repositoryId);
    formData.append("isEnabled", String(isEnabled));
    fetcher.submit(formData, { method: "post" });

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (isEnabled) {
        next.add(repositoryId);
      } else {
        next.delete(repositoryId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const visibleIds = filteredRepositories.map((r) => r.id);
    const formData = new FormData();
    formData.append("intent", "toggle-repositories-batch");
    for (const id of visibleIds) {
      formData.append("repositoryIds", id);
    }
    formData.append("isEnabled", "true");
    fetcher.submit(formData, { method: "post" });

    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of visibleIds) {
        next.add(id);
      }
      return next;
    });
  };

  const handleDeselectAll = () => {
    const visibleIds = filteredRepositories.map((r) => r.id);
    const formData = new FormData();
    formData.append("intent", "toggle-repositories-batch");
    for (const id of visibleIds) {
      formData.append("repositoryIds", id);
    }
    formData.append("isEnabled", "false");
    fetcher.submit(formData, { method: "post" });

    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of visibleIds) {
        next.delete(id);
      }
      return next;
    });
  };

  const filteredRepositories = useMemo(() => {
    if (!searchValue) return allRepositories;
    const lowerSearch = searchValue.toLowerCase();
    return allRepositories.filter((r) => r.name.toLowerCase().includes(lowerSearch) || r.fullName.toLowerCase().includes(lowerSearch));
  }, [allRepositories, searchValue]);

  const selectedCount = selectedIds.size;
  const isLoading = fetcher.state === "loading" || fetcher.state === "submitting";

  return (
    <div className="repositories-section">
      <button type="button" className="repositories-toggle" onClick={onToggle}>
        <span className={`toggle-icon ${isExpanded ? "expanded" : ""}`}>▶</span>
        <span className="toggle-label">Repositories</span>
        {selectedCount > 0 && <span className="selection-badge">{selectedCount} selected</span>}
      </button>

      {isExpanded && (
        <div className="repositories-content">
          {isLoading && allRepositories.length === 0 ? (
            <div className="repositories-loading">
              <div className="loading-skeleton">Loading repositories...</div>
            </div>
          ) : (
            <>
              <div className="repositories-header">
                <input type="text" placeholder="Search repositories..." value={searchValue} onChange={(e) => handleSearchChange(e.target.value)} className="repository-search" />
                <div className="repository-actions">
                  <button type="button" onClick={handleSelectAll} className="btn-repo-action">
                    Select All
                  </button>
                  <button type="button" onClick={handleDeselectAll} className="btn-repo-action">
                    Deselect All
                  </button>
                </div>
              </div>

              <SelectableList
                items={filteredRepositories}
                selectedIds={selectedIds}
                onToggle={handleToggle}
                emptyMessage="No repositories found"
                renderItem={(repo) => {
                  const lastActive = repo.lastSyncAt ? new Date(repo.lastSyncAt) : null;
                  const daysAgo = lastActive ? Math.floor((Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24)) : null;
                  return (
                    <div className="repository-info">
                      <div className="repository-details">
                        <div className="repository-name">{repo.name}</div>
                      </div>
                      <div className="repository-meta">
                        {repo.language && <span className="language">{repo.language}</span>}
                        {repo.isPrivate && <span className="private-badge">Private</span>}
                        {repo.stars > 0 && <span className="stars">★ {repo.stars}</span>}
                        {daysAgo !== null && <span className="last-active">Updated {daysAgo}d ago</span>}
                      </div>
                    </div>
                  );
                }}
              />

              <div className="repositories-footer">
                <span className="selection-count">
                  {selectedCount} of {allRepositories.length} repositories selected
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ProjectsSection({ provider, isExpanded, onToggle }: ProjectsSectionProps) {
  const fetcher = useFetcher();
  const [searchValue, setSearchValue] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    if (isExpanded && !hasInitialized) {
      const formData = new FormData();
      formData.append("intent", "fetch-projects");
      formData.append("provider", provider);
      fetcher.submit(formData, { method: "post" });
      setHasInitialized(true);
    }
  }, [isExpanded, hasInitialized, provider, fetcher]);

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      const data = fetcher.data as ProjectsFetcherData;
      if ("projects" in data) {
        setAllProjects(data.projects);
        const enabledIds = new Set(data.projects.filter((p) => p.isEnabled).map((p) => p.id));
        setSelectedIds(enabledIds);
      }
    }
  }, [fetcher.data, fetcher.state]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchValue(value);
  }, []);

  const handleToggle = (projectId: string, isEnabled: boolean) => {
    const formData = new FormData();
    formData.append("intent", "toggle-project");
    formData.append("projectId", projectId);
    formData.append("isEnabled", String(isEnabled));
    fetcher.submit(formData, { method: "post" });

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (isEnabled) {
        next.add(projectId);
      } else {
        next.delete(projectId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const visibleIds = filteredProjects.map((p) => p.id);
    const formData = new FormData();
    formData.append("intent", "toggle-projects-batch");
    for (const id of visibleIds) {
      formData.append("projectIds", id);
    }
    formData.append("isEnabled", "true");
    fetcher.submit(formData, { method: "post" });

    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of visibleIds) {
        next.add(id);
      }
      return next;
    });
  };

  const handleDeselectAll = () => {
    const visibleIds = filteredProjects.map((p) => p.id);
    const formData = new FormData();
    formData.append("intent", "toggle-projects-batch");
    for (const id of visibleIds) {
      formData.append("projectIds", id);
    }
    formData.append("isEnabled", "false");
    fetcher.submit(formData, { method: "post" });

    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of visibleIds) {
        next.delete(id);
      }
      return next;
    });
  };

  const filteredProjects = useMemo(() => {
    if (!searchValue) return allProjects;
    const lowerSearch = searchValue.toLowerCase();
    return allProjects.filter((p) => p.name.toLowerCase().includes(lowerSearch) || p.key.toLowerCase().includes(lowerSearch));
  }, [allProjects, searchValue]);

  const selectedCount = selectedIds.size;
  const isLoading = fetcher.state === "loading" || fetcher.state === "submitting";

  return (
    <div className="repositories-section">
      <button type="button" className="repositories-toggle" onClick={onToggle}>
        <span className={`toggle-icon ${isExpanded ? "expanded" : ""}`}>▶</span>
        <span className="toggle-label">Projects</span>
        {selectedCount > 0 && <span className="selection-badge">{selectedCount} selected</span>}
      </button>

      {isExpanded && (
        <div className="repositories-content">
          {isLoading && allProjects.length === 0 ? (
            <div className="repositories-loading">
              <div className="loading-skeleton">Loading projects...</div>
            </div>
          ) : (
            <>
              <div className="repositories-header">
                <input type="text" placeholder="Search projects..." value={searchValue} onChange={(e) => handleSearchChange(e.target.value)} className="repository-search" />
                <div className="repository-actions">
                  <button type="button" onClick={handleSelectAll} className="btn-repo-action">
                    Select All
                  </button>
                  <button type="button" onClick={handleDeselectAll} className="btn-repo-action">
                    Deselect All
                  </button>
                </div>
              </div>

              <SelectableList
                items={filteredProjects}
                selectedIds={selectedIds}
                onToggle={handleToggle}
                emptyMessage="No projects found"
                renderItem={(project) => (
                  <div className="project-info">
                    <span className="project-name">{project.name}</span>
                    <span className="project-key">{project.key}</span>
                  </div>
                )}
              />

              <div className="repositories-footer">
                <span className="selection-count">
                  {selectedCount} of {allProjects.length} projects selected
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

interface DataSource {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  isConnected: boolean;
  isRequired: boolean;
  isVcs: boolean;
  isProjectManagement: boolean;
}

interface DataSourceCardProps {
  source: DataSource;
  isFormActive: boolean;
  isRepositoriesExpanded: boolean;
  onToggleForm: (id: string) => void;
  onToggleRepositories: (id: string) => void;
  onConnectionSuccess: (provider: string) => void;
  configs: Record<string, string>;
}

interface RepositoriesSectionProps {
  provider: string;
  isExpanded: boolean;
  onToggle: () => void;
}

interface RepositoriesFetcherData {
  repositories: Repository[];
  totalCount: number;
  nextCursor?: string;
}

interface ProjectsSectionProps {
  provider: string;
  isExpanded: boolean;
  onToggle: () => void;
}

interface Project {
  id: string;
  name: string;
  key: string;
  isEnabled: boolean;
}

interface ProjectsFetcherData {
  projects: Project[];
}

interface Repository {
  id: string;
  name: string;
  fullName: string;
  description: string | null;
  language: string | null;
  stars: number;
  isPrivate: boolean;
  isEnabled: boolean;
  lastSyncAt: Date | null;
}

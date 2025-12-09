import { useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, Link, useActionData, useFetcher, useLoaderData } from "react-router";
import { requireAdmin } from "~/auth/auth.server";
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

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function GitLabIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M23.955 13.587l-1.342-4.135-2.664-8.189a.455.455 0 00-.867 0L16.418 9.45H7.582L4.918 1.263a.455.455 0 00-.867 0L1.386 9.45.044 13.587a.924.924 0 00.331 1.03L12 23.054l11.625-8.436a.92.92 0 00.33-1.031" />
    </svg>
  );
}

function JenkinsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M2.872 24h-.975a3.866 3.866 0 01-.07-.197c-.215-.666-.594-1.49-.692-2.154-.146-.984.78-1.039 1.374-1.465.915-.66 1.635-1.025 2.627-1.62.295-.179 1.182-.624 1.281-.829.201-.408-.345-.982-.49-1.3-.225-.507-.345-.937-.376-1.435-.824-.13-1.455-.627-1.844-1.185-.63-.925-1.066-2.635-.525-3.936.045-.103.254-.305.285-.463.06-.308-.105-.72-.12-1.048-.06-1.692.284-3.15 1.425-3.66.463-1.84 2.113-2.453 3.673-3.367.58-.342 1.224-.562 1.89-.807 2.372-.877 6.027-.712 7.994.783.836.633 2.176 1.97 2.656 2.939 1.262 2.555 1.17 6.825.287 9.934-.12.421-.29 1.032-.533 1.533-.168.35-.689 1.05-.625 1.36.064.314 1.19 1.17 1.432 1.395.434.422 1.26.975 1.324 1.5.07.557-.248 1.336-.41 1.875-.217.721-.436 1.441-.654 2.131H2.87zm11.104-3.54c-.545-.3-1.361-.622-2.065-.757-.87-.164-.78 1.188-.75 1.994.03.643.36 1.316.51 1.744.076.197.09.41.256.449.3.068 1.29-.326 1.575-.479.6-.328 1.064-.844 1.574-1.189.016-.17.016-.34.03-.508a2.648 2.648 0 00-1.095-.277c.314-.15.75-.15 1.035-.332l.016-.193c-.496-.03-.69-.254-1.021-.436zm7.454 2.935a17.78 17.78 0 00.465-1.752c.06-.287.215-.918.178-1.176-.059-.459-.684-.799-1.004-1.086-.584-.525-.95-.975-1.56-1.469-.249.375-.78.615-.983.914 1.447-.689 1.71 2.625 1.141 3.69.09.329.391.45.514.735l-.086.166h1.29c.013 0 .03 0 .044.014zm-6.634-.012c-.05-.074-.1-.135-.15-.209l-.301.195h.45zm2.77 0c.008-.209.018-.404.03-.598-.53.029-.825-.48-1.196-.527-.324-.045-.6.361-1.02.195-.095.105-.183.227-.284.316.154.18.295.375.424.584h.815c.014-.164.135-.285.3-.285.165 0 .284.121.284.27h.66zm2.116 0c-.314-.479-.947-.898-1.68-.555l-.03.541h1.71zm-8.51 0l-.104-.344c-.225-.72-.36-1.26-.405-1.68-.914-.436-1.875-.87-2.654-1.426-.15-.105-1.109-1.35-1.23-1.305-1.739.676-3.359 1.86-4.814 2.984.256.557.48 1.141.69 1.74h8.505zm8.265-2.113c-.029-.512-.164-1.56-.48-1.74-.66-.39-1.846.78-2.34.943.045.15.135.271.15.48.285-.074.645-.029.898.092-.299.03-.629.03-.824.164-.074.195.016.48-.029.764.69.197 1.5.303 2.385.332.164-.227.225-.645.211-1.082zm-4.08-.36c-.044.375.046.51.12.943 1.26.391 1.034-1.74-.135-.959zM8.76 19.5c-.45.457 1.27 1.082 1.814 1.115 0-.29.165-.564.135-.77-.65-.118-1.502-.042-1.945-.347zm5.565.215c0 .043-.061.03-.068.064.58.451 1.014.545 1.802.51.354-.262.67-.563 1.043-.807-.855.074-1.931.607-2.774.23zm3.42-17.726c-1.606-.906-4.35-1.591-6.076-.731-1.38.692-3.27 1.84-3.899 3.292.6 1.402-.166 2.686-.226 4.109-.018.757.36 1.42.391 2.242-.2.338-.825.38-1.26.356-.146-.729-.4-1.549-1.155-1.63-1.064-.116-1.845.764-1.89 1.683-.06 1.08.833 2.864 2.085 2.745.488-.046.608-.54 1.139-.54.285.57-.445.75-.523 1.154-.016.105.06.511.104.705.233.944.744 2.16 1.245 2.88.635.9 1.884 1.051 3.229 1.141.24-.525 1.125-.48 1.706-.346-.691-.27-1.336-.945-1.875-1.529-.615-.676-1.23-1.41-1.261-2.28 1.155 1.604 2.1 3 4.2 3.704 1.59.525 3.45-.254 4.664-1.109.51-.359.811-.93 1.17-1.439 1.35-1.936 1.98-4.71 1.846-7.394-.06-1.111-.06-2.221-.436-2.955-.389-.781-1.695-1.471-2.475-.781-.15-.764.63-1.23 1.545-.96-.66-.854-1.336-1.858-2.266-2.384zM13.58 14.896c.615 1.544 2.724 1.363 4.505 1.323-.084.194-.256.435-.465.515-.57.232-2.145.408-2.937-.012-.506-.27-.824-.873-1.102-1.227-.137-.172-.795-.608-.012-.609zm.164-.87c.893.464 2.52.517 3.731.48.066.267.066.593.068.913-1.55.08-3.386-.304-3.794-1.395h-.005zm6.675-.586c-.473.9-1.145 1.897-2.539 1.928-.023-.284-.045-.735 0-.904 1.064-.103 1.727-.646 2.543-1.017zm-.649-.667c-1.02.66-2.154 1.375-3.824 1.21-.351-.31-.485-1-.14-1.458.181.313.06.885.57.97.944.165 2.038-.579 2.73-.84.42-.713-.046-.976-.42-1.433-.782-.93-1.83-2.1-1.802-3.51.314-.224.346.346.391.45.404.96 1.424 2.175 2.174 3 .18.21.48.39.51.524.092.39-.254.854-.209 1.11zm-13.439-.675c-.314-.184-.393-.99-.768-1.01-.535-.03-.438 1.05-.436 1.68-.37-.33-.435-1.365-.164-1.89-.308-.15-.445.164-.618.284.22-1.59 2.34-.734 1.99.96zM4.713 5.995c-.685.756-.54 2.174-.459 3.188 1.244-.785 2.898.06 2.883 1.394.595-.016.223-.744.115-1.215-.353-1.528.592-3.187.041-4.59-1.064.084-1.939.52-2.578 1.215zm9.12 1.113c.307.562.404 1.148.84 1.57.195.19.574.424.387.95-.045.121-.365.391-.551.45-.674.195-2.254.03-1.721-.81.563.015 1.314.36 1.732-.045-.314-.524-.885-1.53-.674-2.13zm6.198-.013h.068c.33.668.6 1.375 1.004 1.965-.27.628-2.053 1.19-2.023.057.39-.17 1.05-.035 1.395-.25-.193-.556-.48-1.006-.434-1.771zm-6.927-1.617c-1.422-.33-2.131.592-2.56 1.553-.384-.094-.231-.615-.135-.883.255-.701 1.28-1.633 2.119-1.506.359.057.848.386.576.834zM9.642 1.593c-1.56.44-3.56 1.574-4.2 2.974.495-.07.84-.321 1.33-.351.186-.016.428.074.641.015.424-.104.78-1.065 1.102-1.41.31-.345.685-.496.94-.81.167-.09.409-.074.42-.33-.073-.075-.15-.135-.232-.105v.017z" />
    </svg>
  );
}

function CircleCIIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8.87 12.08a3.24 3.24 0 116.47 0 3.24 3.24 0 01-6.47 0zm3.23-9.4a9.4 9.4 0 00-9.09 7.07.49.49 0 00.48.62h4.65a.49.49 0 00.47-.35 4.27 4.27 0 018.14 1.47A4.27 4.27 0 0112.48 16a4.22 4.22 0 01-3.73-2.27.49.49 0 00-.43-.25H3.49a.49.49 0 00-.48.62 9.4 9.4 0 109.09-11.42z" />
    </svg>
  );
}

function SonarQubeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21.017 19.514a.543.543 0 0 1-.543.543H3.526a.543.543 0 1 1 0-1.086h16.948a.543.543 0 0 1 .543.543zm-3.6-3.257a.543.543 0 0 1-.543.543H6.126a.543.543 0 1 1 0-1.086h10.748a.543.543 0 0 1 .543.543zm-2.743-3.257a.543.543 0 0 1-.543.543H8.87a.543.543 0 1 1 0-1.086h5.26a.543.543 0 0 1 .544.543zM12 3.943c-4.444 0-8.057 3.613-8.057 8.057h1.086c0-3.845 3.126-6.971 6.971-6.971s6.971 3.126 6.971 6.971h1.086c0-4.444-3.613-8.057-8.057-8.057z" />
    </svg>
  );
}

const VCS_PROVIDERS = new Set(["github", "gitlab"]);

export default function OnboardingDataSources() {
  const { connectedProviders, dataSourceConfigs } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [activeForm, setActiveForm] = useState<string | null>(null);
  const [expandedRepositories, setExpandedRepositories] = useState<Set<string>>(new Set());

  const successfulProvider = actionData && "success" in actionData && actionData.success && "provider" in actionData ? actionData.provider : null;
  const connectedSet = new Set([...connectedProviders, ...(successfulProvider ? [successfulProvider] : [])]);

  useEffect(() => {
    if (successfulProvider) {
      setActiveForm(null);
      // Auto-expand repositories for VCS providers after successful connection
      if (VCS_PROVIDERS.has(successfulProvider as string)) {
        setExpandedRepositories((prev) => new Set([...prev, successfulProvider as string]));
      }
      const cardElement = document.getElementById(`${successfulProvider}Card`);
      if (cardElement) {
        cardElement.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [successfulProvider]);

  const versionControlSources: DataSource[] = [
    {
      id: "github",
      name: "GitHub",
      icon: <GitHubIcon />,
      description: "Connect your GitHub organization to import repositories, commits, pull requests, and contributor data. Track code collaboration and delivery velocity.",
      isConnected: connectedSet.has("github"),
      isRequired: true,
      isVcs: true,
    },
    {
      id: "gitlab",
      name: "GitLab",
      icon: <GitLabIcon />,
      description: "Connect to GitLab (cloud or self-hosted) to track projects, merge requests, CI/CD pipelines, and team activity across your development lifecycle.",
      isConnected: connectedSet.has("gitlab"),
      isRequired: true,
      isVcs: true,
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
    },
    {
      id: "circleci",
      name: "CircleCI",
      icon: <CircleCIIcon />,
      description: "Monitor pipeline performance, workflow duration, and build success metrics from your CircleCI projects.",
      isConnected: connectedSet.has("circleci"),
      isRequired: false,
      isVcs: false,
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
                actionData={actionData}
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
                actionData={actionData}
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
                actionData={actionData}
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

function DataSourceCard({ source, isFormActive, isRepositoriesExpanded, onToggleForm, onToggleRepositories, actionData, configs }: DataSourceCardProps) {
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
        {source.isConnected ? `Edit ${source.name} Configuration` : `Configure ${source.name}`}
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
                <input
                  type={field.type}
                  id={`${source.id}-${field.key}`}
                  name={field.key}
                  placeholder={field.placeholder}
                  required={field.required}
                  defaultValue={configs[field.key] || ""}
                />
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

      {source.isVcs && source.isConnected && <RepositoriesSection provider={source.id} isExpanded={isRepositoriesExpanded} onToggle={() => onToggleRepositories(source.id)} />}
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

              <RepositoryList repositories={filteredRepositories} selectedIds={selectedIds} onToggle={handleToggle} />

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

function RepositoryList({ repositories, selectedIds, onToggle }: RepositoryListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: repositories.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 5,
  });

  if (repositories.length === 0) {
    return <div className="repositories-empty">No repositories found</div>;
  }

  return (
    <div ref={parentRef} className="repository-list">
      <div className="repository-list-sizer" style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const repo = repositories[virtualRow.index];
          return repo ? (
            <RepositoryRow
              key={repo.id}
              repo={repo}
              isSelected={selectedIds.has(repo.id)}
              onToggle={onToggle}
              measureRef={virtualizer.measureElement}
              style={{ transform: `translateY(${virtualRow.start}px)` }}
            />
          ) : null;
        })}
      </div>
    </div>
  );
}

function RepositoryRow({ repo, isSelected, onToggle, measureRef, style }: RepositoryRowProps) {
  const lastActive = repo.lastSyncAt ? new Date(repo.lastSyncAt) : null;
  const daysAgo = lastActive ? Math.floor((Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24)) : null;

  return (
    <div ref={measureRef} data-testid="repository-item" style={style} className="repository-row">
      <label className="repository-item">
        <input type="checkbox" checked={isSelected} onChange={(e) => onToggle(repo.id, e.target.checked)} />
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
      </label>
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
}

interface DataSourceCardProps {
  source: DataSource;
  isFormActive: boolean;
  isRepositoriesExpanded: boolean;
  onToggleForm: (id: string) => void;
  onToggleRepositories: (id: string) => void;
  actionData: ReturnType<typeof useActionData<typeof action>>;
  configs: Record<string, string>;
}

interface RepositoriesSectionProps {
  provider: string;
  isExpanded: boolean;
  onToggle: () => void;
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

interface RepositoriesFetcherData {
  repositories: Repository[];
  totalCount: number;
  nextCursor?: string;
}

interface RepositoryListProps {
  repositories: Repository[];
  selectedIds: Set<string>;
  onToggle: (id: string, isEnabled: boolean) => void;
}

interface RepositoryRowProps {
  repo: Repository;
  isSelected: boolean;
  onToggle: (id: string, selected: boolean) => void;
  measureRef: (el: HTMLDivElement | null) => void;
  style: React.CSSProperties;
}

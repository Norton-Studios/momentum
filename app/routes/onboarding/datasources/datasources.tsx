import { Octokit } from "@octokit/rest";
import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { data, Form, Link, redirect, useActionData, useLoaderData } from "react-router";
import { requireUser } from "~/auth/auth.server";
import { db } from "~/db.server";
import { Button } from "../../../components/button/button";
import { Logo } from "../../../components/logo/logo";
import "./datasources.css";

const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
  github: {
    fields: [
      { key: "GITHUB_TOKEN", label: "Personal Access Token", type: "password", placeholder: "ghp_xxxxxxxxxxxx", required: true },
      { key: "GITHUB_ORG", label: "Organization", type: "text", placeholder: "my-organization", required: true },
    ],
  },
  gitlab: {
    fields: [
      { key: "GITLAB_TOKEN", label: "Personal Access Token", type: "password", placeholder: "glpat-xxxxxxxxxxxx", required: true },
      { key: "GITLAB_URL", label: "GitLab URL", type: "text", placeholder: "https://gitlab.com", required: false },
    ],
  },
  bitbucket: {
    fields: [
      { key: "BITBUCKET_TOKEN", label: "App Password", type: "password", placeholder: "xxxxxxxxxxxx", required: true },
      { key: "BITBUCKET_WORKSPACE", label: "Workspace", type: "text", placeholder: "my-workspace", required: true },
    ],
  },
  jenkins: {
    fields: [
      { key: "JENKINS_URL", label: "Jenkins URL", type: "text", placeholder: "https://jenkins.example.com", required: true },
      { key: "JENKINS_TOKEN", label: "API Token", type: "password", placeholder: "xxxxxxxxxxxx", required: true },
    ],
  },
  circleci: {
    fields: [{ key: "CIRCLECI_TOKEN", label: "API Token", type: "password", placeholder: "xxxxxxxxxxxx", required: true }],
  },
  sonarqube: {
    fields: [
      { key: "SONARQUBE_URL", label: "SonarQube URL", type: "text", placeholder: "https://sonarqube.example.com", required: true },
      { key: "SONARQUBE_TOKEN", label: "API Token", type: "password", placeholder: "xxxxxxxxxxxx", required: true },
    ],
  },
};

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

export async function action({ request }: ActionFunctionArgs) {
  await requireUser(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  const providerMap: Record<string, DataSourceProviderEnum> = {
    github: "GITHUB",
    gitlab: "GITLAB",
    bitbucket: "BITBUCKET",
    jenkins: "JENKINS",
    circleci: "CIRCLECI",
    sonarqube: "SONARQUBE",
  };

  if (intent === "test") {
    const provider = formData.get("provider") as string;
    const configs = extractConfigsFromForm(formData, provider);

    const testResult = await testConnection(provider, configs);
    if (!testResult.success) {
      return data({ testError: testResult.error ?? "Connection failed", provider }, { status: 400 });
    }
    return data({ testSuccess: true, provider });
  }

  if (intent === "connect") {
    const provider = formData.get("provider");

    if (typeof provider !== "string" || !provider) {
      return data({ errors: { provider: "Provider is required" } }, { status: 400 });
    }

    const providerEnum = providerMap[provider];
    if (!providerEnum) {
      return data({ errors: { provider: "Invalid provider" } }, { status: 400 });
    }

    const configs = extractConfigsFromForm(formData, provider);
    const providerConfig = PROVIDER_CONFIGS[provider];
    for (const field of providerConfig.fields) {
      if (field.required && !configs[field.key]) {
        return data({ errors: { [field.key]: `${field.label} is required` } }, { status: 400 });
      }
    }

    let organization = await db.organization.findFirst();
    if (!organization) {
      organization = await db.organization.create({
        data: {
          name: "default",
          displayName: "Default Organization",
        },
      });
    }

    const existingDataSource = await db.dataSource.findFirst({
      where: {
        organizationId: organization.id,
        provider: providerEnum,
      },
    });

    let dataSourceId: string;
    if (existingDataSource) {
      await db.dataSource.update({
        where: { id: existingDataSource.id },
        data: { isEnabled: true },
      });
      dataSourceId = existingDataSource.id;
    } else {
      const newDataSource = await db.dataSource.create({
        data: {
          organizationId: organization.id,
          name: `${provider} Integration`,
          provider: providerEnum,
          isEnabled: true,
        },
      });
      dataSourceId = newDataSource.id;
    }

    for (const [key, value] of Object.entries(configs)) {
      const isSecret = key.toLowerCase().includes("token") || key.toLowerCase().includes("password");
      await db.dataSourceConfig.upsert({
        where: { dataSourceId_key: { dataSourceId, key } },
        create: { dataSourceId, key, value, isSecret },
        update: { value },
      });
    }

    return data({ success: true, provider });
  }

  if (intent === "continue") {
    return redirect("/dashboard");
  }

  return data({ errors: { form: "Invalid action" } }, { status: 400 });
}

function extractConfigsFromForm(formData: FormData, provider: string): Record<string, string> {
  const providerConfig = PROVIDER_CONFIGS[provider];
  if (!providerConfig) return {};

  const configs: Record<string, string> = {};
  for (const field of providerConfig.fields) {
    const value = formData.get(field.key);
    if (typeof value === "string" && value) {
      configs[field.key] = value;
    }
  }
  return configs;
}

async function testConnection(provider: string, configs: Record<string, string>): Promise<{ success: boolean; error?: string }> {
  if (provider === "github") {
    const token = configs.GITHUB_TOKEN;
    const org = configs.GITHUB_ORG;
    if (!token || !org) {
      return { success: false, error: "Token and organization are required" };
    }
    try {
      const octokit = new Octokit({ auth: token });
      await octokit.orgs.get({ org });
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Connection failed";
      return { success: false, error: message };
    }
  }

  // Other providers not implemented yet
  return { success: false, error: "Test connection not implemented for this provider" };
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

interface ProviderConfigField {
  key: string;
  label: string;
  type: "text" | "password";
  placeholder: string;
  required: boolean;
}

interface ProviderConfig {
  fields: ProviderConfigField[];
}

type DataSourceProviderEnum = "GITHUB" | "GITLAB" | "BITBUCKET" | "JENKINS" | "CIRCLECI" | "SONARQUBE";

import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useActionData, useNavigation, useSearchParams } from "@remix-run/react";
import { useState } from "react";
import { type DataSourceProvider, type DataSourceConfig, Button } from "@mmtm/components";
import { getOnboardingProgress, updateOnboardingProgress } from "@mmtm/resource-tenant";
import { prisma as db } from "@mmtm/database";
import { requireUser } from "~/utils/session.server";

// Define data source categories and providers
const DATA_SOURCE_CATEGORIES = [
  {
    id: "vcs",
    name: "Version Control Systems",
    description: "Connect your code repositories and pull requests",
    required: true,
    providers: [
      {
        id: "github",
        name: "GitHub",
        description: "Connect your GitHub repositories and pull requests",
        icon: "🐙",
        required: false,
        features: ["Repositories", "Pull Requests", "Issues", "Actions"],
        fields: [
          {
            key: "token",
            label: "Personal Access Token",
            type: "password",
            placeholder: "ghp_...",
            required: true,
            help: "Generate a token with repo and read:org permissions at https://github.com/settings/tokens",
          },
          {
            key: "org",
            label: "Organization",
            type: "text",
            placeholder: "your-org",
            required: true,
            help: "GitHub organization or username",
          },
        ],
      },
      {
        id: "gitlab",
        name: "GitLab",
        description: "Connect your GitLab projects and merge requests",
        icon: "🦊",
        required: false,
        features: ["Projects", "Merge Requests", "Issues", "Pipelines"],
        fields: [
          {
            key: "token",
            label: "Personal Access Token",
            type: "password",
            placeholder: "glpat-...",
            required: true,
            help: "Generate a token with api and read_repository permissions",
          },
          {
            key: "url",
            label: "GitLab URL",
            type: "url",
            placeholder: "https://gitlab.com",
            required: true,
            help: "Your GitLab instance URL",
          },
          {
            key: "group",
            label: "Group",
            type: "text",
            placeholder: "your-group",
            required: true,
            help: "GitLab group or username",
          },
        ],
      },
      {
        id: "bitbucket",
        name: "Bitbucket",
        description: "Connect your Bitbucket repositories and pull requests",
        icon: "🪣",
        required: false,
        features: ["Repositories", "Pull Requests", "Issues", "Pipelines"],
        fields: [
          {
            key: "username",
            label: "Username",
            type: "text",
            placeholder: "your-username",
            required: true,
            help: "Your Bitbucket username",
          },
          {
            key: "token",
            label: "App Password",
            type: "password",
            placeholder: "App password",
            required: true,
            help: "Generate an app password in your Bitbucket settings",
          },
          {
            key: "workspace",
            label: "Workspace",
            type: "text",
            placeholder: "your-workspace",
            required: true,
            help: "Your Bitbucket workspace",
          },
        ],
      },
    ],
  },
  {
    id: "cicd",
    name: "CI/CD & Build Tools",
    description: "Connect your continuous integration and deployment pipelines",
    required: false,
    providers: [
      {
        id: "jenkins",
        name: "Jenkins",
        description: "Connect your Jenkins builds and pipelines",
        icon: "🔧",
        required: false,
        features: ["Builds", "Pipelines", "Test Results", "Deployments"],
        fields: [
          {
            key: "url",
            label: "Jenkins URL",
            type: "url",
            placeholder: "https://jenkins.company.com",
            required: true,
            help: "Your Jenkins instance URL",
          },
          {
            key: "username",
            label: "Username",
            type: "text",
            placeholder: "jenkins-user",
            required: true,
            help: "Your Jenkins username",
          },
          {
            key: "token",
            label: "API Token",
            type: "password",
            placeholder: "API token",
            required: true,
            help: "Generate an API token in your Jenkins user settings",
          },
        ],
      },
      {
        id: "circleci",
        name: "CircleCI",
        description: "Connect your CircleCI builds and workflows",
        icon: "⚪",
        required: false,
        features: ["Workflows", "Jobs", "Test Results", "Artifacts"],
        fields: [
          {
            key: "token",
            label: "Personal API Token",
            type: "password",
            placeholder: "CircleCI token",
            required: true,
            help: "Generate a token in your CircleCI user settings",
          },
          {
            key: "organization",
            label: "Organization",
            type: "text",
            placeholder: "your-org",
            required: true,
            help: "Your CircleCI organization",
          },
        ],
      },
      {
        id: "github-actions",
        name: "GitHub Actions",
        description: "Connect your GitHub Actions workflows",
        icon: "⚡",
        required: false,
        features: ["Workflows", "Jobs", "Artifacts", "Deployments"],
        fields: [
          {
            key: "token",
            label: "GitHub Token",
            type: "password",
            placeholder: "ghp_...",
            required: true,
            help: "Use the same token from your GitHub VCS configuration",
          },
        ],
      },
    ],
  },
  {
    id: "project",
    name: "Project Management",
    description: "Connect your project management and issue tracking tools",
    required: false,
    providers: [
      {
        id: "jira",
        name: "JIRA",
        description: "Connect your JIRA projects and issues",
        icon: "📋",
        required: false,
        features: ["Issues", "Projects", "Sprints", "Epics"],
        fields: [
          {
            key: "url",
            label: "JIRA URL",
            type: "url",
            placeholder: "https://your-domain.atlassian.net",
            required: true,
            help: "Your JIRA instance URL",
          },
          {
            key: "email",
            label: "Email",
            type: "email",
            placeholder: "you@company.com",
            required: true,
            help: "Your JIRA account email",
          },
          {
            key: "token",
            label: "API Token",
            type: "password",
            placeholder: "API token",
            required: true,
            help: "Generate an API token at https://id.atlassian.com/manage-profile/security/api-tokens",
          },
        ],
      },
      {
        id: "linear",
        name: "Linear",
        description: "Connect your Linear issues and projects",
        icon: "📐",
        required: false,
        features: ["Issues", "Projects", "Cycles", "Teams"],
        fields: [
          {
            key: "token",
            label: "API Key",
            type: "password",
            placeholder: "Linear API key",
            required: true,
            help: "Generate an API key in your Linear settings",
          },
          {
            key: "organization",
            label: "Organization",
            type: "text",
            placeholder: "your-org",
            required: true,
            help: "Your Linear organization",
          },
        ],
      },
      {
        id: "asana",
        name: "Asana",
        description: "Connect your Asana projects and tasks",
        icon: "🎯",
        required: false,
        features: ["Tasks", "Projects", "Teams", "Goals"],
        fields: [
          {
            key: "token",
            label: "Personal Access Token",
            type: "password",
            placeholder: "Asana token",
            required: true,
            help: "Generate a token in your Asana developer console",
          },
          {
            key: "workspace",
            label: "Workspace",
            type: "text",
            placeholder: "your-workspace",
            required: true,
            help: "Your Asana workspace",
          },
        ],
      },
    ],
  },
  {
    id: "quality",
    name: "Code Quality & Security",
    description: "Connect your code quality and security analysis tools",
    required: false,
    providers: [
      {
        id: "sonarqube",
        name: "SonarQube",
        description: "Connect your SonarQube code quality analysis",
        icon: "🔍",
        required: false,
        features: ["Code Quality", "Security", "Coverage", "Duplications"],
        fields: [
          {
            key: "url",
            label: "SonarQube URL",
            type: "url",
            placeholder: "https://sonarqube.company.com",
            required: true,
            help: "Your SonarQube instance URL",
          },
          {
            key: "token",
            label: "User Token",
            type: "password",
            placeholder: "SonarQube token",
            required: true,
            help: "Generate a token in your SonarQube user settings",
          },
        ],
      },
      {
        id: "codeql",
        name: "CodeQL",
        description: "Connect your CodeQL security analysis",
        icon: "🛡️",
        required: false,
        features: ["Security", "Vulnerabilities", "Code Scanning", "Alerts"],
        fields: [
          {
            key: "token",
            label: "GitHub Token",
            type: "password",
            placeholder: "ghp_...",
            required: true,
            help: "Use the same token from your GitHub VCS configuration",
          },
        ],
      },
    ],
  },
];

// Legacy flat array for backward compatibility with DataSourceConfigForm
const DATA_SOURCE_PROVIDERS: DataSourceProvider[] = DATA_SOURCE_CATEGORIES.flatMap((category) =>
  category.providers.map((provider) => ({
    ...provider,
    category: category.id,
    categoryName: category.name,
  })),
);

// Provider Configuration Form Component
function ProviderConfigForm({
  provider,
  existingConfig,
  onSave,
  onTest,
  isSubmitting,
}: {
  provider: any;
  existingConfig?: DataSourceConfig;
  onSave: (config: DataSourceConfig) => void;
  onTest: (config: DataSourceConfig) => Promise<any>;
  isSubmitting: boolean;
}) {
  const [formData, setFormData] = useState(() => {
    const initialData: Record<string, string> = {};
    provider.fields.forEach((field: any) => {
      initialData[field.key] = existingConfig?.fields?.[field.key] || "";
    });
    return initialData;
  });

  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{ success: boolean; error?: string } | null>(null);

  const handleInputChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setConnectionResult(null); // Clear previous test results when form changes
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setConnectionResult(null);

    const config: DataSourceConfig = {
      dataSource: provider.id,
      fields: formData,
      connected: false,
    };

    try {
      const result = await onTest(config);
      setConnectionResult(result);
      if (result.success) {
        // Auto-save successful configuration
        onSave({ ...config, connected: true });
      }
    } catch (_error) {
      setConnectionResult({ success: false, error: "Connection test failed" });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSave = () => {
    const config: DataSourceConfig = {
      dataSource: provider.id,
      fields: formData,
      connected: connectionResult?.success || false,
    };
    onSave(config);
  };

  const isFormValid = provider.fields.every((field: any) => !field.required || (formData[field.key] && formData[field.key].trim()));

  return (
    <div style={{ backgroundColor: "#f9fafb", padding: "1.5rem", borderRadius: "0.375rem" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h4 style={{ fontSize: "1rem", fontWeight: "600", color: "#1f2937", margin: "0 0 0.5rem 0" }}>Configure {provider.name}</h4>
        <p style={{ fontSize: "0.875rem", color: "#6b7280", margin: 0 }}>{provider.description}</p>
      </div>

      <div style={{ display: "grid", gap: "1rem", marginBottom: "1.5rem" }}>
        {provider.fields.map((field: any) => {
          const inputId = `${provider.id}-${field.key}`;
          return (
            <div key={field.key}>
              <label
                htmlFor={inputId}
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "0.5rem",
                }}
              >
                {field.label}
                {field.required && <span style={{ color: "#dc2626", marginLeft: "0.25rem" }}>*</span>}
              </label>
              <input
                id={inputId}
                type={field.type}
                placeholder={field.placeholder}
                value={formData[field.key] || ""}
                onChange={(e) => handleInputChange(field.key, e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.375rem",
                  fontSize: "0.875rem",
                  backgroundColor: "white",
                  boxSizing: "border-box",
                }}
                disabled={isSubmitting || isTestingConnection}
              />
              {field.help && <p style={{ fontSize: "0.75rem", color: "#6b7280", margin: "0.25rem 0 0 0" }}>{field.help}</p>}
            </div>
          );
        })}
      </div>

      {/* Connection Status */}
      {connectionResult && (
        <div
          style={{
            padding: "0.75rem",
            borderRadius: "0.375rem",
            marginBottom: "1rem",
            backgroundColor: connectionResult.success ? "#d1fae5" : "#fee2e2",
            border: `1px solid ${connectionResult.success ? "#a7f3d0" : "#fecaca"}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1rem" }}>{connectionResult.success ? "✅" : "❌"}</span>
            <span
              style={{
                fontSize: "0.875rem",
                fontWeight: "500",
                color: connectionResult.success ? "#065f46" : "#dc2626",
              }}
            >
              {connectionResult.success ? "Connection successful!" : `Connection failed: ${connectionResult.error}`}
            </span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
        <Button variant="outline" onClick={handleTestConnection} disabled={!isFormValid || isTestingConnection || isSubmitting}>
          {isTestingConnection ? "Testing..." : "Test Connection"}
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={!isFormValid || isSubmitting}>
          Save Configuration
        </Button>
      </div>
    </div>
  );
}

export async function loader({ request }: LoaderFunctionArgs) {
  // Require user authentication via session
  const user = await requireUser(request);
  const tenantId = user.tenantId;

  try {
    const progress = await getOnboardingProgress(tenantId, db);

    if (!progress) {
      throw new Response("Onboarding progress not found", { status: 404 });
    }

    return json({
      tenantId,
      progress,
      providers: DATA_SOURCE_PROVIDERS,
      existingConfigurations: (progress.wizardData as any)?.dataSourceConfigurations || [],
    });
  } catch (error) {
    console.error("Failed to load onboarding progress:", error);
    throw new Response("Failed to load onboarding progress", { status: 500 });
  }
}

export async function action({ request }: ActionFunctionArgs) {
  // Require user authentication via session
  const user = await requireUser(request);
  const tenantId = user.tenantId;

  const formData = await request.formData();
  const action = formData.get("_action") as string;

  try {
    if (action === "test-connection") {
      const configData = JSON.parse(formData.get("config") as string) as DataSourceConfig;

      // Mock connection testing - in real implementation, this would test actual connections
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call

      // Mock success/failure based on configuration
      const hasRequiredFields = Object.values(configData.fields).every((value) => value.trim());

      if (!hasRequiredFields) {
        return json({
          success: false,
          error: "Missing required fields",
        });
      }

      // Mock some realistic failures
      if (configData.fields.token === "invalid") {
        return json({
          success: false,
          error: "Invalid token",
        });
      }

      return json({ success: true });
    }

    if (action === "save-progress") {
      const configurations = JSON.parse(formData.get("configurations") as string) as DataSourceConfig[];

      // Update onboarding progress
      await updateOnboardingProgress(tenantId, "teams", ["signup", "data-sources"], { dataSourceConfigurations: configurations }, db);

      return json({ success: true });
    }

    return json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Action error:", error);
    return json({ error: "Action failed" }, { status: 500 });
  }
}

export default function DataSourcesPage() {
  const { tenantId, providers, existingConfigurations } = useLoaderData<typeof loader>();
  const _actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [_searchParams] = useSearchParams();

  const [configurations, setConfigurations] = useState<DataSourceConfig[]>(existingConfigurations);
  const [expandedProviders, setExpandedProviders] = useState<string[]>([]);

  const isSubmitting = navigation.state === "submitting";

  const handleTestConnection = async (config: DataSourceConfig) => {
    const formData = new FormData();
    formData.append("_action", "test-connection");
    formData.append("tenantId", tenantId);
    formData.append("config", JSON.stringify(config));

    const response = await fetch("/onboarding/data-sources", {
      method: "POST",
      body: formData,
    });

    return await response.json();
  };

  const handleContinue = async () => {
    const formData = new FormData();
    formData.append("_action", "save-progress");
    formData.append("tenantId", tenantId);
    formData.append("configurations", JSON.stringify(configurations));

    const form = document.createElement("form");
    form.method = "POST";
    form.style.display = "none";

    for (const [key, value] of formData.entries()) {
      const input = document.createElement("input");
      input.name = key;
      input.value = value.toString();
      form.appendChild(input);
    }

    document.body.appendChild(form);
    form.submit();
  };

  const toggleProvider = (providerId: string) => {
    setExpandedProviders((prev) => (prev.includes(providerId) ? prev.filter((id) => id !== providerId) : [...prev, providerId]));
  };

  const hasRequiredVCS = configurations.some((config) => {
    const provider = providers.find((p) => p.id === config.dataSource);
    return provider?.category === "vcs" && config.connected;
  });

  const canProceed = hasRequiredVCS;

  const getConnectionStatus = (providerId: string) => {
    const config = configurations.find((c) => c.dataSource === providerId);
    return config?.connected ? "connected" : config ? "configured" : "not-configured";
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f9fafb" }}>
      {/* Header */}
      <header style={{ backgroundColor: "white", borderBottom: "1px solid #e5e7eb", padding: "1rem 2rem" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto", position: "relative" }}>
          <div style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)" }}>
            <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#1e40af", margin: 0 }}>Momentum</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "2rem" }}>
            {[
              { step: 1, label: "Account", completed: true, current: false },
              { step: 2, label: "Data Sources", completed: false, current: true },
              { step: 3, label: "Teams", completed: false, current: false },
              { step: 4, label: "Review", completed: false, current: false },
            ].map(({ step, label, completed, current }) => (
              <div key={step} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <div
                  style={{
                    width: "2rem",
                    height: "2rem",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    backgroundColor: completed ? "#22c55e" : current ? "#1e40af" : "#e5e7eb",
                    color: completed || current ? "white" : "#6b7280",
                  }}
                >
                  {completed ? "✓" : step}
                </div>
                <span
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: "500",
                    color: completed || current ? "#1f2937" : "#6b7280",
                  }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: "1000px", margin: "0 auto", padding: "2rem" }}>
        <div style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.875rem", fontWeight: "bold", color: "#1f2937", margin: "0 0 0.5rem 0" }}>Connect Your Data Sources</h2>
          <p style={{ color: "#6b7280", margin: 0 }}>Set up integrations to automatically collect productivity metrics from your development tools.</p>
        </div>

        {/* Categories */}
        {DATA_SOURCE_CATEGORIES.map((category) => (
          <div key={category.id} style={{ marginBottom: "3rem" }}>
            {/* Category Header */}
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                <h3 style={{ fontSize: "1.25rem", fontWeight: "600", color: "#1f2937", margin: 0 }}>{category.name}</h3>
                {category.required && (
                  <span
                    style={{
                      backgroundColor: "#fef3c7",
                      color: "#d97706",
                      fontSize: "0.75rem",
                      fontWeight: "600",
                      padding: "0.25rem 0.5rem",
                      borderRadius: "0.375rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Required
                  </span>
                )}
              </div>
              <p style={{ color: "#6b7280", margin: 0, fontSize: "0.875rem" }}>{category.description}</p>
            </div>

            {/* Providers Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1rem" }}>
              {category.providers.map((provider) => {
                const status = getConnectionStatus(provider.id);
                const isExpanded = expandedProviders.includes(provider.id);

                return (
                  <div
                    key={provider.id}
                    style={{
                      backgroundColor: "white",
                      border: `2px solid ${status === "connected" ? "#22c55e" : status === "configured" ? "#f59e0b" : "#e5e7eb"}`,
                      borderRadius: "0.5rem",
                      transition: "all 0.2s",
                    }}
                  >
                    {/* Clickable Header */}
                    <button
                      type="button"
                      style={{
                        width: "100%",
                        padding: "1.5rem",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        textAlign: "left",
                        borderRadius: "0.5rem",
                      }}
                      onClick={() => toggleProvider(provider.id)}
                    >
                      {/* Provider Header */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <span style={{ fontSize: "1.5rem" }}>{provider.icon}</span>
                          <div>
                            <h4 style={{ fontSize: "1rem", fontWeight: "600", color: "#1f2937", margin: 0 }}>{provider.name}</h4>
                            {provider.required && <span style={{ fontSize: "0.75rem", color: "#d97706", fontWeight: "500" }}>Required</span>}
                          </div>
                        </div>

                        {/* Connection Status */}
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          {status === "connected" && (
                            <div
                              style={{
                                backgroundColor: "#22c55e",
                                color: "white",
                                fontSize: "0.75rem",
                                fontWeight: "600",
                                padding: "0.25rem 0.5rem",
                                borderRadius: "0.25rem",
                              }}
                            >
                              Connected
                            </div>
                          )}
                          {status === "configured" && (
                            <div
                              style={{
                                backgroundColor: "#f59e0b",
                                color: "white",
                                fontSize: "0.75rem",
                                fontWeight: "600",
                                padding: "0.25rem 0.5rem",
                                borderRadius: "0.25rem",
                              }}
                            >
                              Configured
                            </div>
                          )}
                          <span style={{ fontSize: "1.25rem", color: "#6b7280" }}>{isExpanded ? "▼" : "▶"}</span>
                        </div>
                      </div>

                      <p style={{ color: "#6b7280", fontSize: "0.875rem", margin: "0 0 1rem 0" }}>{provider.description}</p>

                      {/* Feature Tags */}
                      {provider.features && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: isExpanded ? "0" : "0" }}>
                          {provider.features.map((feature) => (
                            <span
                              key={feature}
                              style={{
                                backgroundColor: "#f3f4f6",
                                color: "#374151",
                                fontSize: "0.75rem",
                                padding: "0.25rem 0.5rem",
                                borderRadius: "0.25rem",
                                fontWeight: "500",
                              }}
                            >
                              {feature}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>

                    {/* Configuration Form (when expanded) - Outside the button */}
                    {isExpanded && (
                      <div style={{ borderTop: "1px solid #e5e7eb", padding: "0 1.5rem 1.5rem 1.5rem" }}>
                        <ProviderConfigForm
                          provider={provider}
                          existingConfig={configurations.find((c) => c.dataSource === provider.id)}
                          onSave={(config) => {
                            setConfigurations((prev) => {
                              const existing = prev.find((c) => c.dataSource === provider.id);
                              if (existing) {
                                return prev.map((c) => (c.dataSource === provider.id ? config : c));
                              }
                              return [...prev, config];
                            });
                          }}
                          onTest={(config) => handleTestConnection(config)}
                          isSubmitting={isSubmitting}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Continue Button */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "3rem",
            paddingTop: "2rem",
            borderTop: "1px solid #e2e8f0",
          }}
        >
          <Button variant="outline" onClick={() => window.history.back()} disabled={isSubmitting}>
            Back
          </Button>

          <Button variant="primary" onClick={handleContinue} disabled={!canProceed || isSubmitting}>
            {isSubmitting ? "Saving..." : "Continue to Team Setup"}
          </Button>
        </div>
      </main>
    </div>
  );
}

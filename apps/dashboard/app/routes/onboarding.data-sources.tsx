import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useActionData, useNavigation, useSearchParams } from "@remix-run/react";
import { useState } from "react";
import { OnboardingWizard, type WizardStep, DataSourceConfigForm, type DataSourceProvider, type DataSourceConfig, Button } from "@mmtm/components";
import { getOnboardingProgress, updateOnboardingProgress } from "@mmtm/resource-tenant";
import { prisma as db } from "@mmtm/database";
import { requireUser } from "~/utils/session.server";

// Define available data source providers
const DATA_SOURCE_PROVIDERS: DataSourceProvider[] = [
  {
    id: "github",
    name: "GitHub",
    description: "Connect your GitHub repositories and pull requests",
    icon: "🐙",
    required: true,
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
    id: "jira",
    name: "JIRA",
    description: "Connect your JIRA projects and issues",
    icon: "📋",
    required: false,
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
    id: "jenkins",
    name: "Jenkins",
    description: "Connect your Jenkins builds and pipelines",
    icon: "🔧",
    required: false,
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
];

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
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [_searchParams] = useSearchParams();

  const [configurations, setConfigurations] = useState<DataSourceConfig[]>(existingConfigurations);

  const isSubmitting = navigation.state === "submitting";

  const steps: WizardStep[] = [
    { id: "signup", title: "Create Account", completed: true, current: false },
    { id: "data-sources", title: "Connect Data Sources", completed: false, current: true },
    { id: "teams", title: "Organize Teams", completed: false, current: false },
    { id: "review", title: "Review & Complete", completed: false, current: false },
  ];

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

  const hasRequiredVCS = configurations.some((config) => {
    const provider = providers.find((p) => p.id === config.dataSource);
    return provider?.required && config.connected;
  });

  const canProceed = hasRequiredVCS;

  return (
    <OnboardingWizard steps={steps}>
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <DataSourceConfigForm
          providers={providers}
          configurations={configurations}
          onConfigurationChange={setConfigurations}
          onTestConnection={handleTestConnection}
          isSubmitting={isSubmitting}
          error={actionData && "error" in actionData ? actionData.error : undefined}
        />

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
      </div>
    </OnboardingWizard>
  );
}

import { Octokit } from "@octokit/rest";
import type { ActionFunctionArgs } from "react-router";
import { data, redirect } from "react-router";
import { requireUser } from "~/auth/auth.server";
import { db } from "~/db.server";

export const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
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

export async function datasourcesAction({ request }: ActionFunctionArgs) {
  await requireUser(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "test") {
    return handleTestIntent(formData);
  }

  if (intent === "connect") {
    return handleConnectIntent(formData);
  }

  if (intent === "continue") {
    return redirect("/dashboard");
  }

  return data({ errors: { form: "Invalid action" } }, { status: 400 });
}

async function handleTestIntent(formData: FormData) {
  const provider = formData.get("provider") as string;
  const configs = extractConfigsFromForm(formData, provider);

  const testResult = await testConnection(provider, configs);
  if (!testResult.success) {
    return data({ testError: testResult.error ?? "Connection failed", provider }, { status: 400 });
  }
  return data({ testSuccess: true, provider });
}

async function handleConnectIntent(formData: FormData) {
  const provider = formData.get("provider");

  if (typeof provider !== "string" || !provider) {
    return data({ errors: { provider: "Provider is required" } }, { status: 400 });
  }

  const providerEnum = getProviderEnum(provider);
  if (!providerEnum) {
    return data({ errors: { provider: "Invalid provider" } }, { status: 400 });
  }

  const configs = extractConfigsFromForm(formData, provider);
  const validationError = validateRequiredFields(provider, configs);
  if (validationError) {
    return data({ errors: validationError }, { status: 400 });
  }

  const organization = await getOrCreateOrganization();
  const dataSourceId = await upsertDataSource(organization.id, provider, providerEnum);
  await saveDataSourceConfigs(dataSourceId, configs);

  return data({ success: true, provider });
}

function getProviderEnum(provider: string): DataSourceProviderEnum | null {
  const providerMap: Record<string, DataSourceProviderEnum> = {
    github: "GITHUB",
    gitlab: "GITLAB",
    bitbucket: "BITBUCKET",
    jenkins: "JENKINS",
    circleci: "CIRCLECI",
    sonarqube: "SONARQUBE",
  };
  return providerMap[provider] || null;
}

function validateRequiredFields(provider: string, configs: Record<string, string>): Record<string, string> | null {
  const providerConfig = PROVIDER_CONFIGS[provider];
  for (const field of providerConfig.fields) {
    if (field.required && !configs[field.key]) {
      return { [field.key]: `${field.label} is required` };
    }
  }
  return null;
}

async function getOrCreateOrganization() {
  let organization = await db.organization.findFirst();
  if (!organization) {
    organization = await db.organization.create({
      data: {
        name: "default",
        displayName: "Default Organization",
      },
    });
  }
  return organization;
}

async function upsertDataSource(organizationId: string, provider: string, providerEnum: DataSourceProviderEnum): Promise<string> {
  const existingDataSource = await db.dataSource.findFirst({
    where: {
      organizationId,
      provider: providerEnum,
    },
  });

  if (existingDataSource) {
    await db.dataSource.update({
      where: { id: existingDataSource.id },
      data: { isEnabled: true },
    });
    return existingDataSource.id;
  }

  const newDataSource = await db.dataSource.create({
    data: {
      organizationId,
      name: `${provider} Integration`,
      provider: providerEnum,
      isEnabled: true,
    },
  });
  return newDataSource.id;
}

async function saveDataSourceConfigs(dataSourceId: string, configs: Record<string, string>) {
  for (const [key, value] of Object.entries(configs)) {
    const isSecret = key.toLowerCase().includes("token") || key.toLowerCase().includes("password");
    await db.dataSourceConfig.upsert({
      where: { dataSourceId_key: { dataSourceId, key } },
      create: { dataSourceId, key, value, isSecret },
      update: { value },
    });
  }
}

export function extractConfigsFromForm(formData: FormData, provider: string): Record<string, string> {
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

export async function testConnection(provider: string, configs: Record<string, string>): Promise<{ success: boolean; error?: string }> {
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

  return { success: false, error: "Test connection not implemented for this provider" };
}

export interface ProviderConfigField {
  key: string;
  label: string;
  type: "text" | "password";
  placeholder: string;
  required: boolean;
}

export interface ProviderConfig {
  fields: ProviderConfigField[];
}

type DataSourceProviderEnum = "GITHUB" | "GITLAB" | "BITBUCKET" | "JENKINS" | "CIRCLECI" | "SONARQUBE";

import { Gitlab } from "@gitbeaker/rest";
import { Octokit } from "@octokit/rest";
import type { ActionFunctionArgs } from "react-router";
import { data, redirect } from "react-router";
import { requireAdmin } from "~/auth/auth.server";
import { db } from "~/db.server";
import { fetchGithubRepositories, fetchGitlabRepositories, saveRepositories } from "~/lib/repositories/fetch-repositories";
import { getRepositoriesWithFilters } from "~/lib/repositories/repository-filters";
import { DEFAULT_ACTIVE_THRESHOLD_DAYS, REPOSITORY_PAGE_SIZE, toggleRepositoriesBatch, toggleRepository } from "~/lib/repositories/toggle-repositories";
import { PROVIDER_CONFIGS } from "./datasources.config";

export async function datasourcesAction({ request }: ActionFunctionArgs) {
  await requireAdmin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "test") {
    return handleTestIntent(formData);
  }

  if (intent === "connect") {
    return handleConnectIntent(formData);
  }

  if (intent === "fetch-repositories") {
    return handleFetchRepositoriesIntent(formData);
  }

  if (intent === "toggle-repository") {
    return handleToggleRepositoryIntent(formData);
  }

  if (intent === "toggle-repositories-batch") {
    return handleToggleRepositoriesBatchIntent(formData);
  }

  if (intent === "continue") {
    return redirect("/onboarding/importing");
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

async function handleFetchRepositoriesIntent(formData: FormData) {
  const provider = formData.get("provider") as string;
  const search = formData.get("search") as string | undefined;
  const cursor = formData.get("cursor") as string | undefined;

  const providerEnum = getProviderEnum(provider);
  if (!providerEnum) {
    return data({ error: "Invalid provider" }, { status: 400 });
  }

  const dataSource = await db.dataSource.findFirst({
    where: {
      provider: providerEnum,
      isEnabled: true,
    },
    include: {
      configs: true,
    },
  });

  if (!dataSource) {
    return data({ error: "Data source not found" }, { status: 404 });
  }

  const repositoryCount = await db.repository.count({
    where: { dataSourceId: dataSource.id },
  });

  if (repositoryCount === 0) {
    try {
      await initializeRepositories(dataSource, provider);
    } catch (error) {
      console.error("Failed to initialize repositories:", error);
      return data(
        {
          error: `Failed to fetch repositories: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
        { status: 500 }
      );
    }
  }

  const result = await getRepositoriesWithFilters(db, dataSource.id, {
    search,
    cursor,
    limit: REPOSITORY_PAGE_SIZE,
  });

  return data({
    repositories: result.repositories,
    totalCount: result.totalCount,
    nextCursor: result.nextCursor,
  });
}

async function handleToggleRepositoryIntent(formData: FormData) {
  const repositoryId = formData.get("repositoryId");
  const isEnabled = formData.get("isEnabled") === "true";

  if (typeof repositoryId !== "string" || !repositoryId) {
    return data({ error: "Repository ID is required" }, { status: 400 });
  }

  try {
    await toggleRepository(db, repositoryId, isEnabled);
    return data({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to toggle repository";
    return data({ error: message }, { status: 404 });
  }
}

async function handleToggleRepositoriesBatchIntent(formData: FormData) {
  const repositoryIds = formData.getAll("repositoryIds") as string[];
  const isEnabled = formData.get("isEnabled") === "true";

  const result = await toggleRepositoriesBatch(db, repositoryIds, isEnabled);

  return data({ success: true, count: result.count });
}

async function initializeRepositories(dataSource: { id: string; provider: string; configs: Array<{ key: string; value: string }> }, provider: string) {
  if (provider === "github") {
    const token = dataSource.configs.find((c) => c.key === "GITHUB_TOKEN")?.value;
    const org = dataSource.configs.find((c) => c.key === "GITHUB_ORG")?.value;

    if (!token || !org) {
      throw new Error("GitHub token or organization not configured");
    }

    const repositories = await fetchGithubRepositories({ token, organization: org });
    await saveRepositories(db, dataSource.id, repositories, "GITHUB");
    await setDefaultSelections(dataSource.id);
  } else if (provider === "gitlab") {
    const token = dataSource.configs.find((c) => c.key === "GITLAB_TOKEN")?.value;
    const host = dataSource.configs.find((c) => c.key === "GITLAB_HOST")?.value;

    if (!token) {
      throw new Error("GitLab token not configured");
    }

    const repositories = await fetchGitlabRepositories({ token, host });
    await saveRepositories(db, dataSource.id, repositories, "GITLAB");
    await setDefaultSelections(dataSource.id);
  }
}

async function setDefaultSelections(dataSourceId: string) {
  const now = new Date();
  const thresholdDate = new Date(now.getTime() - DEFAULT_ACTIVE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);

  await db.repository.updateMany({
    where: {
      dataSourceId,
      lastSyncAt: { gte: thresholdDate },
    },
    data: { isEnabled: true },
  });

  await db.repository.updateMany({
    where: {
      dataSourceId,
      OR: [{ lastSyncAt: { lt: thresholdDate } }, { lastSyncAt: null }],
    },
    data: { isEnabled: false },
  });
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
  let organization = await db.organization.findFirst({
    select: {
      id: true,
      name: true,
      displayName: true,
      onboardingCompletedAt: true,
    },
  });
  if (!organization) {
    organization = await db.organization.create({
      data: {
        name: "default",
        displayName: "Default Organization",
      },
      select: {
        id: true,
        name: true,
        displayName: true,
        onboardingCompletedAt: true,
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
    return testGitHubConnection(configs);
  }

  if (provider === "gitlab") {
    return testGitLabConnection(configs);
  }

  return { success: false, error: "Test connection not implemented for this provider" };
}

async function testGitHubConnection(configs: Record<string, string>): Promise<{ success: boolean; error?: string }> {
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

async function testGitLabConnection(configs: Record<string, string>): Promise<{ success: boolean; error?: string }> {
  const token = configs.GITLAB_TOKEN;
  if (!token) {
    return { success: false, error: "Token is required" };
  }
  try {
    const host = configs.GITLAB_HOST || "https://gitlab.com";
    const gitlab = new Gitlab({ token, host });
    await gitlab.Users.showCurrentUser();
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Connection failed";
    return { success: false, error: message };
  }
}

type DataSourceProviderEnum = "GITHUB" | "GITLAB" | "BITBUCKET" | "JENKINS" | "CIRCLECI" | "SONARQUBE";

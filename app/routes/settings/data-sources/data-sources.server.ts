import type { JiraProject } from "@crons/data-sources/jira/client.js";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { data } from "react-router";
import { requireAdmin } from "~/auth/auth.server";
import { db } from "~/db.server";
import { fetchGithubRepositories, fetchGitlabRepositories, saveRepositories } from "~/lib/repositories/fetch-repositories";
import { getRepositoriesWithFilters } from "~/lib/repositories/repository-filters";
import { DEFAULT_ACTIVE_THRESHOLD_DAYS, REPOSITORY_PAGE_SIZE, toggleRepositoriesBatch, toggleRepository } from "~/lib/repositories/toggle-repositories";
import { PROVIDER_CONFIGS } from "~/routes/onboarding/datasources/datasources.config";
import { extractConfigsFromForm, testConnection } from "~/routes/onboarding/datasources/datasources.server";

export async function loader({ request }: LoaderFunctionArgs) {
  await requireAdmin(request);

  const dataSources = await db.dataSource.findMany({
    include: {
      configs: {
        select: {
          key: true,
          value: true,
          isSecret: true,
        },
      },
      _count: {
        select: {
          runs: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return data({ dataSources });
}

export async function action({ request }: ActionFunctionArgs) {
  await requireAdmin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "test") {
    return handleTestIntent(formData);
  }

  if (intent === "connect") {
    return handleConnectIntent(formData);
  }

  if (intent === "delete") {
    return handleDeleteIntent(formData);
  }

  if (intent === "toggle-enabled") {
    return handleToggleEnabledIntent(formData);
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

  if (intent === "fetch-projects") {
    return handleFetchProjectsIntent(formData);
  }

  if (intent === "toggle-project") {
    return handleToggleProjectIntent(formData);
  }

  if (intent === "toggle-projects-batch") {
    return handleToggleProjectsBatchIntent(formData);
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

async function handleDeleteIntent(formData: FormData) {
  const dataSourceId = formData.get("dataSourceId");

  if (typeof dataSourceId !== "string" || !dataSourceId) {
    return data({ error: "Data source ID is required" }, { status: 400 });
  }

  try {
    await db.dataSource.delete({
      where: { id: dataSourceId },
    });
    return data({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete data source";
    return data({ error: message }, { status: 500 });
  }
}

async function handleToggleEnabledIntent(formData: FormData) {
  const dataSourceId = formData.get("dataSourceId");
  const isEnabled = formData.get("isEnabled") === "true";

  if (typeof dataSourceId !== "string" || !dataSourceId) {
    return data({ error: "Data source ID is required" }, { status: 400 });
  }

  try {
    await db.dataSource.update({
      where: { id: dataSourceId },
      data: { isEnabled },
    });
    return data({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to toggle data source";
    return data({ error: message }, { status: 500 });
  }
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

async function handleFetchProjectsIntent(formData: FormData) {
  const provider = formData.get("provider") as string;

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

  const projectCount = await db.project.count({
    where: { dataSourceId: dataSource.id },
  });

  if (projectCount === 0) {
    try {
      await initializeProjects(dataSource, provider);
    } catch (error) {
      console.error("Failed to initialize projects:", error);
      return data(
        {
          error: `Failed to fetch projects: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
        { status: 500 }
      );
    }
  }

  const projects = await db.project.findMany({
    where: { dataSourceId: dataSource.id },
    select: {
      id: true,
      name: true,
      key: true,
      isEnabled: true,
    },
    orderBy: { name: "asc" },
  });

  return data({ projects });
}

async function handleToggleProjectIntent(formData: FormData) {
  const projectId = formData.get("projectId");
  const isEnabled = formData.get("isEnabled") === "true";

  if (typeof projectId !== "string" || !projectId) {
    return data({ error: "Project ID is required" }, { status: 400 });
  }

  try {
    await db.project.update({
      where: { id: projectId },
      data: { isEnabled },
    });
    return data({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Record to update not found")) {
      return data({ error: "Project not found" }, { status: 404 });
    }
    const message = error instanceof Error ? error.message : "Failed to toggle project";
    return data({ error: message }, { status: 500 });
  }
}

async function handleToggleProjectsBatchIntent(formData: FormData) {
  const projectIds = formData.getAll("projectIds") as string[];
  const isEnabled = formData.get("isEnabled") === "true";

  const result = await db.project.updateMany({
    where: { id: { in: projectIds } },
    data: { isEnabled },
  });

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

async function initializeProjects(dataSource: { id: string; provider: string; configs: Array<{ key: string; value: string }> }, provider: string) {
  if (provider === "jira") {
    const configMap: Record<string, string> = {};
    for (const config of dataSource.configs) {
      configMap[config.key] = config.value;
    }

    const projects = await fetchJiraProjects(configMap);
    await saveJiraProjects(dataSource.id, projects);
  }
}

async function fetchJiraProjects(configs: Record<string, string>): Promise<JiraProject[]> {
  const variant = configs.JIRA_VARIANT;
  const isCloud = variant === "cloud";

  let baseUrl: string;
  let headers: Record<string, string>;

  if (isCloud) {
    baseUrl = `https://${configs.JIRA_DOMAIN}.atlassian.net`;
    const credentials = Buffer.from(`${configs.JIRA_EMAIL}:${configs.JIRA_API_TOKEN}`).toString("base64");
    headers = {
      Authorization: `Basic ${credentials}`,
      Accept: "application/json",
    };
  } else {
    baseUrl = configs.JIRA_SERVER_URL.replace(/\/$/, "");
    headers = {
      Authorization: `Bearer ${configs.JIRA_PAT}`,
      Accept: "application/json",
    };
  }

  const apiVersion = isCloud ? "3" : "2";
  const response = await fetch(`${baseUrl}/rest/api/${apiVersion}/project`, { headers });

  if (!response.ok) {
    throw new Error(`Failed to fetch Jira projects: ${response.status}`);
  }

  return response.json();
}

async function saveJiraProjects(dataSourceId: string, projects: JiraProject[]) {
  for (const project of projects) {
    await db.project.upsert({
      where: {
        dataSourceId_externalId: {
          dataSourceId,
          externalId: project.id,
        },
      },
      create: {
        dataSourceId,
        externalId: project.id,
        key: project.key,
        name: project.name,
        provider: "JIRA",
        isEnabled: true,
      },
      update: {
        key: project.key,
        name: project.name,
      },
    });
  }
}

function getProviderEnum(provider: string): DataSourceProviderEnum | null {
  const providerMap: Record<string, DataSourceProviderEnum> = {
    github: "GITHUB",
    gitlab: "GITLAB",
    bitbucket: "BITBUCKET",
    jenkins: "JENKINS",
    circleci: "CIRCLECI",
    sonarqube: "SONARQUBE",
    jira: "JIRA",
  };
  return providerMap[provider] || null;
}

function validateRequiredFields(provider: string, configs: Record<string, string>): Record<string, string> | null {
  const providerConfig = PROVIDER_CONFIGS[provider];
  for (const field of providerConfig.fields) {
    if (field.showWhen) {
      const conditionMet = Object.entries(field.showWhen).every(([key, value]) => configs[key] === value);
      if (!conditionMet) {
        continue;
      }
    }
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

type DataSourceProviderEnum = "GITHUB" | "GITLAB" | "BITBUCKET" | "JENKINS" | "CIRCLECI" | "SONARQUBE" | "JIRA";
